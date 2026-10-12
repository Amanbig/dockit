package main

import (
	"context"
	"fmt"
	"io"
	"sync"

	"dockit/internal/compose"
	"dockit/internal/config"
	"dockit/internal/containers"
	"dockit/internal/images"
	"dockit/internal/installer"
	"dockit/internal/networks"
	"dockit/internal/registry"
	"dockit/internal/registry/dockerhub"
	"dockit/internal/registry/ghcr"
	"dockit/internal/runtime"
	dockerclient "dockit/internal/runtime/docker"
	podmanclient "dockit/internal/runtime/podman"
	"dockit/internal/volumes"
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

	switch preferred {
	case "podman":
		rt, err = podmanclient.NewClient(a.ctx)
		if err == nil {
			rtType = "podman"
		}
	case "docker":
		rt, err = dockerclient.NewClient(a.ctx)
		if err == nil {
			rtType = "docker"
		}
	default: // "auto"
		// Try Docker first, fallback to Podman
		rt, err = dockerclient.NewClient(a.ctx)
		if err == nil {
			rtType = "docker"
		} else {
			rt, err = podmanclient.NewClient(a.ctx)
			if err == nil {
				rtType = "podman"
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

	// Initialize standalone compose manager even if daemon is not currently running
	a.composeMgr = compose.NewManager("docker")
	return fmt.Errorf("no container runtime reachable: %w", err)
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
	if err := a.initRuntime(targetRuntime); err != nil {
		return a.GetActiveRuntime(), err
	}
	if a.configMgr != nil {
		_ = a.configMgr.SetSelectedRuntime(targetRuntime)
	}
	return a.GetActiveRuntime(), nil
}

// GetSystemInfo retrieves runtime daemon host and system metrics.
func (a *App) GetSystemInfo() (*runtime.SystemInfo, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime")
	}
	return rt.Info(a.ctx)
}

// GetSystemVersion retrieves version details for the active runtime.
func (a *App) GetSystemVersion() (*runtime.SystemVersion, error) {
	a.mu.RLock()
	rt := a.currentRT
	a.mu.RUnlock()
	if rt == nil {
		return nil, fmt.Errorf("no active container runtime")
	}
	return rt.Version(a.ctx)
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
	return svc.List(a.ctx, all)
}

// GetContainer returns details for a single container by ID or name.
func (a *App) GetContainer(idOrName string) (*containers.Container, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Get(a.ctx, idOrName)
}

// InspectContainer returns full low-level inspect information for a container.
func (a *App) InspectContainer(id string) (*runtime.ContainerInspect, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Inspect(a.ctx, id)
}

// CreateContainer creates a new container with the specified parameters.
func (a *App) CreateContainer(opts runtime.ContainerCreateOptions) (string, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return "", fmt.Errorf("container runtime not connected")
	}
	return svc.Create(a.ctx, opts)
}

// StartContainer begins execution of a stopped container.
func (a *App) StartContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Start(a.ctx, id)
}

// StopContainer stops a running container.
func (a *App) StopContainer(id string, timeout *int) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Stop(a.ctx, id, timeout)
}

// RestartContainer restarts a container.
func (a *App) RestartContainer(id string, timeout *int) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Restart(a.ctx, id, timeout)
}

// PauseContainer pauses a running container.
func (a *App) PauseContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Pause(a.ctx, id)
}

// UnpauseContainer resumes execution of a paused container.
func (a *App) UnpauseContainer(id string) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Unpause(a.ctx, id)
}

// RemoveContainer deletes a container.
func (a *App) RemoveContainer(id string, force, removeVolumes bool) error {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Remove(a.ctx, id, force, removeVolumes)
}

// GetContainerLogs returns logs for a container as text.
func (a *App) GetContainerLogs(id string) (string, error) {
	a.mu.RLock()
	svc := a.containerSvc
	a.mu.RUnlock()
	if svc == nil {
		return "", fmt.Errorf("container runtime not connected")
	}
	return svc.Logs(a.ctx, id)
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
	return svc.List(a.ctx, all)
}

// InspectImage returns inspect details for an image.
func (a *App) InspectImage(id string) (*runtime.ImageInspect, error) {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Inspect(a.ctx, id)
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
	return svc.Tag(a.ctx, source, target)
}

// RemoveImage deletes an image from local storage.
func (a *App) RemoveImage(id string, force bool) ([]runtime.ImageDeleteResult, error) {
	a.mu.RLock()
	svc := a.imageSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Remove(a.ctx, id, force)
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
	return svc.List(a.ctx)
}

// CreateVolume creates a new volume.
func (a *App) CreateVolume(opts runtime.VolumeCreateOptions) (*volumes.Volume, error) {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Create(a.ctx, opts)
}

// InspectVolume returns inspection details for a volume.
func (a *App) InspectVolume(name string) (*volumes.Volume, error) {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Inspect(a.ctx, name)
}

// RemoveVolume deletes a volume.
func (a *App) RemoveVolume(name string, force bool) error {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Remove(a.ctx, name, force)
}

// PruneVolumes removes unused volumes.
func (a *App) PruneVolumes() error {
	a.mu.RLock()
	svc := a.volumeSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Prune(a.ctx)
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
	return svc.List(a.ctx)
}

// CreateNetwork creates a new network.
func (a *App) CreateNetwork(opts runtime.NetworkCreateOptions) (*networks.Network, error) {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Create(a.ctx, opts)
}

// InspectNetwork returns inspection details for a network.
func (a *App) InspectNetwork(id string) (*networks.Network, error) {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return nil, fmt.Errorf("container runtime not connected")
	}
	return svc.Inspect(a.ctx, id)
}

// RemoveNetwork deletes an existing network.
func (a *App) RemoveNetwork(id string) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Remove(a.ctx, id)
}

// ConnectContainerToNetwork connects a container to a network.
func (a *App) ConnectContainerToNetwork(networkID, containerID string) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Connect(a.ctx, networkID, containerID)
}

// DisconnectContainerFromNetwork detaches a container from a network.
func (a *App) DisconnectContainerFromNetwork(networkID, containerID string, force bool) error {
	a.mu.RLock()
	svc := a.networkSvc
	a.mu.RUnlock()
	if svc == nil {
		return fmt.Errorf("container runtime not connected")
	}
	return svc.Disconnect(a.ctx, networkID, containerID, force)
}

// ==========================================
// Compose Methods
// ==========================================

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
	return installer.Detect(a.ctx)
}

// GetInstallPlan returns a detailed step-by-step installation plan for a runtime.
func (a *App) GetInstallPlan(targetRuntime string) (*installer.InstallPlan, error) {
	return installer.GetInstallPlan(targetRuntime)
}

// InstallRuntime runs the installation plan for Docker or Podman.
func (a *App) InstallRuntime(targetRuntime string) error {
	return installer.Install(a.ctx, targetRuntime, nil)
}