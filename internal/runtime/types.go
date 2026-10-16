package runtime

// Type represents the supported container runtime types.
type Type string

const (
	TypeDocker Type = "docker"
	TypePodman Type = "podman"
)

// SystemInfo represents runtime system and host information.
type SystemInfo struct {
	ID                string `json:"id"`
	Containers        int    `json:"containers"`
	ContainersRunning int    `json:"containersRunning"`
	ContainersPaused  int    `json:"containersPaused"`
	ContainersStopped int    `json:"containersStopped"`
	Images            int    `json:"images"`
	Driver            string `json:"driver"`
	MemoryTotal       int64  `json:"memoryTotal"`
	CPUs              int    `json:"cpus"`
	OperatingSystem   string `json:"operatingSystem"`
	OSType            string `json:"osType"`
	Architecture      string `json:"architecture"`
	ServerVersion     string `json:"serverVersion"`
}

// SystemVersion represents runtime version information.
type SystemVersion struct {
	Version       string `json:"version"`
	APIVersion    string `json:"apiVersion"`
	MinAPIVersion string `json:"minApiVersion"`
	GitCommit     string `json:"gitCommit,omitempty"`
	GoVersion     string `json:"goVersion,omitempty"`
	Os            string `json:"os"`
	Arch          string `json:"arch"`
}

// Port represents a network port mapping for a container.
type Port struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort uint16 `json:"privatePort"`
	PublicPort  uint16 `json:"publicPort,omitempty"`
	Type        string `json:"type"`
}

// ContainerPortBinding defines how a port is exposed to the host.
type ContainerPortBinding struct {
	HostIP   string `json:"hostIp,omitempty"`
	HostPort string `json:"hostPort"`
}

// ContainerSummary represents container summary information.
type ContainerSummary struct {
	ID      string            `json:"id"`
	Names   []string          `json:"names"`
	Image   string            `json:"image"`
	ImageID string            `json:"imageId"`
	Command string            `json:"command"`
	Created int64             `json:"created"`
	State   string            `json:"state"`
	Status  string            `json:"status"`
	Ports   []Port            `json:"ports"`
	Labels  map[string]string `json:"labels"`
}

// ContainerListOptions contains filters and options for listing containers.
type ContainerListOptions struct {
	All     bool                `json:"all"`
	Limit   int                 `json:"limit"`
	Filters map[string][]string `json:"filters,omitempty"`
}

// ContainerCreateOptions provides parameters to create a new container.
type ContainerCreateOptions struct {
	Name          string                           `json:"name,omitempty"`
	Image         string                           `json:"image"`
	Command       []string                         `json:"command,omitempty"`
	Env           []string                         `json:"env,omitempty"`
	Ports         map[string][]ContainerPortBinding `json:"ports,omitempty"`
	PortMappings  []string                         `json:"portMappings,omitempty"` // format: "8080:80/tcp" or "8080:80"
	Volumes       []string                         `json:"volumes,omitempty"`      // format: "host_path:container_path:ro" or "vol_name:dest"
	Networks      []string                         `json:"networks,omitempty"`
	RestartPolicy string                           `json:"restartPolicy,omitempty"` // "no", "always", "unless-stopped", "on-failure"
	Labels        map[string]string                `json:"labels,omitempty"`
}

// ContainerRemoveOptions specifies options for container deletion.
type ContainerRemoveOptions struct {
	Force         bool `json:"force"`
	RemoveVolumes bool `json:"removeVolumes"`
}

// ContainerLogsOptions specifies options for fetching container logs.
type ContainerLogsOptions struct {
	ShowStdout bool   `json:"showStdout"`
	ShowStderr bool   `json:"showStderr"`
	Timestamps bool   `json:"timestamps"`
	Follow     bool   `json:"follow"`
	Tail       string `json:"tail,omitempty"`
}

// ContainerState captures the lifecycle status of a container.
type ContainerState struct {
	Status     string `json:"status"`
	Running    bool   `json:"running"`
	Paused     bool   `json:"paused"`
	Restarting bool   `json:"restarting"`
	OOMKilled  bool   `json:"oomKilled"`
	Dead       bool   `json:"dead"`
	Pid        int    `json:"pid"`
	ExitCode   int    `json:"exitCode"`
	Error      string `json:"error"`
	StartedAt  string `json:"startedAt"`
	FinishedAt string `json:"finishedAt"`
}

