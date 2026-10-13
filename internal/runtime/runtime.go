package runtime

import (
	"context"
	"io"
)

// Runtime defines the contract for container engines (Docker, Podman).
type Runtime interface {
	// Type returns the runtime type (docker or podman).
	Type() Type

	// Ping checks if the runtime daemon is reachable.
	Ping(ctx context.Context) error

	// Info returns daemon system information.
	Info(ctx context.Context) (*SystemInfo, error)

	// Version returns daemon version information.
	Version(ctx context.Context) (*SystemVersion, error)

	// Close closes any underlying connections to the runtime.
	Close() error

	// Container operations
	ListContainers(ctx context.Context, opts ...ContainerListOptions) ([]ContainerSummary, error)
	GetContainer(ctx context.Context, containerID string) (*ContainerSummary, error)
	InspectContainer(ctx context.Context, containerID string) (*ContainerInspect, error)
	CreateContainer(ctx context.Context, opts ContainerCreateOptions) (string, error)
	StartContainer(ctx context.Context, containerID string) error
	StopContainer(ctx context.Context, containerID string, timeout *int) error
	RestartContainer(ctx context.Context, containerID string, timeout *int) error
	PauseContainer(ctx context.Context, containerID string) error
	UnpauseContainer(ctx context.Context, containerID string) error
	RemoveContainer(ctx context.Context, containerID string, opts ContainerRemoveOptions) error
	GetContainerLogs(ctx context.Context, containerID string) (string, error)
	GetContainerLogsStream(ctx context.Context, containerID string, opts ContainerLogsOptions) (io.ReadCloser, error)
	GetContainerStats(ctx context.Context, containerID string, stream bool) (io.ReadCloser, error)
	ExecContainer(ctx context.Context, containerID string, cmd []string) (string, error)

	// Image operations
	ListImages(ctx context.Context, opts ...ImageListOptions) ([]ImageSummary, error)
	InspectImage(ctx context.Context, imageID string) (*ImageInspect, error)
	PullImage(ctx context.Context, ref string) (io.ReadCloser, error)
	TagImage(ctx context.Context, source string, target string) error
	RemoveImage(ctx context.Context, imageID string, opts ImageRemoveOptions) ([]ImageDeleteResult, error)

	// Volume operations
	ListVolumes(ctx context.Context) ([]VolumeSummary, error)
	CreateVolume(ctx context.Context, opts VolumeCreateOptions) (*VolumeSummary, error)
	InspectVolume(ctx context.Context, volumeID string) (*VolumeSummary, error)
	RemoveVolume(ctx context.Context, volumeID string, force bool) error
	PruneVolumes(ctx context.Context) error

	// Network operations
	ListNetworks(ctx context.Context) ([]NetworkSummary, error)
	CreateNetwork(ctx context.Context, opts NetworkCreateOptions) (*NetworkSummary, error)
	InspectNetwork(ctx context.Context, networkID string) (*NetworkSummary, error)
	RemoveNetwork(ctx context.Context, networkID string) error
	ConnectContainerToNetwork(ctx context.Context, networkID string, containerID string) error
	DisconnectContainerFromNetwork(ctx context.Context, networkID string, containerID string, force bool) error
}
