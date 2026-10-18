package main

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
	"sync"
	"time"

	"dockit/internal/compose"
	"dockit/internal/config"
	"dockit/internal/containers"
	"dockit/internal/host"
	"dockit/internal/images"
	"dockit/internal/installer"
	"dockit/internal/networks"
	"dockit/internal/registry"
	"dockit/internal/registry/dockerhub"
	"dockit/internal/registry/ghcr"
	"dockit/internal/runtime"
	dockerclient "dockit/internal/runtime/docker"
	podmanclient "dockit/internal/runtime/podman"
	"dockit/internal/terminal"
	"dockit/internal/updater"
	"dockit/internal/version"
	"dockit/internal/volumes"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App manages backend state and exposes bound RPC methods to the Wails frontend.
type App struct {
	ctx         context.Context
	mu          sync.RWMutex
	configMgr   *config.Manager
	currentRT   runtime.Runtime
	runtimeType string // "docker", "podman", or "none"

	containerSvc *containers.Service
	imageSvc     *images.Service
	volumeSvc    *volumes.Service
	networkSvc   *networks.Service
	composeMgr   *compose.Manager
	registrySvc  *registry.Service
	terminalSvc  *terminal.Service
}

// NewApp creates a new App application struct.
func NewApp() *App {
	return &App{
		runtimeType: "none",
	}
}

// startup is called by Wails when the application initializes.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Load configuration
	mgr, err := config.NewDefaultManager()
	if err == nil {
		a.configMgr = mgr
	}

	// Setup registry service
	regSvc := registry.NewService()
	regSvc.Register(dockerhub.NewClient())
	regSvc.Register(ghcr.NewClient())
	a.registrySvc = regSvc

	// Setup host terminal service
	a.terminalSvc = terminal.NewService()

	// Connect to preferred runtime
	preferredRT := "auto"
	if a.configMgr != nil {
		preferredRT = a.configMgr.GetSelectedRuntime()
	}
	_ = a.initRuntime(preferredRT)
}

func (a *App) initRuntime(preferred string) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.currentRT != nil {
		_ = a.currentRT.Close()
		a.currentRT = nil
		a.runtimeType = "none"
	}

	var rt runtime.Runtime
	var rtType string
	var err error

	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	switch preferred {
	case "podman":
		c, cErr := podmanclient.NewClient(ctx)
		if cErr == nil && c != nil {
			rt = c
			rtType = "podman"
		} else {
			err = cErr
		}
	case "docker":
		c, cErr := dockerclient.NewClient(ctx)
		if cErr == nil && c != nil {
			rt = c
			rtType = "docker"
		} else {
			err = cErr
		}
	default: // "auto"
		// Try Docker first, fallback to Podman
		c, cErr := dockerclient.NewClient(ctx)
		if cErr == nil && c != nil {
			rt = c
			rtType = "docker"
		} else {
			err = cErr
			p, pErr := podmanclient.NewClient(ctx)
			if pErr == nil && p != nil {
				rt = p
				rtType = "podman"
				err = nil
			} else if pErr != nil {
				err = pErr
			}
		}
	}

	if rt != nil {
		a.currentRT = rt
		a.runtimeType = rtType
		a.containerSvc = containers.NewService(rt)
		a.imageSvc = images.NewService(rt)
		a.volumeSvc = volumes.NewService(rt)
		a.networkSvc = networks.NewService(rt)
		a.composeMgr = compose.NewManager(rtType)
		return nil
	}

	a.currentRT = nil
	a.containerSvc = nil
	a.imageSvc = nil
	a.volumeSvc = nil
	a.networkSvc = nil

	// When preferred runtime is offline or not installed, reflect the requested engine
	if preferred == "docker" || preferred == "podman" {
		a.runtimeType = preferred
	} else {
		a.runtimeType = "none"
	}
	a.composeMgr = compose.NewManager("docker")
	if err == nil {
		err = fmt.Errorf("%s runtime is not reachable or not installed", preferred)
	}
	return err
}

