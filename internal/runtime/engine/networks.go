package engine

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

// ListNetworks lists all networks on the host.
func (e *Engine) ListNetworks(ctx context.Context) ([]runtime.NetworkSummary, error) {
	result, err := e.api.NetworkList(ctx, client.NetworkListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	networks := make([]runtime.NetworkSummary, 0, len(result.Items))
	for _, item := range result.Items {
		var ipamConfigs []runtime.NetworkIPAMConfig
		for _, cfg := range item.IPAM.Config {
			var subnet, gateway string
			if cfg.Subnet.IsValid() {
				subnet = cfg.Subnet.String()
			}
			if cfg.Gateway.IsValid() {
				gateway = cfg.Gateway.String()
			}
			ipamConfigs = append(ipamConfigs, runtime.NetworkIPAMConfig{
				Subnet:  subnet,
				Gateway: gateway,
			})
		}

		networks = append(networks, runtime.NetworkSummary{
			ID:         item.ID,
			Name:       item.Name,
			Driver:     item.Driver,
			Scope:      item.Scope,
			Internal:   item.Internal,
			Attachable: item.Attachable,
			Ingress:    item.Ingress,
			IPAM: runtime.NetworkIPAM{
				Driver: item.IPAM.Driver,
				Config: ipamConfigs,
			},
			Labels: item.Labels,
		})
	}

	return networks, nil
}

// CreateNetwork creates a new network.
func (e *Engine) CreateNetwork(ctx context.Context, opts runtime.NetworkCreateOptions) (*runtime.NetworkSummary, error) {
	res, err := e.api.NetworkCreate(ctx, opts.Name, client.NetworkCreateOptions{
		Driver:     opts.Driver,
		Internal:   opts.Internal,
		Attachable: opts.Attachable,
		Labels:     opts.Labels,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create network %q: %w", opts.Name, err)
	}

	return e.InspectNetwork(ctx, res.ID)
}

// InspectNetwork retrieves inspection details for a specific network.
func (e *Engine) InspectNetwork(ctx context.Context, networkID string) (*runtime.NetworkSummary, error) {
	res, err := e.api.NetworkInspect(ctx, networkID, client.NetworkInspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to inspect network %q: %w", networkID, err)
	}

	net := res.Network
	var ipamConfigs []runtime.NetworkIPAMConfig
	for _, cfg := range net.IPAM.Config {
		var subnet, gateway string
		if cfg.Subnet.IsValid() {
			subnet = cfg.Subnet.String()
		}
		if cfg.Gateway.IsValid() {
			gateway = cfg.Gateway.String()
		}
		ipamConfigs = append(ipamConfigs, runtime.NetworkIPAMConfig{
			Subnet:  subnet,
			Gateway: gateway,
		})
	}

	containers := make(map[string]string)
	for contID, endpoint := range net.Containers {
		if endpoint.IPv4Address.IsValid() {
			containers[contID] = endpoint.IPv4Address.String()
		} else {
			containers[contID] = endpoint.Name
		}
	}

	return &runtime.NetworkSummary{
		ID:         net.ID,
		Name:       net.Name,
		Driver:     net.Driver,
		Scope:      net.Scope,
		Internal:   net.Internal,
		Attachable: net.Attachable,
		Ingress:    net.Ingress,
		IPAM: runtime.NetworkIPAM{
			Driver: net.IPAM.Driver,
			Config: ipamConfigs,
		},
		Containers: containers,
		Labels:     net.Labels,
	}, nil
}

// RemoveNetwork deletes an existing network.
func (e *Engine) RemoveNetwork(ctx context.Context, networkID string) error {
	if _, err := e.api.NetworkRemove(ctx, networkID, client.NetworkRemoveOptions{}); err != nil {
		return fmt.Errorf("failed to remove network %q: %w", networkID, err)
	}
	return nil
}

// ConnectContainerToNetwork attaches a container to a network.
func (e *Engine) ConnectContainerToNetwork(ctx context.Context, networkID string, containerID string) error {
	if _, err := e.api.NetworkConnect(ctx, networkID, client.NetworkConnectOptions{Container: containerID}); err != nil {
		return fmt.Errorf("failed to connect container %q to network %q: %w", containerID, networkID, err)
	}
	return nil
}

// DisconnectContainerFromNetwork detaches a container from a network.
func (e *Engine) DisconnectContainerFromNetwork(ctx context.Context, networkID string, containerID string, force bool) error {
	if _, err := e.api.NetworkDisconnect(ctx, networkID, client.NetworkDisconnectOptions{Container: containerID, Force: force}); err != nil {
		return fmt.Errorf("failed to disconnect container %q from network %q: %w", containerID, networkID, err)
	}
	return nil
}
