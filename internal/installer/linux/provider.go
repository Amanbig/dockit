package linux

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"dockit/internal/installer/types"
)

var _ types.Provider = (*Provider)(nil)

// Provider implements installer detection and installation plans for Linux systems.
type Provider struct{}

// NewProvider creates a new Linux installer Provider.
func NewProvider() *Provider {
	return &Provider{}
}

func (p *Provider) OS() string {
	return "linux"
}

// Detect inspects Linux system packages, binaries, sockets, and service permissions.
func (p *Provider) Detect(ctx context.Context) (*types.DetectionResult, error) {
	distro := detectDistro()
	pkgMgr := detectPackageManager()

	dockerStatus := detectDocker(ctx)
	podmanStatus := detectPodman(ctx)

	recommended := "none"
	if !dockerStatus.Installed && !podmanStatus.Installed {
		// On modern Linux distros, Docker or Podman can both be recommended
		if pkgMgr == "dnf" {
			recommended = "podman" // Native on Fedora/RHEL
		} else {
			recommended = "docker" // Standard on Debian/Ubuntu/Mint
		}
	} else if dockerStatus.Installed && !dockerStatus.Running {
		recommended = "docker"
	} else if podmanStatus.Installed && !podmanStatus.Running {
		recommended = "podman"
	}

	details := []string{
		fmt.Sprintf("Linux Distribution: %s", distro),
		fmt.Sprintf("Package Manager: %s", pkgMgr),
	}

	return &types.DetectionResult{
		OS:               "linux",
		Docker:           dockerStatus,
		Podman:           podmanStatus,
		Recommended:      recommended,
		PrerequisitesMet: true,
		Details:          details,
	}, nil
}

// GetInstallPlan constructs a safe, transparent step-by-step installation plan for Linux.
func (p *Provider) GetInstallPlan(targetRuntime string) (*types.InstallPlan, error) {
	pkgMgr := detectPackageManager()
	currentUser := os.Getenv("USER")
	if currentUser == "" {
		currentUser = "$USER"
	}

	switch strings.ToLower(targetRuntime) {
	case "docker":
		return getDockerPlan(pkgMgr, currentUser)
	case "podman":
		return getPodmanPlan(pkgMgr)
	default:
		return nil, fmt.Errorf("unsupported runtime %q for Linux", targetRuntime)
	}
}

// Install runs the installation plan step by step, reporting progress.
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
		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			errOutput := strings.TrimSpace(stderr.String())
			return fmt.Errorf("step %q failed: %w (output: %s)", step.Title, err, errOutput)
		}
	}

	return nil
}

func detectDocker(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "docker"}

	binPath, err := exec.LookPath("docker")
	if err != nil {
		status.Installed = false
		status.Running = false
		status.Message = "Docker binary not found in PATH"
		return status
	}

	status.Installed = true

	// Check version
	out, err := exec.CommandContext(ctx, binPath, "--version").Output()
	if err == nil {
		status.Version = strings.TrimSpace(string(out))
	}

	// Check if daemon is responding
	testCmd := exec.CommandContext(ctx, binPath, "info")
	var errBuf bytes.Buffer
	testCmd.Stderr = &errBuf
	if err := testCmd.Run(); err == nil {
		status.Running = true
		status.Message = "Docker daemon is active and responsive"
		return status
	}

	errMsg := errBuf.String()
	if strings.Contains(errMsg, "permission denied") || strings.Contains(errMsg, "Got permission denied") {
		status.Running = true
		status.NeedsAuth = true
		status.Message = "Docker daemon is running, but user lacks permissions (add user to docker group)"
		return status
	}

	// Check if socket exists but is inactive
	if _, err := os.Stat("/var/run/docker.sock"); err == nil {
		status.Running = false
		status.Message = "Docker socket exists but daemon is stopped (start with: sudo systemctl start docker)"
		return status
	}

	status.Running = false
	status.Message = "Docker is installed but daemon is not running"
	return status
}

func detectPodman(ctx context.Context) types.RuntimeStatus {
	status := types.RuntimeStatus{Name: "podman"}

	binPath, err := exec.LookPath("podman")
	if err != nil {
		status.Installed = false
		status.Running = false
		status.Message = "Podman binary not found in PATH"
		return status
	}

	status.Installed = true

	out, err := exec.CommandContext(ctx, binPath, "--version").Output()
	if err == nil {
		status.Version = strings.TrimSpace(string(out))
	}

	// Check rootless socket: /run/user/<uid>/podman/podman.sock
	uid := strconv.Itoa(os.Getuid())
	sockPath := filepath.Join("/run/user", uid, "podman", "podman.sock")
	if _, err := os.Stat(sockPath); err == nil {
		status.Running = true
		status.Message = "Podman user socket is active"
		return status
	}

	// Check system rootful socket
	if _, err := os.Stat("/run/podman/podman.sock"); err == nil {
		status.Running = true
		status.Message = "Podman system socket is active"
		return status
	}

	status.Running = false
	status.Message = "Podman is installed; socket inactive (enable with: systemctl --user enable --now podman.socket)"
	return status
}

func detectPackageManager() string {
	for _, mgr := range []string{"apt", "dnf", "pacman", "zypper", "apk"} {
		if _, err := exec.LookPath(mgr); err == nil {
			return mgr
		}
	}
	return "unknown"
}

