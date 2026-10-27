package windows

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"dockit/internal/installer/types"
)

var _ types.Provider = (*Provider)(nil)

// Provider implements installer detection and installation plans for Windows.
type Provider struct{}

// NewProvider creates a new Windows installer Provider.
func NewProvider() *Provider {
	return &Provider{}
}

func (p *Provider) OS() string {
	return "windows"
}

// Detect checks Windows for WSL2, Docker Desktop, and Podman.
func (p *Provider) Detect(ctx context.Context) (*types.DetectionResult, error) {
	dockerStatus := detectDocker(ctx)
	podmanStatus := detectPodman(ctx)

	hasWinget := false
	if _, err := exec.LookPath("winget"); err == nil {
		hasWinget = true
	}

	details := []string{
		"Platform: Windows",
	}
	if hasWinget {
		details = append(details, "Package Manager: Windows Package Manager (winget)")
	} else {
		details = append(details, "Package Manager: None detected (manual download available)")
	}

	recommended := "none"
	if !dockerStatus.Installed && !podmanStatus.Installed {
		recommended = "docker"
	}

	return &types.DetectionResult{
		OS:               "windows",
		Docker:           dockerStatus,
		Podman:           podmanStatus,
		Recommended:      recommended,
		PrerequisitesMet: true,
		Details:          details,
	}, nil
}

// GetInstallPlan generates installation plans for Windows using winget.
func (p *Provider) GetInstallPlan(targetRuntime string) (*types.InstallPlan, error) {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		return &types.InstallPlan{
			Runtime:        "docker",
			OS:             "windows",
			PackageManager: "winget",
			Warning:        "Docker Desktop on Windows requires WSL2 backend and will request administrator UAC prompt.",
			Steps: []types.InstallStep{
				{
					ID:          "install_docker_winget",
					Title:       "Install Docker Desktop via winget",
					Description: "Downloads and executes the official Docker Desktop installer.",
					Command:     "winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements",
					Privileged:  true,
				},
				{
					ID:          "start_docker",
					Title:       "Launch Docker Desktop",
					Description: "Starts Docker Desktop to initialize the WSL2 engine.",
					Command:     "powershell -Command \"Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'\"",
					Privileged:  false,
				},
			},
		}, nil

	case "podman":
		return &types.InstallPlan{
			Runtime:        "podman",
			OS:             "windows",
			PackageManager: "winget",
			Warning:        "Podman on Windows runs through a lightweight WSL2 machine.",
			Steps: []types.InstallStep{
				{
					ID:          "install_podman_winget",
					Title:       "Install Podman via winget",
					Description: "Downloads and installs Podman CLI for Windows.",
					Command:     "winget install -e --id RedHat.Podman --accept-package-agreements --accept-source-agreements",
					Privileged:  true,
				},
				{
					ID:          "init_machine",
					Title:       "Initialize Podman machine",
					Description: "Initializes the WSL2 Podman virtual machine.",
					Command:     "podman machine init",
					Privileged:  false,
				},
				{
					ID:          "start_machine",
					Title:       "Start Podman machine",
					Description: "Boots the Podman engine and exposes the local named pipe.",
					Command:     "podman machine start",
					Privileged:  false,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported runtime %q for Windows", targetRuntime)
	}
}

// Install executes the Windows installation commands.
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

		cmd := exec.CommandContext(ctx, "powershell", "-Command", step.Command)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("step %q failed: %w", step.Title, err)
		}
	}

	return nil
}

// GetStartPlan constructs a service startup plan for Windows.
func (p *Provider) GetStartPlan(targetRuntime string) (*types.InstallPlan, error) {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		return &types.InstallPlan{
			Runtime:        "docker",
			OS:             "windows",
			PackageManager: "service",
			IsStartOnly:    true,
			Steps: []types.InstallStep{
				{
					ID:          "launch_docker_desktop",
					Title:       "Launch Docker Desktop Executable",
					Description: "Starts Docker Desktop background service and WSL2 subsystem.",
					Command:     `powershell -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"`,
					Privileged:  false,
				},
			},
		}, nil

	case "podman":
		return &types.InstallPlan{
			Runtime:        "podman",
			OS:             "windows",
			PackageManager: "wsl2",
			IsStartOnly:    true,
			Steps: []types.InstallStep{
				{
					ID:          "start_podman_machine",
					Title:       "Start Podman Machine WSL2",
					Description: "Launches the Podman WSL2 machine backend.",
					Command:     "podman machine start",
					Privileged:  false,
				},
			},
		}, nil

	default:
		return nil, fmt.Errorf("unsupported runtime %q for Windows", targetRuntime)
	}
}

// StartEngine launches Docker Desktop or starts Podman machine on Windows.
func (p *Provider) StartEngine(ctx context.Context, targetRuntime string) error {
	switch strings.ToLower(targetRuntime) {
	case "docker":
		cmd := exec.CommandContext(ctx, "powershell", "-Command", "Start-Process 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe'")
		return cmd.Run()
	case "podman":
		cmd := exec.CommandContext(ctx, "podman", "machine", "start")
		return cmd.Run()
	default:
		return fmt.Errorf("unsupported runtime %q for Windows", targetRuntime)
	}
}

func detectDocker(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "docker"}

	appExists := false
	if _, err := os.Stat(`C:\Program Files\Docker\Docker\Docker Desktop.exe`); err == nil {
		appExists = true
	}

	binPath, err := exec.LookPath("docker")
	if err != nil && !appExists {
		status.Installed = false
		status.Running = false
		status.Message = "Docker Desktop is not installed on Windows"
		return status
	}

	status.Installed = true
	if binPath != "" {
		if out, err := exec.CommandContext(ctx, binPath, "--version").Output(); err == nil {
			status.Version = strings.TrimSpace(string(out))
		}

		if err := exec.CommandContext(ctx, binPath, "info").Run(); err == nil {
			status.Running = true
			status.Message = "Docker Desktop is active"
			return status
		}
	}

	status.Running = false
	status.Message = "Docker is installed but daemon is not running (start Docker Desktop)"
	return status
}

func detectPodman(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "podman"}

	binPath, err := exec.LookPath("podman")
	if err != nil {
		status.Installed = false
		status.Running = false
		status.Message = "Podman is not installed on Windows"
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
	status.Message = "Podman machine is not running (run: podman machine start)"
	return status
}
