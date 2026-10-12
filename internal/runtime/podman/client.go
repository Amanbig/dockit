package podman

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strconv"

	"dockit/internal/runtime"
	"dockit/internal/runtime/engine"
	"github.com/moby/moby/client"
)

var _ runtime.Runtime = (*Client)(nil)

// Client implements runtime.Runtime for Podman by wrapping the shared container Engine.
type Client struct {
	*engine.Engine
}

// FindSocket searches standard Podman socket locations across OS platforms.
func FindSocket() string {
	if host := os.Getenv("CONTAINER_HOST"); host != "" {
		return host
	}
	if host := os.Getenv("DOCKER_HOST"); host != "" {
		return host
	}

	switch goruntime.GOOS {
	case "linux":
		// Rootless socket: /run/user/<uid>/podman/podman.sock
		if xdg := os.Getenv("XDG_RUNTIME_DIR"); xdg != "" {
			sock := filepath.Join(xdg, "podman", "podman.sock")
			if _, err := os.Stat(sock); err == nil {
				return "unix://" + sock
			}
		}
		uid := strconv.Itoa(os.Getuid())
		userSock := filepath.Join("/run/user", uid, "podman", "podman.sock")
		if _, err := os.Stat(userSock); err == nil {
			return "unix://" + userSock
		}
		// Rootful socket: /run/podman/podman.sock
		if _, err := os.Stat("/run/podman/podman.sock"); err == nil {
			return "unix:///run/podman/podman.sock"
		}

	case "darwin":
		home, err := os.UserHomeDir()
		if err == nil {
			candidates := []string{
				filepath.Join(home, ".local/share/containers/podman/machine/podman.sock"),
				filepath.Join(home, ".local/share/containers/podman/machine/qemu/podman.sock"),
				filepath.Join(home, ".local/share/containers/podman/machine/applehv/podman.sock"),
			}
			for _, c := range candidates {
				if _, err := os.Stat(c); err == nil {
					return "unix://" + c
				}
			}
		}

	case "windows":
		return "npipe:////./pipe/podman-machine-default"
	}

	return ""
}

// NewClient initializes a new Podman client connecting via its Docker-compatible socket.
func NewClient(ctx context.Context) (*Client, error) {
	sock := FindSocket()
	if sock == "" {
		return nil, fmt.Errorf("podman socket not found (podman service is not running or not installed)")
	}

	opts := []client.Opt{
		client.WithHost(sock),
		client.WithAPIVersionNegotiation(),
	}

	return NewClientWithOpts(ctx, opts...)
}

// NewClientWithOpts creates a new Podman client with customizable options.
func NewClientWithOpts(ctx context.Context, opts ...client.Opt) (*Client, error) {
	api, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create Podman client: %w", err)
	}

	c := &Client{
		Engine: engine.New(api, runtime.TypePodman),
	}

	if err := c.Ping(ctx); err != nil {
		_ = c.Close()
		return nil, fmt.Errorf("failed to ping Podman daemon: %w", err)
	}

	return c, nil
}