// ==========================================
// System & Runtime Methods
// ==========================================

// Greet returns a greeting for testing connection.
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, welcome to Dockit!", name)
}

// GetActiveRuntime returns the currently active runtime ("docker", "podman", or "none").
func (a *App) GetActiveRuntime() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.runtimeType
}

// SwitchRuntime reconnects Dockit to a different runtime ("docker" or "podman").
func (a *App) SwitchRuntime(targetRuntime string) (string, error) {
	err := a.initRuntime(targetRuntime)
	if a.configMgr != nil && err == nil {
		_ = a.configMgr.SetSelectedRuntime(targetRuntime)
	}
	return a.GetActiveRuntime(), err
}

// getContext returns a derived context with a timeout, falling back to Background() if a.ctx is nil.
func (a *App) getContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	if timeout > 0 {
		return context.WithTimeout(ctx, timeout)
	}
	return ctx, func() {}
}

// GetSystemInfo retrieves runtime daemon host and system metrics.
func (a *App) GetSystemInfo() (*runtime.SystemInfo, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime")
	}
	ctx, cancel := a.getContext(5 * time.Second)
	defer cancel()
	return rt.Info(ctx)
}

// GetHostMetrics retrieves real-time CPU, RAM, and hardware metrics.
func (a *App) GetHostMetrics() *host.Metrics {
	return host.GetMetrics()
}

// GetSystemVersion retrieves version details for the active runtime.
func (a *App) GetSystemVersion() (*runtime.SystemVersion, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime")
	}
	ctx, cancel := a.getContext(5 * time.Second)
	defer cancel()
	return rt.Version(ctx)
}

// GetAppVersion returns the current application version string.
func (a *App) GetAppVersion() string {
	return version.Version
}

// CheckForAppUpdate checks GitHub for newer releases and download assets.
func (a *App) CheckForAppUpdate() (*updater.UpdateInfo, error) {
	return updater.CheckForUpdate(a.ctx)
}

// DownloadAndApplyUpdate starts downloading the update archive, extracts it, and applies it in-place.
func (a *App) DownloadAndApplyUpdate(downloadURL, assetFileName string) error {
	return updater.DownloadAndInstallUpdate(a.ctx, downloadURL, assetFileName)
}

// GetUpdateProgress returns the current percentage and state of the update download.
func (a *App) GetUpdateProgress() updater.DownloadProgress {
	return updater.GetCurrentProgress()
}

// RestartApp restarts the desktop application with the newly updated binary.
func (a *App) RestartApp() error {
	return updater.RestartApp()
}

// ==========================================
// Containers Methods
// ==========================================

// GetContainers returns containers matching the filter (all or running).
func (a *App) GetContainers(all bool) ([]containers.Container, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.List(ctx, all)
}

// GetContainer returns details for a single container by ID or name.
func (a *App) GetContainer(idOrName string) (*containers.Container, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Get(ctx, idOrName)
}

// InspectContainer returns full low-level inspect information for a container.
func (a *App) InspectContainer(id string) (*runtime.ContainerInspect, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Inspect(ctx, id)
}

// GetContainerResourceStats returns real-time CPU, Memory, Network, and Block I/O statistics for a container.
func (a *App) GetContainerResourceStats(id string) (*containers.ResourceStats, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(10 * time.Second)
	defer cancel()
	return svc.GetResourceStats(ctx, id)
}

// CreateContainer creates a new container with the specified parameters.
func (a *App) CreateContainer(opts runtime.ContainerCreateOptions) (string, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return "", fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(30 * time.Second)
	defer cancel()
	return svc.Create(ctx, opts)
}

// StartContainer begins execution of a stopped container.
func (a *App) StartContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(30 * time.Second)
	defer cancel()
	return svc.Start(ctx, id)
}

