package docker

import (
    "context"
    "fmt"

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
		return nil, fmt.Errorf("Failed to create Docker client: %w", err)
	}

	c := &Client{api: api}

	if _ , err := api.Ping(ctx); err != nil {
		api.Close()
		return nil, fmt.Errorf("Failed to ping Docker daemon: %w", err)
	}

	return c, nil
}

func (c *Client) Close() error {
	return c.api.Close()
}

func (c *Client) ListContainers(ctx context.Context) ([]container.Containers, error){
	result , err := c.api.ContainerList(ctx, client.ContainerListOptions{All: true})
	
	if err != nil{
		return nil, fmt.Errorf("Failed to list containers: %w", err)
	}

	return result.Items, nil
}