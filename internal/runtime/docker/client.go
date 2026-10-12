package docker

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/client"
)

type Client struct {
	api *client.Client
}

func NewClient(ctx context.Context) (*Client, error) {
	api, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)
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

func (c *Client) Close() error {
	return c.api.Close()
}

func (c *Client) ListContainers(ctx context.Context) ([]container.Summary, error) {
	result, err := c.api.ContainerList(ctx, client.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	return result.Items, nil
}

func (c *Client) GetContainer(ctx context.Context, containerID string) (*container.Summary, error) {
	result, err := c.api.ContainerList(ctx, client.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}
	for i := range result.Items {
		if strings.HasPrefix(result.Items[i].ID, containerID) {
			return &result.Items[i], nil
		}
	}
	return nil, fmt.Errorf("container %q not found", containerID)
}

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

	var logOutput bytes.Buffer
	if _, err := io.Copy(&logOutput, logs); err != nil {
		return "", fmt.Errorf("failed to read logs for container %q: %w", containerID, err)
	}

	return logOutput.String(), nil
}