// StopContainer stops a running container.
func (a *App) StopContainer(id string, timeout *int) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	timeoutDuration := 30 * time.Second
	if timeout != nil && *timeout > 0 {
		timeoutDuration = time.Duration(*timeout+15) * time.Second
	}
	ctx, cancel := a.getContext(timeoutDuration)
	defer cancel()
	return svc.Stop(ctx, id, timeout)
}

// RestartContainer restarts a container.
func (a *App) RestartContainer(id string, timeout *int) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	timeoutDuration := 30 * time.Second
	if timeout != nil && *timeout > 0 {
		timeoutDuration = time.Duration(*timeout+15) * time.Second
	}
	ctx, cancel := a.getContext(timeoutDuration)
	defer cancel()
	return svc.Restart(ctx, id, timeout)
}

// PauseContainer pauses a running container.
func (a *App) PauseContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Pause(ctx, id)
}

// UnpauseContainer resumes execution of a paused container.
func (a *App) UnpauseContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Unpause(ctx, id)
}

// RemoveContainer deletes a container.
func (a *App) RemoveContainer(id string, force, removeVolumes bool) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(30 * time.Second)
	defer cancel()
	return svc.Remove(ctx, id, force, removeVolumes)
}

// GetContainerLogs returns logs for a container as text.
func (a *App) GetContainerLogs(id string) (string, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return "", fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Logs(ctx, id)
}

// ExecContainer executes a command inside a running container and returns output.
func (a *App) ExecContainer(id string, cmd []string) (string, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return "", fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(120 * time.Second)
	defer cancel()
	return svc.Exec(ctx, id, cmd)
}

// ==========================================
// Images Methods
// ==========================================

// GetImages returns local container images.
func (a *App) GetImages(all bool) ([]images.Image, error) {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.List(ctx, all)
}

// InspectImage returns inspect details for an image.
func (a *App) InspectImage(id string) (*runtime.ImageInspect, error) {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Inspect(ctx, id)
}

// PullImage pulls an image from a remote registry until complete.
func (a *App) PullImage(ref string) error {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	reader, err := svc.Pull(a.ctx, ref)
	if err != nil {
		return err
	}
	defer reader.Close()
	_, err = io.Copy(io.Discard, reader)
	return err
}

// TagImage tags an existing image.
func (a *App) TagImage(source, target string) error {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Tag(ctx, source, target)
}

// RemoveImage deletes an image from local storage.
func (a *App) RemoveImage(id string, force bool) ([]runtime.ImageDeleteResult, error) {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(30 * time.Second)
	defer cancel()
	return svc.Remove(ctx, id, force)
}

// ==========================================
// Volumes Methods
// ==========================================

// GetVolumes returns all volumes on the host.
func (a *App) GetVolumes() ([]volumes.Volume, error) {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.List(ctx)
}

// CreateVolume creates a new volume.
func (a *App) CreateVolume(opts runtime.VolumeCreateOptions) (*volumes.Volume, error) {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Create(ctx, opts)
}

// InspectVolume returns inspection details for a volume.
func (a *App) InspectVolume(name string) (*volumes.Volume, error) {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Inspect(ctx, name)
}

// RemoveVolume deletes a volume.
func (a *App) RemoveVolume(name string, force bool) error {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Remove(ctx, name, force)
}

// PruneVolumes removes unused volumes.
func (a *App) PruneVolumes() error {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(60 * time.Second)
	defer cancel()
	return svc.Prune(ctx)
}

// ==========================================
// Networks Methods
// ==========================================

// GetNetworks returns all networks on the host.
func (a *App) GetNetworks() ([]networks.Network, error) {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.List(ctx)
}

// CreateNetwork creates a new network.
func (a *App) CreateNetwork(opts runtime.NetworkCreateOptions) (*networks.Network, error) {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Create(ctx, opts)
}

// InspectNetwork returns inspection details for a network.
func (a *App) InspectNetwork(id string) (*networks.Network, error) {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(15 * time.Second)
	defer cancel()
	return svc.Inspect(ctx, id)
}

// RemoveNetwork deletes an existing network.
func (a *App) RemoveNetwork(id string) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Remove(ctx, id)
}

