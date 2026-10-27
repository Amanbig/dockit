package containers

import (
	"context"
	"fmt"
	"io"
	"strings"

	"dockit/internal/runtime"
)

// Service provides high-level container lifecycle operations backed by a container runtime.
type Service struct {
	rt runtime.Runtime
}

// NewService creates a new containers Service using the provided runtime.
func NewService(rt runtime.Runtime) *Service {
	return &Service{rt: rt}
}

// Runtime returns the underlying runtime instance.
func (s *Service) Runtime() runtime.Runtime {
	return s.rt
}

// List returns containers formatted for the UI.
func (s *Service) List(ctx context.Context, all bool) ([]Container, error) {
	summaries, err := s.rt.ListContainers(ctx, runtime.ContainerListOptions{All: all})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]Container, 0, len(summaries))
	for _, c := range summaries {
		result = append(result, formatSummary(c))
	}
	return result, nil
}

// Get returns a single container by ID or name.
func (s *Service) Get(ctx context.Context, idOrName string) (*Container, error) {
	summary, err := s.rt.GetContainer(ctx, idOrName)
	if err != nil {
		return nil, err
	}
	c := formatSummary(*summary)
	return &c, nil
}

// Inspect returns full inspection details for a container.
func (s *Service) Inspect(ctx context.Context, id string) (*runtime.ContainerInspect, error) {
	return s.rt.InspectContainer(ctx, id)
}

// Create creates a new container with the specified configuration.
func (s *Service) Create(ctx context.Context, opts runtime.ContainerCreateOptions) (string, error) {
	return s.rt.CreateContainer(ctx, opts)
}

// Start starts a stopped container.
func (s *Service) Start(ctx context.Context, id string) error {
	return s.rt.StartContainer(ctx, id)
}

// Stop gracefully stops a running container within the optional timeout.
func (s *Service) Stop(ctx context.Context, id string, timeout *int) error {
	return s.rt.StopContainer(ctx, id, timeout)
}

// Restart restarts a container within the optional timeout.
func (s *Service) Restart(ctx context.Context, id string, timeout *int) error {
	return s.rt.RestartContainer(ctx, id, timeout)
}

// Pause pauses running processes inside a container.
func (s *Service) Pause(ctx context.Context, id string) error {
	return s.rt.PauseContainer(ctx, id)
}

// Unpause resumes a paused container.
func (s *Service) Unpause(ctx context.Context, id string) error {
	return s.rt.UnpauseContainer(ctx, id)
}

// Remove deletes a container.
func (s *Service) Remove(ctx context.Context, id string, force, removeVolumes bool) error {
	return s.rt.RemoveContainer(ctx, id, runtime.ContainerRemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
	})
}

// Logs retrieves container logs as text.
func (s *Service) Logs(ctx context.Context, id string) (string, error) {
	return s.rt.GetContainerLogs(ctx, id)
}

// LogsStream streams live container logs.
func (s *Service) LogsStream(ctx context.Context, id string, opts runtime.ContainerLogsOptions) (io.ReadCloser, error) {
	return s.rt.GetContainerLogsStream(ctx, id, opts)
}

// Stats returns a stream of resource usage statistics.
func (s *Service) Stats(ctx context.Context, id string, stream bool) (io.ReadCloser, error) {
	return s.rt.GetContainerStats(ctx, id, stream)
}

// Exec executes a command inside a running container and returns output.
func (s *Service) Exec(ctx context.Context, id string, cmd []string) (string, error) {
	return s.rt.ExecContainer(ctx, id, cmd)
}

func formatSummary(c runtime.ContainerSummary) Container {
	name := ""
	if len(c.Names) > 0 {
		name = strings.TrimPrefix(c.Names[0], "/")
	}

	ports := make([]string, 0, len(c.Ports))
	seenPorts := make(map[string]bool)
	for _, p := range c.Ports {
		var portStr string
		if p.PublicPort > 0 {
			portStr = fmt.Sprintf("%d:%d/%s", p.PublicPort, p.PrivatePort, p.Type)
		} else {
			portStr = fmt.Sprintf("%d/%s", p.PrivatePort, p.Type)
		}
		if !seenPorts[portStr] {
			seenPorts[portStr] = true
			ports = append(ports, portStr)
		}
	}

	shortID := c.ID
	if len(shortID) > 12 {
		shortID = shortID[:12]
	}

	return Container{
		ID:      c.ID,
		ShortID: shortID,
		Name:    name,
		Image:   c.Image,
		Status:  c.Status,
		State:   c.State,
		Ports:   ports,
		Created: c.Created,
	}
}
