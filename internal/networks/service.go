package networks

import (
	"context"
	"fmt"
	"strings"

	"dockit/internal/runtime"
)

// Service provides high-level container networking operations backed by a container runtime.
type Service struct {
	rt runtime.Runtime
}

// NewService creates a new networks Service using the provided runtime.
func NewService(rt runtime.Runtime) *Service {
	return &Service{rt: rt}
}

// Runtime returns the underlying runtime instance.
func (s *Service) Runtime() runtime.Runtime {
	return s.rt
}

// List returns all networks formatted for the UI.
func (s *Service) List(ctx context.Context) ([]Network, error) {
	summaries, err := s.rt.ListNetworks(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	result := make([]Network, 0, len(summaries))
	for _, n := range summaries {
		result = append(result, formatNetwork(n))
	}
	return result, nil
}

// Create creates a new network with the specified options.
func (s *Service) Create(ctx context.Context, opts runtime.NetworkCreateOptions) (*Network, error) {
	summary, err := s.rt.CreateNetwork(ctx, opts)
	if err != nil {
		return nil, err
	}
	n := formatNetwork(*summary)
	return &n, nil
}

// Inspect returns inspection details for a specific network.
func (s *Service) Inspect(ctx context.Context, networkID string) (*Network, error) {
	summary, err := s.rt.InspectNetwork(ctx, networkID)
	if err != nil {
		return nil, err
	}
	n := formatNetwork(*summary)
	return &n, nil
}

// Remove deletes an existing network.
func (s *Service) Remove(ctx context.Context, networkID string) error {
	return s.rt.RemoveNetwork(ctx, networkID)
}

// Connect attaches a container to a network.
func (s *Service) Connect(ctx context.Context, networkID, containerID string) error {
	return s.rt.ConnectContainerToNetwork(ctx, networkID, containerID)
}

// Disconnect detaches a container from a network.
func (s *Service) Disconnect(ctx context.Context, networkID, containerID string, force bool) error {
	return s.rt.DisconnectContainerFromNetwork(ctx, networkID, containerID, force)
}

func formatNetwork(n runtime.NetworkSummary) Network {
	shortID := strings.TrimPrefix(n.ID, "sha256:")
	if len(shortID) > 12 {
		shortID = shortID[:12]
	}

	var subnet, gateway string
	if len(n.IPAM.Config) > 0 {
		subnet = n.IPAM.Config[0].Subnet
		gateway = n.IPAM.Config[0].Gateway
	}

	return Network{
		ID:         n.ID,
		ShortID:    shortID,
		Name:       n.Name,
		Driver:     n.Driver,
		Scope:      n.Scope,
		Internal:   n.Internal,
		Attachable: n.Attachable,
		Subnet:     subnet,
		Gateway:    gateway,
		Containers: n.Containers,
		Labels:     n.Labels,
	}
}