// ConnectContainerToNetwork connects a container to a network.
func (a *App) ConnectContainerToNetwork(networkID, containerID string) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Connect(ctx, networkID, containerID)
}

// DisconnectContainerFromNetwork detaches a container from a network.
func (a *App) DisconnectContainerFromNetwork(networkID, containerID string, force bool) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	ctx, cancel := a.getContext(20 * time.Second)
	defer cancel()
	return svc.Disconnect(ctx, networkID, containerID, force)
}

// ==========================================
// Compose Methods
// ==========================================

// SelectDirectoryDialog opens native OS file manager / directory chooser.
func (a *App) SelectDirectoryDialog() (string, error) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	dir, err := wailsruntime.OpenDirectoryDialog(ctx, wailsruntime.OpenDialogOptions{
		Title: "Select Folder Containing docker-compose.yml",
	})
	return dir, err
}

// OpenComposeProject loads a project from a path.
func (a *App) OpenComposeProject(path string) (*compose.Project, error) {
	return a.composeMgr.OpenProject(path)
}

// OpenComposeProjectFromURL downloads and opens a compose project from a URL.
func (a *App) OpenComposeProjectFromURL(destDir, rawURL string) (*compose.Project, error) {
	return a.composeMgr.OpenProjectFromURL(a.ctx, destDir, rawURL)
}

// ComposeUp runs `compose up` for the project or selected services.
func (a *App) ComposeUp(projectID string, opts compose.UpOptions) (string, error) {
	return a.composeMgr.Up(a.ctx, projectID, opts)
}

// ComposeDown runs `compose down` for the project.
func (a *App) ComposeDown(projectID string, opts compose.DownOptions) (string, error) {
	return a.composeMgr.Down(a.ctx, projectID, opts)
}

// ComposeStart starts project containers.
func (a *App) ComposeStart(projectID string, services []string) (string, error) {
	return a.composeMgr.Start(a.ctx, projectID, services...)
}

// ComposeStop stops project containers.
func (a *App) ComposeStop(projectID string, services []string) (string, error) {
	return a.composeMgr.Stop(a.ctx, projectID, services...)
}

// ComposeRestart restarts project containers.
func (a *App) ComposeRestart(projectID string, services []string) (string, error) {
	return a.composeMgr.Restart(a.ctx, projectID, services...)
}

// ComposePS returns container statuses for the project.
func (a *App) ComposePS(projectID string) ([]compose.ContainerStatus, error) {
	return a.composeMgr.PS(a.ctx, projectID)
}

// ComposeLogs returns logs for the project or a specific service.
func (a *App) ComposeLogs(projectID string, service string, tail string) (string, error) {
	return a.composeMgr.Logs(a.ctx, projectID, service, tail)
}

// ComposeStageChanges stages temporary YAML edits for testing without overwriting original file.
func (a *App) ComposeStageChanges(projectID string, newContent string) error {
	return a.composeMgr.StageChanges(projectID, newContent)
}

// ComposeApplyChanges commits staged changes to the original compose file on disk.
func (a *App) ComposeApplyChanges(projectID string) error {
	return a.composeMgr.ApplyChanges(projectID)
}

// ComposeDiscardChanges cancels staged changes and removes the test file.
func (a *App) ComposeDiscardChanges(projectID string) error {
	return a.composeMgr.DiscardChanges(projectID)
}

// ComposeRefresh updates live status of all services in the project.
func (a *App) ComposeRefresh(projectID string) (*compose.Project, error) {
	return a.composeMgr.Refresh(a.ctx, projectID)
}

// ComposeSaveSnapshot records a Git-style blob hash revision of the compose file.
func (a *App) ComposeSaveSnapshot(projectID, message string) (*compose.Snapshot, error) {
	return a.composeMgr.SaveSnapshot(projectID, message)
}