// MountPoint defines a volume or directory mounted in the container.
type MountPoint struct {
	Type        string `json:"type"`
	Name        string `json:"name,omitempty"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Driver      string `json:"driver,omitempty"`
	Mode        string `json:"mode"`
	RW          bool   `json:"rw"`
}

// NetworkSettings holds network configuration and assigned addresses.
type NetworkSettings struct {
	IPAddress   string            `json:"ipAddress"`
	Gateway     string            `json:"gateway"`
	MacAddress  string            `json:"macAddress"`
	Networks    map[string]string `json:"networks"` // network name -> IP
}

// ContainerInspect represents full detailed inspection data for a container.
type ContainerInspect struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	ImageID      string            `json:"imageId"`
	Created      string            `json:"created"`
	State        ContainerState    `json:"state"`
	Command      string            `json:"command"`
	Args         []string          `json:"args"`
	Env          []string          `json:"env"`
	Labels       map[string]string `json:"labels"`
	Ports        []Port            `json:"ports"`
	Mounts       []MountPoint      `json:"mounts"`
	Network      NetworkSettings   `json:"network"`
	RestartCount int               `json:"restartCount"`
	Platform     string            `json:"platform"`
}

// ImageSummary represents a local container image summary.
type ImageSummary struct {
	ID          string            `json:"id"`
	ParentID    string            `json:"parentId"`
	RepoTags    []string          `json:"repoTags"`
	RepoDigests []string          `json:"repoDigests"`
	Created     int64             `json:"created"`
	Size        int64             `json:"size"`
	SharedSize  int64             `json:"sharedSize"`
	Containers  int64             `json:"containers"`
	Labels      map[string]string `json:"labels"`
}

// ImageListOptions specifies options when listing images.
type ImageListOptions struct {
	All     bool                `json:"all"`
	Filters map[string][]string `json:"filters,omitempty"`
}

// ImageInspect represents detailed information about a container image.
type ImageInspect struct {
	ID           string            `json:"id"`
	RepoTags     []string          `json:"repoTags"`
	RepoDigests  []string          `json:"repoDigests"`
	Parent       string            `json:"parent"`
	Comment      string            `json:"comment"`
	Created      string            `json:"created"`
	Author       string            `json:"author"`
	Architecture string            `json:"architecture"`
	OS           string            `json:"os"`
	Size         int64             `json:"size"`
	VirtualSize  int64             `json:"virtualSize"`
	Labels       map[string]string `json:"labels"`
	Env          []string          `json:"env"`
	Cmd          []string          `json:"cmd"`
	WorkingDir   string            `json:"workingDir"`
	Entrypoint   []string          `json:"entrypoint"`
}

// ImageRemoveOptions specifies options for removing an image.
type ImageRemoveOptions struct {
	Force         bool `json:"force"`
	PruneChildren bool `json:"pruneChildren"`
}

// ImageDeleteResult records an image tag deletion or untagging action.
type ImageDeleteResult struct {
	Untagged string `json:"untagged,omitempty"`
	Deleted  string `json:"deleted,omitempty"`
}

// VolumeSummary represents volume details.
type VolumeSummary struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Mountpoint string            `json:"mountpoint"`
	CreatedAt  string            `json:"createdAt,omitempty"`
	Labels     map[string]string `json:"labels"`
	Scope      string            `json:"scope"`
	Size       int64             `json:"size,omitempty"`
}

// VolumeCreateOptions specifies parameters to create a volume.
type VolumeCreateOptions struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver,omitempty"`
	DriverOpts map[string]string `json:"driverOpts,omitempty"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// NetworkIPAMConfig represents subnet and gateway configuration for IPAM.
type NetworkIPAMConfig struct {
	Subnet  string `json:"subnet,omitempty"`
	Gateway string `json:"gateway,omitempty"`
}

// NetworkIPAM represents IP address management configuration.
type NetworkIPAM struct {
	Driver string              `json:"driver"`
	Config []NetworkIPAMConfig `json:"config"`
}

// NetworkSummary represents network details.
type NetworkSummary struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Scope      string            `json:"scope"`
	Internal   bool              `json:"internal"`
	Attachable bool              `json:"attachable"`
	Ingress    bool              `json:"ingress"`
	IPAM       NetworkIPAM       `json:"ipam"`
	Containers map[string]string `json:"containers,omitempty"` // container ID/name -> IP
	Labels     map[string]string `json:"labels"`
}

// NetworkCreateOptions specifies parameters to create a network.
type NetworkCreateOptions struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver,omitempty"`
	Internal   bool              `json:"internal"`
	Attachable bool              `json:"attachable"`
	Labels     map[string]string `json:"labels,omitempty"`
}

// DiskUsage represents the breakdown of disk space consumed by the container engine.
type DiskUsage struct {
	TotalSpace       int64             `json:"totalSpace"`
	TotalReclaimable int64             `json:"totalReclaimable"`
	Images           CategoryDiskUsage `json:"images"`
	Containers       CategoryDiskUsage `json:"containers"`
	Volumes          CategoryDiskUsage `json:"volumes"`
	BuildCache       CategoryDiskUsage `json:"buildCache"`
}

// CategoryDiskUsage represents storage statistics for a single category of resources.
type CategoryDiskUsage struct {
	TotalCount  int64 `json:"totalCount"`
	ActiveCount int64 `json:"activeCount"`
	TotalSize   int64 `json:"totalSize"`
	Reclaimable int64 `json:"reclaimable"`
}

// PruneOptions specifies which resources to clean up.
type PruneOptions struct {
	AllImages  bool `json:"allImages"`  // true: prune all unused images; false: dangling only
	Containers bool `json:"containers"` // prune stopped containers
	Volumes    bool `json:"volumes"`    // prune unused volumes
	BuildCache bool `json:"buildCache"` // prune build cache
	Networks   bool `json:"networks"`   // prune unused networks
}

// PruneResult contains the outcome of a cleanup operation.
type PruneResult struct {
	SpaceReclaimed    int64    `json:"spaceReclaimed"`
	ContainersDeleted []string `json:"containersDeleted"`
	ImagesDeleted     []string `json:"imagesDeleted"`
	VolumesDeleted    []string `json:"volumesDeleted"`
	NetworksDeleted   []string `json:"networksDeleted"`
	BuildCacheDeleted []string `json:"buildCacheDeleted"`
	Errors            []string `json:"errors,omitempty"`
}
