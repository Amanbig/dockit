package docker

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"dockit/internal/runtime/engine"
	"github.com/moby/moby/client"
)

var _ runtime.Runtime = (*Client)(nil)

// Client implements runtime.Runtime for Docker by wrapping the shared container Engine.
type Client struct {
	*engine.Engine
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

	c := &Client{
		Engine: engine.New(api, runtime.TypeDocker),
	}

	if err := c.Ping(ctx); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("failed to ping Docker daemon: %w", err)
	}

	return c, nil
}