// ComposeRestoreSnapshot restores a previous Git hash snapshot into the testing sandbox.
func (a *App) ComposeRestoreSnapshot(projectID, hash string) (*compose.Project, error) {
	return a.composeMgr.RestoreSnapshot(projectID, hash)
}

// ComposeReadEnv reads the .env file content for the given project.
func (a *App) ComposeReadEnv(projectID string) (string, error) {
	if a.composeMgr == nil {
		return "", fmt.Errorf("compose manager not initialized")
	}
	return a.composeMgr.ReadEnv(projectID)
}

// ComposeSaveEnv saves new content to the .env file for the given project.
func (a *App) ComposeSaveEnv(projectID, content string) error {
	if a.composeMgr == nil {
		return fmt.Errorf("compose manager not initialized")
	}
	return a.composeMgr.SaveEnv(projectID, content)
}

// ComposeDeleteEnv removes the .env file for the given project.
func (a *App) ComposeDeleteEnv(projectID string) error {
	if a.composeMgr == nil {
		return fmt.Errorf("compose manager not initialized")
	}
	return a.composeMgr.DeleteEnv(projectID)
}

// ==========================================
// Registry Methods
// ==========================================

// SearchRegistry searches images within a specific registry ("dockerhub", "ghcr").
func (a *App) SearchRegistry(registryName, query string, page, limit int) ([]registry.SearchResult, error) {
	return a.registrySvc.Search(a.ctx, registryName, query, registry.SearchOptions{Page: page, Limit: limit})
}

// SearchAllRegistries searches across all configured registries in parallel.
func (a *App) SearchAllRegistries(query string, page, limit int) ([]registry.SearchResult, error) {
	return a.registrySvc.SearchAll(a.ctx, query, registry.SearchOptions{Page: page, Limit: limit})
}

// GetRegistryTags retrieves tags for a remote repository.
func (a *App) GetRegistryTags(registryName, repository string) ([]registry.Tag, error) {
	return a.registrySvc.GetTags(a.ctx, registryName, repository)
}

// GetRegistryMetadata retrieves documentation and metadata for a remote repository.
func (a *App) GetRegistryMetadata(registryName, repository string) (*registry.ImageMetadata, error) {
	return a.registrySvc.GetMetadata(a.ctx, registryName, repository)
}

// ==========================================
// Configuration & Preferences Methods
// ==========================================

// GetConfig returns the full application configuration.
func (a *App) GetConfig() (config.Config, error) {
	if a.configMgr == nil {
		return *config.DefaultConfig(), nil
	}
	return a.configMgr.Get(), nil
}

// SetTheme updates the UI theme preference ("dark", "light", "system").
func (a *App) SetTheme(theme string) error {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.SetTheme(theme)
}

// SetAutoCheckUpdates saves the user's preference for automatic background update checking.
func (a *App) SetAutoCheckUpdates(enabled bool) error {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.SetAutoCheckUpdates(enabled)
}

// GetSystemTheme queries host OS desktop settings (e.g. Cinnamon, GNOME, FreeDesktop portal)
// to accurately determine if the user has a dark theme active.
func (a *App) GetSystemTheme() string {
	// 1. Check org.gnome.desktop.interface color-scheme
	if out, err := exec.Command("gsettings", "get", "org.gnome.desktop.interface", "color-scheme").Output(); err == nil {
		s := strings.Trim(strings.TrimSpace(string(out)), "'\"")
		if strings.Contains(s, "dark") {
			return "dark"
		}
	}
	// 2. Check org.x.apps.portal color-scheme (Mint/Cinnamon)
	if out, err := exec.Command("gsettings", "get", "org.x.apps.portal", "color-scheme").Output(); err == nil {
		s := strings.Trim(strings.TrimSpace(string(out)), "'\"")
		if strings.Contains(s, "dark") {
			return "dark"
		}
	}
	// 3. Check GTK theme name for "Dark" keyword (e.g. Mint-Y-Dark-Blue, Adwaita-dark)
	if out, err := exec.Command("gsettings", "get", "org.cinnamon.desktop.interface", "gtk-theme").Output(); err == nil {
		s := strings.Trim(strings.TrimSpace(string(out)), "'\"")
		if strings.Contains(strings.ToLower(s), "dark") {
			return "dark"
		}
	}
	if out, err := exec.Command("gsettings", "get", "org.gnome.desktop.interface", "gtk-theme").Output(); err == nil {
		s := strings.Trim(strings.TrimSpace(string(out)), "'\"")
		if strings.Contains(strings.ToLower(s), "dark") {
			return "dark"
		}
	}
	return "light"
}

