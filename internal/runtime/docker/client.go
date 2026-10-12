package docker

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

var _ runtime.Runtime = (*Client)(nil)

// Client implements runtime.Runtime for the Docker daemon.
type Client struct {
	api *client.Client
}

// NewClient initializes a new Docker client connected to the local Docker daemon.
func NewClient(ctx context.Context) (*Client, error) {
	return NewClientWithOpts(ctx,
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
}

// NewClientWithOpts creates a new Docker client with customizable options.
func NewClientWithOpts(ctx context.Context, opts ...client.Opt) (*Client, error) {
	api, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	c := &Client{api: api}

	if _, err := api.Ping(ctx, client.PingOptions{}); err != nil {
		_ = api.Close()
		return nil, fmt.Errorf("failed to ping Docker daemon: %w", err)
	}

	return c, nil
}

// Type returns runtime.TypeDocker.
func (c *Client) Type() runtime.Type {
	return runtime.TypeDocker
}

// Close closes the underlying Docker API client connection.
func (c *Client) Close() error {
	return c.api.Close()
}

// Ping verifies connectivity to the Docker daemon.
func (c *Client) Ping(ctx context.Context) error {
	if _, err := c.api.Ping(ctx, client.PingOptions{}); err != nil {
		return fmt.Errorf("docker ping failed: %w", err)
	}
	return nil
}

// Info retrieves system-wide Docker daemon details.
func (c *Client) Info(ctx context.Context) (*runtime.SystemInfo, error) {
	result, err := c.api.Info(ctx, client.InfoOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get docker info: %w", err)
	}

	info := result.Info
	return &runtime.SystemInfo{
		ID:                info.ID,
		Containers:        info.Containers,
		ContainersRunning: info.ContainersRunning,
		ContainersPaused:  info.ContainersPaused,
		ContainersStopped: info.ContainersStopped,
		Images:            info.Images,
		Driver:            info.Driver,
		MemoryTotal:       info.MemTotal,
		CPUs:              info.NCPU,
		OperatingSystem:   info.OperatingSystem,
		OSType:            info.OSType,
		Architecture:      info.Architecture,
		ServerVersion:     info.ServerVersion,
	}, nil
}

// Version retrieves Docker daemon version information.
func (c *Client) Version(ctx context.Context) (*runtime.SystemVersion, error) {
	result, err := c.api.ServerVersion(ctx, client.ServerVersionOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get docker version: %w", err)
	}

	return &runtime.SystemVersion{
		Version:       result.Version,
		APIVersion:    result.APIVersion,
		MinAPIVersion: result.MinAPIVersion,
		Os:            result.Os,
		Arch:          result.Arch,
	}, nil
}
