package compose

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
)

// Runner manages executing Docker or Podman Compose commands.
type Runner struct {
	binary   string
	baseArgs []string
}

// NewRunner detects and configures the appropriate compose binary based on runtime preference.
func NewRunner(runtimeType string) *Runner {
	if runtimeType == "podman" {
		if _, err := exec.LookPath("podman"); err == nil {
			return &Runner{binary: "podman", baseArgs: []string{"compose"}}
		}
		if _, err := exec.LookPath("podman-compose"); err == nil {
			return &Runner{binary: "podman-compose", baseArgs: []string{}}
		}
	}

	// Default to docker compose
	if _, err := exec.LookPath("docker"); err == nil {
		return &Runner{binary: "docker", baseArgs: []string{"compose"}}
	}
	if _, err := exec.LookPath("docker-compose"); err == nil {
		return &Runner{binary: "docker-compose", baseArgs: []string{}}
	}

	return &Runner{binary: "docker", baseArgs: []string{"compose"}}
}

// Run executes a compose command with the specified arguments in workingDir.
func (r *Runner) Run(ctx context.Context, workingDir string, composeFile string, extraArgs ...string) (string, error) {
	args := append([]string{}, r.baseArgs...)
	if composeFile != "" {
		args = append(args, "-f", composeFile)
	}
	args = append(args, extraArgs...)

	cmd := exec.CommandContext(ctx, r.binary, args...)
	if workingDir != "" {
		cmd.Dir = workingDir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	output := stdout.String()
	if stderr.Len() > 0 {
		if output != "" {
			output += "\n"
		}
		output += stderr.String()
	}

	if err != nil {
		return output, fmt.Errorf("compose command failed (%s %s): %w\nOutput: %s",
			r.binary, strings.Join(args, " "), err, output)
	}

	return output, nil
}

// Up starts the compose project or selected services.
func (r *Runner) Up(ctx context.Context, workingDir string, composeFile string, opts UpOptions) (string, error) {
	args := []string{"up"}
	if opts.Detach {
		args = append(args, "-d")
	}
	if opts.Build {
		args = append(args, "--build")
	}
	if opts.RemoveOrphans {
		args = append(args, "--remove-orphans")
	}
	if len(opts.Services) > 0 {
		args = append(args, opts.Services...)
	}

	return r.Run(ctx, workingDir, composeFile, args...)
}

// Down stops and tears down the compose project.
func (r *Runner) Down(ctx context.Context, workingDir string, composeFile string, opts DownOptions) (string, error) {
	args := []string{"down"}
	if opts.RemoveVolumes {
		args = append(args, "--volumes")
	}
	if opts.RemoveImages {
		args = append(args, "--rmi", "all")
	}
	if opts.RemoveOrphans {
		args = append(args, "--remove-orphans")
	}

	return r.Run(ctx, workingDir, composeFile, args...)
}

// Start starts existing stopped containers for the project.
func (r *Runner) Start(ctx context.Context, workingDir string, composeFile string, services ...string) (string, error) {
	args := append([]string{"start"}, services...)
	return r.Run(ctx, workingDir, composeFile, args...)
}

// Stop stops running containers for the project.
func (r *Runner) Stop(ctx context.Context, workingDir string, composeFile string, services ...string) (string, error) {
	args := append([]string{"stop"}, services...)
	return r.Run(ctx, workingDir, composeFile, args...)
}

// Restart restarts containers for the project.
func (r *Runner) Restart(ctx context.Context, workingDir string, composeFile string, services ...string) (string, error) {
	args := append([]string{"restart"}, services...)
	return r.Run(ctx, workingDir, composeFile, args...)
}

type psJSONOutput struct {
	ID      string      `json:"ID"`
	Name    string      `json:"Name"`
	Service string      `json:"Service"`
	State   string      `json:"State"`
	Status  string      `json:"Status"`
	Ports   interface{} `json:"Ports"`
}

// PS retrieves the status of all containers belonging to the project.
func (r *Runner) PS(ctx context.Context, workingDir string, composeFile string) ([]ContainerStatus, error) {
	output, err := r.Run(ctx, workingDir, composeFile, "ps", "--all", "--format", "json")
	if err != nil {
		return nil, err
	}

	output = strings.TrimSpace(output)
	if output == "" || output == "[]" {
		return nil, nil
	}

	var results []ContainerStatus

	// Format can be a JSON array or newline-delimited JSON objects
	if strings.HasPrefix(output, "[") {
		var list []psJSONOutput
		if err := json.Unmarshal([]byte(output), &list); err == nil {
			for _, item := range list {
				results = append(results, ContainerStatus{
					ID:      item.ID,
					Name:    item.Name,
					Service: item.Service,
					State:   item.State,
					Status:  item.Status,
					Ports:   fmt.Sprintf("%v", item.Ports),
				})
			}
			return results, nil
		}
	}

	// Try newline-delimited JSON
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		var item psJSONOutput
		if err := json.Unmarshal([]byte(line), &item); err == nil {
			results = append(results, ContainerStatus{
				ID:      item.ID,
				Name:    item.Name,
				Service: item.Service,
				State:   item.State,
				Status:  item.Status,
				Ports:   fmt.Sprintf("%v", item.Ports),
			})
		}
	}

	return results, nil
}

// Logs returns logs for the compose project or a specific service.
func (r *Runner) Logs(ctx context.Context, workingDir string, composeFile string, service string, tail string) (string, error) {
	args := []string{"logs", "--no-color"}
	if tail != "" {
		args = append(args, "--tail", tail)
	}
	if service != "" {
		args = append(args, service)
	}
	return r.Run(ctx, workingDir, composeFile, args...)
}
