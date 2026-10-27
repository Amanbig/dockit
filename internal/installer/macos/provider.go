package macos

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"dockit/internal/installer/types"
)

var _ types.Provider = (*Provider)(nil)

// Provider implements installer detection and installation plans for macOS.
type Provider struct{}

// NewProvider creates a new macOS installer Provider.
func NewProvider() *Provider {
	return &Provider{}
}

func (p *Provider) OS() string {
	return "darwin"
}

// Detect checks macOS for Docker Desktop and Podman.
func (p *Provider) Detect(ctx context.Context) (*types.DetectionResult, error) {
	dockerStatus := detectDocker(ctx)
	podmanStatus := detectPodman(ctx)

	hasBrew := false
	if _, err := exec.LookPath("brew"); err == nil {
		hasBrew = true
	}

	details := []string{
		"Platform: macOS",
	}
	if hasBrew {
		details = append(details, "Package Manager: Homebrew")
	} else {
		details = append(details, "Package Manager: None (Homebrew recommended)")
	}

	recommended := "none"
	if !dockerStatus.Installed && !podmanStatus.Installed {
		recommended = "docker"
	}

	return &types.DetectionResult{
		OS:               "darwin",
		Docker:           dockerStatus,
		Podman:           podmanStatus,
		Recommended:      recommended,
		PrerequisitesMet: true,
		Details:          details,
	}, nil
}

// GetInstallPlan generates installation plans for macOS using Homebrew.
func (p *Provider) GetInstallPlan(targetRuntime string) (*types.InstallPlan, error) {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		return &types.InstallPlan{
			Runtime:        "docker",
			OS:             "darwin",
			PackageManager: "brew",
			Warning:        "Docker Desktop for macOS will open and prompt for system privileges on first launch.",
			Steps: []types.InstallStep{
				{
					ID:          "install_docker_cask",
					Title:       "Install Docker Desktop via Homebrew",
					Description: "Downloads and installs Docker Desktop application.",
					Command:     "brew install --cask docker",
					Privileged:  false,
				},
				{
					ID:          "launch_docker",
					Title:       "Launch Docker Desktop",
					Description: "Opens Docker Desktop to complete initial system extension authorization.",
					Command:     "open -a Docker",
					Privileged:  false,
				},
			},
		}, nil

	case "podman":
		return &types.InstallPlan{
			Runtime:        "podman",
			OS:             "darwin",
			PackageManager: "brew",
			Warning:        "Podman on macOS runs inside a lightweight virtual machine (Podman Machine).",
			Steps: []types.InstallStep{
				{
					ID:          "install_podman",
					Title:       "Install Podman via Homebrew",
					Description: "Installs Podman CLI and machine helper utilities.",
					Command:     "brew install podman",
					Privileged:  false,
				},
				{
					ID:          "init_machine",
					Title:       "Initialize Podman virtual machine",
					Description: "Configures a lightweight Linux VM to host Podman containers.",
					Command:     "podman machine init",
					Privileged:  false,
				},
				{
					ID:          "start_machine",
					Title:       "Start Podman machine",
					Description: "Boots the VM and establishes the Docker-compatible socket.",
					Command:     "podman machine start",
					Privileged:  false,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported runtime %q for macOS", targetRuntime)
	}
}

// Install runs the installation commands.
func (p *Provider) Install(ctx context.Context, targetRuntime string, progressCb func(step int, total int, message string)) error {
	plan, err := p.GetInstallPlan(targetRuntime)
	if err != nil {
		return err
	}

	total := len(plan.Steps)
	for i, step := range plan.Steps {
		if progressCb != nil {
			progressCb(i+1, total, fmt.Sprintf("Step %d/%d: %s", i+1, total, step.Title))
		}

		cmd := exec.CommandContext(ctx, "sh", "-c", step.Command)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("step %q failed: %w", step.Title, err)
		}
	}

	return nil
}

// GetStartPlan constructs a service startup plan for macOS.
func (p *Provider) GetStartPlan(targetRuntime string) (*types.InstallPlan, error) {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		return &types.InstallPlan{
			Runtime:        "docker",
			OS:             "darwin",
			PackageManager: "launchservices",
			IsStartOnly:    true,
			Steps: []types.InstallStep{
				{
					ID:          "launch_docker_app",
					Title:       "Launch Docker Desktop Application",
					Description: "Opens Docker Desktop to start daemon and background hypervisor.",
					Command:     "open -a Docker",
					Privileged:  false,
				},
			},
		}, nil

	case "podman":
		return &types.InstallPlan{
			Runtime:        "podman",
			OS:             "darwin",
			PackageManager: "podman",
			IsStartOnly:    true,
			Steps: []types.InstallStep{
				{
					ID:          "start_podman_machine",
					Title:       "Start Podman Virtual Machine",
					Description: "Boots the local Podman VM to provide container socket services.",
					Command:     "podman machine start",
					Privileged:  false,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported runtime %q for macOS", targetRuntime)
	}
}

// StartEngine launches Docker Desktop or starts Podman machine on macOS.
func (p *Provider) StartEngine(ctx context.Context, targetRuntime string) error {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		cmd := exec.CommandContext(ctx, "open", "-a", "Docker")
		return cmd.Run()
	case "podman":
		cmd := exec.CommandContext(ctx, "podman", "machine", "start")
		return cmd.Run()
	default:
		return fmt.Errorf("unsupported runtime %q for macOS", targetRuntime)
	}
}

func detectDocker(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "docker"}

	appExists := false
	if _, err := os.Stat("/Applications/Docker.app"); err == nil {
		appExists = true
	}

	binPath, err := exec.LookPath("docker")
	if err != nil && !appExists {
		status.Installed = false
		status.Running = false
		status.Message = "Docker Desktop is not installed"
		return status
	}

	status.Installed = true
	if binPath != "" {
		if out, err := exec.CommandContext(ctx, binPath, "--version").Output(); err == nil {
			status.Version = strings.TrimSpace(string(out))
		}

		if err := exec.CommandContext(ctx, binPath, "info").Run(); err == nil {
			status.Running = true
			status.Message = "Docker Desktop is running"
			return status
		}
	}

	status.Running = false
	status.Message = "Docker is installed but not running (launch /Applications/Docker.app)"
	return status
}

func detectPodman(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "podman"}

	binPath, err := exec.LookPath("podman")
	if err != nil {
		status.Installed = false
		status.Running = false
		status.Message = "Podman is not installed"
		return status
	}

	status.Installed = true
	if out, err := exec.CommandContext(ctx, binPath, "--version").Output(); err == nil {
		status.Version = strings.TrimSpace(string(out))
	}

	if err := exec.CommandContext(ctx, binPath, "info").Run(); err == nil {
		status.Running = true
		status.Message = "Podman machine is active"
		return status
	}

	status.Running = false
	status.Message = "Podman is installed but machine is stopped (run: podman machine start)"
	return status
}
