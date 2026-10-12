package docker

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/netip"
	"strings"

	"dockit/internal/runtime"
	"github.com/moby/moby/api/pkg/stdcopy"
	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/api/types/network"
	"github.com/moby/moby/client"
)

// ListContainers returns summary information for containers matching the given options.
func (c *Client) ListContainers(ctx context.Context, opts ...runtime.ContainerListOptions) ([]runtime.ContainerSummary, error) {
	listOpts := client.ContainerListOptions{All: true}
	if len(opts) > 0 {
		listOpts.All = opts[0].All
		listOpts.Limit = opts[0].Limit
	}

	result, err := c.api.ContainerList(ctx, listOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	summaries := make([]runtime.ContainerSummary, 0, len(result.Items))
	for _, item := range result.Items {
		ports := make([]runtime.Port, 0, len(item.Ports))
		for _, p := range item.Ports {
			ipStr := ""
			if p.IP.IsValid() {
				ipStr = p.IP.String()
			}
			ports = append(ports, runtime.Port{
				IP:          ipStr,
				PrivatePort: p.PrivatePort,
				PublicPort:  p.PublicPort,
				Type:        p.Type,
			})
		}

		summaries = append(summaries, runtime.ContainerSummary{
			ID:      item.ID,
			Names:   item.Names,
			Image:   item.Image,
			ImageID: item.ImageID,
			Command: item.Command,
			Created: item.Created,
			State:   string(item.State),
			Status:  item.Status,
			Ports:   ports,
			Labels:  item.Labels,
		})
	}

	return summaries, nil
}

// GetContainer returns a single container summary matching the ID or prefix.
func (c *Client) GetContainer(ctx context.Context, containerID string) (*runtime.ContainerSummary, error) {
	containers, err := c.ListContainers(ctx, runtime.ContainerListOptions{All: true})
	if err != nil {
		return nil, err
	}

	trimmed := strings.TrimPrefix(containerID, "/")
	for i := range containers {
		if strings.HasPrefix(containers[i].ID, containerID) {
			return &containers[i], nil
		}
		for _, name := range containers[i].Names {
			if strings.TrimPrefix(name, "/") == trimmed {
				return &containers[i], nil
			}
		}
	}

	return nil, fmt.Errorf("container %q not found", containerID)
}

// InspectContainer returns full low-level details for a specific container.
func (c *Client) InspectContainer(ctx context.Context, containerID string) (*runtime.ContainerInspect, error) {
	res, err := c.api.ContainerInspect(ctx, containerID, client.ContainerInspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container %q: %w", containerID, err)
	}

	insp := res.Container

	var state runtime.ContainerState
	if insp.State != nil {
		state = runtime.ContainerState{
			Status:     string(insp.State.Status),
			Running:    insp.State.Running,
			Paused:     insp.State.Paused,
			Restarting: insp.State.Restarting,
			OOMKilled:  insp.State.OOMKilled,
			Dead:       insp.State.Dead,
			Pid:        insp.State.Pid,
			ExitCode:   insp.State.ExitCode,
			Error:      insp.State.Error,
			StartedAt:  insp.State.StartedAt,
			FinishedAt: insp.State.FinishedAt,
		}
	}

	var ports []runtime.Port
	if insp.NetworkSettings != nil && insp.NetworkSettings.Ports != nil {
		for portProto, bindings := range insp.NetworkSettings.Ports {
			privatePort := portProto.Num()
			proto := string(portProto.Proto())
			if len(bindings) == 0 {
				ports = append(ports, runtime.Port{
					PrivatePort: privatePort,
					Type:        proto,
				})
			} else {
				for _, b := range bindings {
					var pubPort uint16
					fmt.Sscanf(b.HostPort, "%d", &pubPort)
					hostIP := ""
					if b.HostIP.IsValid() {
						hostIP = b.HostIP.String()
					}
					ports = append(ports, runtime.Port{
						IP:          hostIP,
						PrivatePort: privatePort,
						PublicPort:  pubPort,
						Type:        proto,
					})
				}
			}
		}
	}

	mounts := make([]runtime.MountPoint, 0, len(insp.Mounts))
	for _, m := range insp.Mounts {
		mounts = append(mounts, runtime.MountPoint{
			Type:        string(m.Type),
			Name:        m.Name,
			Source:      m.Source,
			Destination: m.Destination,
			Driver:      m.Driver,
			Mode:        m.Mode,
			RW:          m.RW,
		})
	}

	netSettings := runtime.NetworkSettings{
		Networks: make(map[string]string),
	}
	if insp.NetworkSettings != nil {
		for netName, endpoint := range insp.NetworkSettings.Networks {
			if endpoint != nil {
				if netSettings.IPAddress == "" && endpoint.IPAddress.IsValid() {
					netSettings.IPAddress = endpoint.IPAddress.String()
					netSettings.Gateway = endpoint.Gateway.String()
					netSettings.MacAddress = endpoint.MacAddress.String()
				}
				if endpoint.IPAddress.IsValid() {
					netSettings.Networks[netName] = endpoint.IPAddress.String()
				}
			}
		}
	}

	var cmd string
	var args []string
	var env []string
	var labels map[string]string
	if insp.Config != nil {
		if len(insp.Config.Cmd) > 0 {
			cmd = strings.Join(insp.Config.Cmd, " ")
		}
		args = insp.Args
		env = insp.Config.Env
		labels = insp.Config.Labels
	}

	return &runtime.ContainerInspect{
		ID:           insp.ID,
		Name:         strings.TrimPrefix(insp.Name, "/"),
		Image:        insp.Image,
		ImageID:      insp.Image,
		Created:      insp.Created,
		State:        state,
		Command:      cmd,
		Args:         args,
		Env:          env,
		Labels:       labels,
		Ports:        ports,
		Mounts:       mounts,
		Network:      netSettings,
		RestartCount: insp.RestartCount,
		Platform:     insp.Platform,
	}, nil
}

// CreateContainer creates a container according to the options provided.
func (c *Client) CreateContainer(ctx context.Context, opts runtime.ContainerCreateOptions) (string, error) {
	config := &container.Config{
		Image:  opts.Image,
		Cmd:    opts.Command,
		Env:    opts.Env,
		Labels: opts.Labels,
	}

	hostConfig := &container.HostConfig{
		Binds: opts.Volumes,
	}

	if opts.RestartPolicy != "" {
		hostConfig.RestartPolicy = container.RestartPolicy{
			Name: container.RestartPolicyMode(opts.RestartPolicy),
		}
	}

	if len(opts.PortMappings) > 0 {
		config.ExposedPorts = make(network.PortSet)
		hostConfig.PortBindings = make(network.PortMap)
		for _, spec := range opts.PortMappings {
			parts := strings.Split(spec, ":")
			var hostIPStr, hostPortStr, containerPortStr string
			switch len(parts) {
			case 1:
				containerPortStr = parts[0]
			case 2:
				hostPortStr = parts[0]
				containerPortStr = parts[1]
			case 3:
				hostIPStr = parts[0]
				hostPortStr = parts[1]
				containerPortStr = parts[2]
			}
			if !strings.Contains(containerPortStr, "/") {
				containerPortStr += "/tcp"
			}
			p, err := network.ParsePort(containerPortStr)
			if err != nil {
				return "", fmt.Errorf("failed to parse port %q: %w", containerPortStr, err)
			}
			config.ExposedPorts[p] = struct{}{}
			if hostPortStr != "" {
				var hostIP netip.Addr
				if hostIPStr != "" {
					hostIP, _ = netip.ParseAddr(hostIPStr)
				}
				hostConfig.PortBindings[p] = append(hostConfig.PortBindings[p], network.PortBinding{
					HostIP:   hostIP,
					HostPort: hostPortStr,
				})
			}
		}
	} else if len(opts.Ports) > 0 {
		config.ExposedPorts = make(network.PortSet)
		hostConfig.PortBindings = make(network.PortMap)
		for portStr, bindings := range opts.Ports {
			if !strings.Contains(portStr, "/") {
				portStr += "/tcp"
			}
			p, err := network.ParsePort(portStr)
			if err != nil {
				return "", fmt.Errorf("failed to parse port %q: %w", portStr, err)
			}
			config.ExposedPorts[p] = struct{}{}
			for _, b := range bindings {
				var hostIP netip.Addr
				if b.HostIP != "" {
					hostIP, _ = netip.ParseAddr(b.HostIP)
				}
				hostConfig.PortBindings[p] = append(hostConfig.PortBindings[p], network.PortBinding{
					HostIP:   hostIP,
					HostPort: b.HostPort,
				})
			}
		}
	}

	var networkingConfig *network.NetworkingConfig
	if len(opts.Networks) > 0 {
		networkingConfig = &network.NetworkingConfig{
			EndpointsConfig: make(map[string]*network.EndpointSettings),
		}
		for _, netName := range opts.Networks {
			networkingConfig.EndpointsConfig[netName] = &network.EndpointSettings{}
		}
	}

	result, err := c.api.ContainerCreate(ctx, client.ContainerCreateOptions{
		Config:           config,
		HostConfig:       hostConfig,
		NetworkingConfig: networkingConfig,
		Name:             opts.Name,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create container: %w", err)
	}

	return result.ID, nil
}

// StartContainer begins execution of a stopped container.
func (c *Client) StartContainer(ctx context.Context, containerID string) error {
	if _, err := c.api.ContainerStart(ctx, containerID, client.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("failed to start container %q: %w", containerID, err)
	}
	return nil
}

// StopContainer stops a running container within the optional timeout.
func (c *Client) StopContainer(ctx context.Context, containerID string, timeout *int) error {
	if _, err := c.api.ContainerStop(ctx, containerID, client.ContainerStopOptions{Timeout: timeout}); err != nil {
		return fmt.Errorf("failed to stop container %q: %w", containerID, err)
	}
	return nil
}

// RestartContainer restarts a container within the optional timeout.
func (c *Client) RestartContainer(ctx context.Context, containerID string, timeout *int) error {
	if _, err := c.api.ContainerRestart(ctx, containerID, client.ContainerRestartOptions{Timeout: timeout}); err != nil {
		return fmt.Errorf("failed to restart container %q: %w", containerID, err)
	}
	return nil
}

// PauseContainer pauses the processes within a running container.
func (c *Client) PauseContainer(ctx context.Context, containerID string) error {
	if _, err := c.api.ContainerPause(ctx, containerID, client.ContainerPauseOptions{}); err != nil {
		return fmt.Errorf("failed to pause container %q: %w", containerID, err)
	}
	return nil
}

// UnpauseContainer resumes execution of a paused container.
func (c *Client) UnpauseContainer(ctx context.Context, containerID string) error {
	if _, err := c.api.ContainerUnpause(ctx, containerID, client.ContainerUnpauseOptions{}); err != nil {
		return fmt.Errorf("failed to unpause container %q: %w", containerID, err)
	}
	return nil
}

// RemoveContainer deletes a container.
func (c *Client) RemoveContainer(ctx context.Context, containerID string, opts runtime.ContainerRemoveOptions) error {
	_, err := c.api.ContainerRemove(ctx, containerID, client.ContainerRemoveOptions{
		Force:         opts.Force,
		RemoveVolumes: opts.RemoveVolumes,
	})
	if err != nil {
		return fmt.Errorf("failed to remove container %q: %w", containerID, err)
	}
	return nil
}

// GetContainerLogs returns logs for a container as a string.
func (c *Client) GetContainerLogs(ctx context.Context, containerID string) (string, error) {
	logs, err := c.api.ContainerLogs(ctx, containerID, client.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: false,
		Follow:     false,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get logs for container %q: %w", containerID, err)
	}
	defer logs.Close()

	// Check if container has TTY enabled
	isTTY := false
	inspect, err := c.api.ContainerInspect(ctx, containerID, client.ContainerInspectOptions{})
	if err == nil && inspect.Container.Config != nil && inspect.Container.Config.Tty {
		isTTY = true
	}

	var logOutput bytes.Buffer
	if isTTY {
		if _, err := io.Copy(&logOutput, logs); err != nil {
			return "", fmt.Errorf("failed to read logs for container %q: %w", containerID, err)
		}
	} else {
		if _, err := stdcopy.StdCopy(&logOutput, &logOutput, logs); err != nil {
			// In case stdcopy errors (e.g. malformed stream), fallback to plain copy
			logs2, err2 := c.api.ContainerLogs(ctx, containerID, client.ContainerLogsOptions{
				ShowStdout: true,
				ShowStderr: true,
			})
			if err2 == nil {
				defer logs2.Close()
				logOutput.Reset()
				_, _ = io.Copy(&logOutput, logs2)
			}
		}
	}

	return logOutput.String(), nil
}

// GetContainerLogsStream returns an io.ReadCloser streaming logs for a container.
func (c *Client) GetContainerLogsStream(ctx context.Context, containerID string, opts runtime.ContainerLogsOptions) (io.ReadCloser, error) {
	logs, err := c.api.ContainerLogs(ctx, containerID, client.ContainerLogsOptions{
		ShowStdout: opts.ShowStdout,
		ShowStderr: opts.ShowStderr,
		Timestamps: opts.Timestamps,
		Follow:     opts.Follow,
		Tail:       opts.Tail,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to stream logs for container %q: %w", containerID, err)
	}
	return logs, nil
}

// GetContainerStats returns an io.ReadCloser with live resource usage statistics for a container.
func (c *Client) GetContainerStats(ctx context.Context, containerID string, stream bool) (io.ReadCloser, error) {
	res, err := c.api.ContainerStats(ctx, containerID, client.ContainerStatsOptions{
		Stream: stream,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get stats for container %q: %w", containerID, err)
	}
	return res.Body, nil
}
