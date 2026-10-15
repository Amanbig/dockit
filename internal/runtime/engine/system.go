package engine

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
	"github.com/moby/moby/client"
)

// GetDiskUsage returns the storage breakdown and reclaimable space for the active engine.
func (e *Engine) GetDiskUsage(ctx context.Context) (*runtime.DiskUsage, error) {
	result, err := e.api.DiskUsage(ctx, client.DiskUsageOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get disk usage from %s: %w", e.runtimeType, err)
	}

	usage := &runtime.DiskUsage{
		Images: runtime.CategoryDiskUsage{
			TotalCount:  result.Images.TotalCount,
			ActiveCount: result.Images.ActiveCount,
			TotalSize:   result.Images.TotalSize,
			Reclaimable: result.Images.Reclaimable,
		},
		Containers: runtime.CategoryDiskUsage{
			TotalCount:  result.Containers.TotalCount,
			ActiveCount: result.Containers.ActiveCount,
			TotalSize:   result.Containers.TotalSize,
			Reclaimable: result.Containers.Reclaimable,
		},
		Volumes: runtime.CategoryDiskUsage{
			TotalCount:  result.Volumes.TotalCount,
			ActiveCount: result.Volumes.ActiveCount,
			TotalSize:   result.Volumes.TotalSize,
			Reclaimable: result.Volumes.Reclaimable,
		},
		BuildCache: runtime.CategoryDiskUsage{
			TotalCount:  result.BuildCache.TotalCount,
			ActiveCount: result.BuildCache.ActiveCount,
			TotalSize:   result.BuildCache.TotalSize,
			Reclaimable: result.BuildCache.Reclaimable,
		},
	}

	usage.TotalSpace = usage.Images.TotalSize + usage.Containers.TotalSize + usage.Volumes.TotalSize + usage.BuildCache.TotalSize
	usage.TotalReclaimable = usage.Images.Reclaimable + usage.Containers.Reclaimable + usage.Volumes.Reclaimable + usage.BuildCache.Reclaimable

	return usage, nil
}

// PruneSystem cleans up stopped containers, unused images, volumes, build cache, and networks based on options.
func (e *Engine) PruneSystem(ctx context.Context, opts runtime.PruneOptions) (*runtime.PruneResult, error) {
	res := &runtime.PruneResult{}

	// 1. Prune Containers
	if opts.Containers {
		cRes, err := e.api.ContainerPrune(ctx, client.ContainerPruneOptions{})
		if err == nil {
			res.ContainersDeleted = cRes.Report.ContainersDeleted
			res.SpaceReclaimed += int64(cRes.Report.SpaceReclaimed)
		}
	}

	// 2. Prune Images
	filters := client.Filters{}
	if opts.AllImages {
		filters.Add("dangling", "false")
	}
	iRes, err := e.api.ImagePrune(ctx, client.ImagePruneOptions{Filters: filters})
	if err == nil {
		for _, item := range iRes.Report.ImagesDeleted {
			if item.Deleted != "" {
				res.ImagesDeleted = append(res.ImagesDeleted, item.Deleted)
			} else if item.Untagged != "" {
				res.ImagesDeleted = append(res.ImagesDeleted, item.Untagged)
			}
		}
		res.SpaceReclaimed += int64(iRes.Report.SpaceReclaimed)
	}

	// 3. Prune Volumes
	if opts.Volumes {
		vRes, err := e.api.VolumePrune(ctx, client.VolumePruneOptions{})
		if err == nil {
			res.VolumesDeleted = vRes.Report.VolumesDeleted
			res.SpaceReclaimed += int64(vRes.Report.SpaceReclaimed)
		}
	}

	// 4. Prune Build Cache
	if opts.BuildCache {
		bRes, err := e.api.BuildCachePrune(ctx, client.BuildCachePruneOptions{All: true})
		if err == nil {
			res.BuildCacheDeleted = bRes.Report.CachesDeleted
			res.SpaceReclaimed += int64(bRes.Report.SpaceReclaimed)
		}
	}

	// 5. Prune Networks
	if opts.Networks {
		nRes, err := e.api.NetworkPrune(ctx, client.NetworkPruneOptions{})
		if err == nil {
			res.NetworksDeleted = nRes.Report.NetworksDeleted
		}
	}

	return res, nil
}
