package docker

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

// ListNetworks lists all networks on the Docker host.
func (c *Client) ListNetworks(ctx context.Context) ([]runtime.NetworkSummary, error) {
	result, err := c.api.NetworkList(ctx, client.NetworkListOptions{})
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
func (c *Client) CreateNetwork(ctx context.Context, opts runtime.NetworkCreateOptions) (*runtime.NetworkSummary, error) {
	res, err := c.api.NetworkCreate(ctx, opts.Name, client.NetworkCreateOptions{
		Driver:     opts.Driver,
		Internal:   opts.Internal,
		Attachable: opts.Attachable,
		Labels:     opts.Labels,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create network %q: %w", opts.Name, err)
	}

	return c.InspectNetwork(ctx, res.ID)
}

// InspectNetwork retrieves inspection details for a specific network.
func (c *Client) InspectNetwork(ctx context.Context, networkID string) (*runtime.NetworkSummary, error) {
	res, err := c.api.NetworkInspect(ctx, networkID, client.NetworkInspectOptions{})
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
		if endpoint.IPv4Address != "" {
			containers[contID] = endpoint.IPv4Address
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
func (c *Client) RemoveNetwork(ctx context.Context, networkID string) error {
	if _, err := c.api.NetworkRemove(ctx, networkID, client.NetworkRemoveOptions{}); err != nil {
		return fmt.Errorf("failed to remove network %q: %w", networkID, err)
	}
	return nil
}

// ConnectContainerToNetwork attaches a container to a network.
func (c *Client) ConnectContainerToNetwork(ctx context.Context, networkID string, containerID string) error {
	if _, err := c.api.NetworkConnect(ctx, networkID, client.NetworkConnectOptions{Container: containerID}); err != nil {
		return fmt.Errorf("failed to connect container %q to network %q: %w", containerID, networkID, err)
	}
	return nil
}

// DisconnectContainerFromNetwork detaches a container from a network.
func (c *Client) DisconnectContainerFromNetwork(ctx context.Context, networkID string, containerID string, force bool) error {
	if _, err := c.api.NetworkDisconnect(ctx, networkID, client.NetworkDisconnectOptions{Container: containerID, Force: force}); err != nil {
		return fmt.Errorf("failed to disconnect container %q from network %q: %w", containerID, networkID, err)
	}
	return nil
}
