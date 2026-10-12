package engine

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

var _ runtime.Runtime = (*Engine)(nil)

// Engine implements runtime.Runtime methods on top of a Docker-compatible API client.
type Engine struct {
	api         *client.Client
	runtimeType runtime.Type
}

// New creates an Engine instance for a given API client and runtime type.
func New(api *client.Client, runtimeType runtime.Type) *Engine {
	return &Engine{
		api:         api,
		runtimeType: runtimeType,
	}
}

// Type returns the active runtime type (docker or podman).
func (e *Engine) Type() runtime.Type {
	return e.runtimeType
}

// API returns the underlying moby client.
func (e *Engine) API() *client.Client {
	return e.api
}

// Close closes the underlying API connection.
func (e *Engine) Close() error {
	return e.api.Close()
}

// Ping checks if the container daemon is alive.
func (e *Engine) Ping(ctx context.Context) error {
	if _, err := e.api.Ping(ctx, client.PingOptions{}); err != nil {
		return fmt.Errorf("%s ping failed: %w", e.runtimeType, err)
	}
	return nil
}

// Info retrieves system-wide daemon information.
func (e *Engine) Info(ctx context.Context) (*runtime.SystemInfo, error) {
	result, err := e.api.Info(ctx, client.InfoOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get %s info: %w", e.runtimeType, err)
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

// Version retrieves daemon version details.
func (e *Engine) Version(ctx context.Context) (*runtime.SystemVersion, error) {
	result, err := e.api.ServerVersion(ctx, client.ServerVersionOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get %s version: %w", e.runtimeType, err)
	}

	return &runtime.SystemVersion{
		Version:       result.Version,
		APIVersion:    result.APIVersion,
		MinAPIVersion: result.MinAPIVersion,
		Os:            result.Os,
		Arch:          result.Arch,
	}, nil
}
