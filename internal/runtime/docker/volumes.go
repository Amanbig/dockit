package docker

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

// ListVolumes lists volumes on the Docker host.
func (c *Client) ListVolumes(ctx context.Context) ([]runtime.VolumeSummary, error) {
	result, err := c.api.VolumeList(ctx, client.VolumeListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}

	volumes := make([]runtime.VolumeSummary, 0, len(result.Items))
	for _, v := range result.Items {
		var size int64
		if v.UsageData != nil {
			size = v.UsageData.Size
		}
		volumes = append(volumes, runtime.VolumeSummary{
			Name:       v.Name,
			Driver:     v.Driver,
			Mountpoint: v.Mountpoint,
			CreatedAt:  v.CreatedAt,
			Labels:     v.Labels,
			Scope:      v.Scope,
			Size:       size,
		})
	}

	return volumes, nil
}

// CreateVolume creates a new volume.
func (c *Client) CreateVolume(ctx context.Context, opts runtime.VolumeCreateOptions) (*runtime.VolumeSummary, error) {
	res, err := c.api.VolumeCreate(ctx, client.VolumeCreateOptions{
		Name:       opts.Name,
		Driver:     opts.Driver,
		DriverOpts: opts.DriverOpts,
		Labels:     opts.Labels,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}

	v := res.Volume
	var size int64
	if v.UsageData != nil {
		size = v.UsageData.Size
	}

	return &runtime.VolumeSummary{
		Name:       v.Name,
		Driver:     v.Driver,
		Mountpoint: v.Mountpoint,
		CreatedAt:  v.CreatedAt,
		Labels:     v.Labels,
		Scope:      v.Scope,
		Size:       size,
	}, nil
}

// InspectVolume inspects a specific volume.
func (c *Client) InspectVolume(ctx context.Context, volumeID string) (*runtime.VolumeSummary, error) {
	res, err := c.api.VolumeInspect(ctx, volumeID, client.VolumeInspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to inspect volume %q: %w", volumeID, err)
	}

	v := res.Volume
	var size int64
	if v.UsageData != nil {
		size = v.UsageData.Size
	}

	return &runtime.VolumeSummary{
		Name:       v.Name,
		Driver:     v.Driver,
		Mountpoint: v.Mountpoint,
		CreatedAt:  v.CreatedAt,
		Labels:     v.Labels,
		Scope:      v.Scope,
		Size:       size,
	}, nil
}

// RemoveVolume deletes a volume.
func (c *Client) RemoveVolume(ctx context.Context, volumeID string, force bool) error {
	if _, err := c.api.VolumeRemove(ctx, volumeID, client.VolumeRemoveOptions{Force: force}); err != nil {
		return fmt.Errorf("failed to remove volume %q: %w", volumeID, err)
	}
	return nil
}

// PruneVolumes removes unused volumes.
func (c *Client) PruneVolumes(ctx context.Context) error {
	if _, err := c.api.VolumePrune(ctx, client.VolumePruneOptions{}); err != nil {
		return fmt.Errorf("failed to prune volumes: %w", err)
	}
	return nil
}