func detectDistro() string {
	file, err := os.Open("/etc/os-release")
	if err != nil {
		return "Linux"
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "PRETTY_NAME=") {
			return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
		}
	}
	return "Linux"
}

func getDockerPlan(pkgMgr, user string) (*types.InstallPlan, error) {
	plan := &types.InstallPlan{
		Runtime:        "docker",
		OS:             "linux",
		PackageManager: pkgMgr,
		Warning:        "Installation requires root/sudo privileges to install system packages and configure the systemd daemon.",
	}

	switch pkgMgr {
	case "apt":
		plan.Steps = []types.InstallStep{
			{
				ID:          "update_repos",
				Title:       "Update package repository lists",
				Description: "Refreshes system package lists to get the latest versions.",
				Command:     "sudo apt-get update",
				Privileged:  true,
			},
			{
				ID:          "install_docker",
				Title:       "Install Docker Engine and Compose plugin",
				Description: "Installs docker.io and docker-compose-v2 packages.",
				Command:     "sudo apt-get install -y docker.io docker-compose-plugin",
				Privileged:  true,
			},
			{
				ID:          "start_service",
				Title:       "Enable and start Docker daemon",
				Description: "Configures systemd to start Docker immediately and on system boot.",
				Command:     "sudo systemctl enable --now docker",
				Privileged:  true,
			},
			{
				ID:          "configure_group",
				Title:       "Grant non-root user permissions",
				Description: fmt.Sprintf("Adds %s to the 'docker' user group so sudo is not required for daily use.", user),
				Command:     fmt.Sprintf("sudo usermod -aG docker %s", user),
				Privileged:  true,
			},
		}

	case "dnf":
		plan.Steps = []types.InstallStep{
			{
				ID:          "install_docker",
				Title:       "Install Docker Engine",
				Description: "Installs moby-engine or docker package via DNF.",
				Command:     "sudo dnf install -y moby-engine docker-compose",
				Privileged:  true,
			},
			{
				ID:          "start_service",
				Title:       "Enable and start Docker daemon",
				Description: "Configures systemd to start Docker service.",
				Command:     "sudo systemctl enable --now docker",
				Privileged:  true,
			},
			{
				ID:          "configure_group",
				Title:       "Grant non-root user permissions",
				Description: fmt.Sprintf("Adds %s to docker group.", user),
				Command:     fmt.Sprintf("sudo usermod -aG docker %s", user),
				Privileged:  true,
			},
		}

	case "pacman":
		plan.Steps = []types.InstallStep{
			{
				ID:          "install_docker",
				Title:       "Install Docker via Pacman",
				Description: "Installs docker and docker-compose packages.",
				Command:     "sudo pacman -S --noconfirm docker docker-compose",
				Privileged:  true,
			},
			{
				ID:          "start_service",
				Title:       "Enable and start Docker daemon",
				Description: "Starts Docker systemd service.",
				Command:     "sudo systemctl enable --now docker",
				Privileged:  true,
			},
			{
				ID:          "configure_group",
				Title:       "Grant non-root user permissions",
				Description: fmt.Sprintf("Adds %s to docker group.", user),
				Command:     fmt.Sprintf("sudo usermod -aG docker %s", user),
				Privileged:  true,
			},
		}

	default:
		// Fallback to official convenience script
		plan.Steps = []types.InstallStep{
			{
				ID:          "install_script",
				Title:       "Install Docker via official script",
				Description: "Runs the official get.docker.com installation script.",
				Command:     "curl -fsSL https://get.docker.com | sudo sh",
				Privileged:  true,
			},
			{
				ID:          "start_service",
				Title:       "Enable and start Docker daemon",
				Description: "Starts Docker systemd service.",
				Command:     "sudo systemctl enable --now docker",
				Privileged:  true,
			},
			{
				ID:          "configure_group",
				Title:       "Grant user permissions",
				Description: fmt.Sprintf("Adds %s to docker group.", user),
				Command:     fmt.Sprintf("sudo usermod -aG docker %s", user),
				Privileged:  true,
			},
		}
	}

	return plan, nil
}

func getPodmanPlan(pkgMgr string) (*types.InstallPlan, error) {
	plan := &types.InstallPlan{
		Runtime:        "podman",
		OS:             "linux",
		PackageManager: pkgMgr,
		Warning:        "Rootless Podman can run without root privileges after packages are installed.",
	}

	var installCmd string
	switch pkgMgr {
	case "apt":
		installCmd = "sudo apt-get update && sudo apt-get install -y podman podman-compose"
	case "dnf":
		installCmd = "sudo dnf install -y podman podman-compose"
	case "pacman":
		installCmd = "sudo pacman -S --noconfirm podman podman-compose"
	default:
		installCmd = "sudo apt-get install -y podman || sudo dnf install -y podman"
	}

	plan.Steps = []types.InstallStep{
		{
			ID:          "install_podman",
			Title:       "Install Podman packages",
			Description: "Installs Podman container engine and compose tooling.",
			Command:     installCmd,
			Privileged:  true,
		},
		{
			ID:          "enable_user_socket",
			Title:       "Enable Podman rootless socket",
			Description: "Starts the Docker-compatible user socket so Dockit can communicate with Podman without root.",
			Command:     "systemctl --user enable --now podman.socket",
			Privileged:  false,
		},
	}

	return plan, nil
}