// AddFavorite adds an image to saved favorites.
func (a *App) AddFavorite(image string) error {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.AddFavorite(image)
}

// RemoveFavorite removes an image from favorites.
func (a *App) RemoveFavorite(image string) error {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.RemoveFavorite(image)
}

// GetFavorites returns the list of favorite images.
func (a *App) GetFavorites() []string {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.GetFavorites()
}

// SetCustomValue stores arbitrary UI state.
func (a *App) SetCustomValue(key, val string) error {
	if a.configMgr == nil {
		return nil
	}
	return a.configMgr.SetCustomValue(key, val)
}

// GetCustomValue retrieves saved arbitrary UI state.
func (a *App) GetCustomValue(key string) string {
	if a.configMgr == nil {
		return ""
	}
	val, _ := a.configMgr.GetCustomValue(key)
	return val
}

// ==========================================
// Installer & Runtime Detection Methods
// ==========================================

// DetectRuntimes checks host machine for Docker and Podman installation & service status.
func (a *App) DetectRuntimes() (*installer.DetectionResult, error) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return installer.Detect(ctx)
}

// GetInstallPlan returns a detailed step-by-step installation plan for a runtime.
func (a *App) GetInstallPlan(targetRuntime string) (*installer.InstallPlan, error) {
	return installer.GetInstallPlan(targetRuntime)
}

// InstallRuntime runs the installation plan for Docker or Podman.
func (a *App) InstallRuntime(targetRuntime string) error {
	return installer.Install(a.ctx, targetRuntime, nil)
}

// ==========================================
// System Disk Usage & Cleanup Methods
// ==========================================

// GetDiskUsage returns the total and category breakdown of disk space and reclaimable space.
func (a *App) GetDiskUsage() (*runtime.DiskUsage, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime connected")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	return rt.GetDiskUsage(ctx)
}

// PruneSystem cleans up stopped containers, unused images, volumes, build cache, and networks based on options.
func (a *App) PruneSystem(opts runtime.PruneOptions) (*runtime.PruneResult, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime connected")
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	return rt.PruneSystem(ctx, opts)
}

// ==========================================
// Host Terminal Methods
// ==========================================

// ExecHostCommand runs a command on the host shell and returns the output and current directory.
func (a *App) ExecHostCommand(command string) terminal.Result {
	if a.terminalSvc == nil {
		a.terminalSvc = terminal.NewService()
	}
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	return a.terminalSvc.Exec(ctx, command)
}

// GetHostCwd returns the current host terminal working directory.
func (a *App) GetHostCwd() string {
	if a.terminalSvc == nil {
		a.terminalSvc = terminal.NewService()
	}
	return a.terminalSvc.GetCwd()
}

// SetHostCwd sets the current host terminal working directory.
func (a *App) SetHostCwd(dir string) error {
	if a.terminalSvc == nil {
		a.terminalSvc = terminal.NewService()
	}
	return a.terminalSvc.SetCwd(dir)
}

// CancelHostCommand terminates the currently running host shell command if active.
func (a *App) CancelHostCommand() bool {
	if a.terminalSvc == nil {
		return false
	}
	return a.terminalSvc.Cancel()
}

// GetHostHomeDir returns the user's home directory.
func (a *App) GetHostHomeDir() string {
	if a.terminalSvc == nil {
		a.terminalSvc = terminal.NewService()
	}
	return a.terminalSvc.GetHomeDir()
}