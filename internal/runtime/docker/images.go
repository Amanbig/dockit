package docker

import (
	"context"
	"fmt"
	"io"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

// ListImages lists container images on the Docker host.
func (c *Client) ListImages(ctx context.Context, opts ...runtime.ImageListOptions) ([]runtime.ImageSummary, error) {
	listOpts := client.ImageListOptions{All: false}
	if len(opts) > 0 {
		listOpts.All = opts[0].All
	}

	result, err := c.api.ImageList(ctx, listOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	images := make([]runtime.ImageSummary, 0, len(result.Items))
	for _, item := range result.Items {
		images = append(images, runtime.ImageSummary{
			ID:          item.ID,
			ParentID:    item.ParentID,
			RepoTags:    item.RepoTags,
			RepoDigests: item.RepoDigests,
			Created:     item.Created,
			Size:        item.Size,
			SharedSize:  item.SharedSize,
			Containers:  item.Containers,
			Labels:      item.Labels,
		})
	}

	return images, nil
}

// InspectImage retrieves low-level inspection information about a Docker image.
func (c *Client) InspectImage(ctx context.Context, imageID string) (*runtime.ImageInspect, error) {
	res, err := c.api.ImageInspect(ctx, imageID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect image %q: %w", imageID, err)
	}

	insp := res.InspectResponse
	var env []string
	var cmd []string
	var workingDir string
	var entrypoint []string
	var labels map[string]string

	if insp.Config != nil {
		env = insp.Config.Env
		cmd = insp.Config.Cmd
		workingDir = insp.Config.WorkingDir
		entrypoint = insp.Config.Entrypoint
		labels = insp.Config.Labels
	}

	return &runtime.ImageInspect{
		ID:           insp.ID,
		RepoTags:     insp.RepoTags,
		RepoDigests:  insp.RepoDigests,
		Comment:      insp.Comment,
		Created:      insp.Created,
		Author:       insp.Author,
		Architecture: insp.Architecture,
		OS:           insp.Os,
		Size:         insp.Size,
		VirtualSize:  insp.Size,
		Labels:       labels,
		Env:          env,
		Cmd:          cmd,
		WorkingDir:   workingDir,
		Entrypoint:   entrypoint,
	}, nil
}

// PullImage downloads an image from a remote registry and streams the progress response.
func (c *Client) PullImage(ctx context.Context, ref string) (io.ReadCloser, error) {
	response, err := c.api.ImagePull(ctx, ref, client.ImagePullOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to pull image %q: %w", ref, err)
	}
	return response, nil
}

// TagImage adds a tag to an existing image.
func (c *Client) TagImage(ctx context.Context, source string, target string) error {
	if _, err := c.api.ImageTag(ctx, client.ImageTagOptions{Source: source, Target: target}); err != nil {
		return fmt.Errorf("failed to tag image %q -> %q: %w", source, target, err)
	}
	return nil
}

// RemoveImage removes an image from Docker storage.
func (c *Client) RemoveImage(ctx context.Context, imageID string, opts runtime.ImageRemoveOptions) ([]runtime.ImageDeleteResult, error) {
	result, err := c.api.ImageRemove(ctx, imageID, client.ImageRemoveOptions{
		Force:         opts.Force,
		PruneChildren: opts.PruneChildren,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to remove image %q: %w", imageID, err)
	}

	items := make([]runtime.ImageDeleteResult, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, runtime.ImageDeleteResult{
			Untagged: item.Untagged,
			Deleted:  item.Deleted,
		})
	}

	return items, nil
}
