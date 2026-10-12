package volumes

import (
	"context"
	"fmt"

	"dockit/internal/runtime"
)

// Service provides high-level persistent volume operations backed by a container runtime.
type Service struct {
	rt runtime.Runtime
}

// NewService creates a new volumes Service using the provided runtime.
func NewService(rt runtime.Runtime) *Service {
	return &Service{rt: rt}
}

// Runtime returns the underlying runtime instance.
func (s *Service) Runtime() runtime.Runtime {
	return s.rt
}

// List returns all volumes formatted for the UI.
func (s *Service) List(ctx context.Context) ([]Volume, error) {
	summaries, err := s.rt.ListVolumes(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}

	result := make([]Volume, 0, len(summaries))
	for _, v := range summaries {
		result = append(result, formatVolume(v))
	}
	return result, nil
}

// Create creates a new volume with the specified options.
func (s *Service) Create(ctx context.Context, opts runtime.VolumeCreateOptions) (*Volume, error) {
	summary, err := s.rt.CreateVolume(ctx, opts)
	if err != nil {
		return nil, err
	}
	v := formatVolume(*summary)
	return &v, nil
}

// Inspect returns inspection details for a specific volume.
func (s *Service) Inspect(ctx context.Context, name string) (*Volume, error) {
	summary, err := s.rt.InspectVolume(ctx, name)
	if err != nil {
		return nil, err
	}
	v := formatVolume(*summary)
	return &v, nil
}

// Remove deletes a volume.
func (s *Service) Remove(ctx context.Context, name string, force bool) error {
	return s.rt.RemoveVolume(ctx, name, force)
}

// Prune removes all unused volumes.
func (s *Service) Prune(ctx context.Context) error {
	return s.rt.PruneVolumes(ctx)
}

func formatVolume(v runtime.VolumeSummary) Volume {
	formattedSize := ""
	if v.Size > 0 {
		formattedSize = formatBytes(v.Size)
	}

	return Volume{
		Name:          v.Name,
		Driver:        v.Driver,
		Mountpoint:    v.Mountpoint,
		CreatedAt:     v.CreatedAt,
		Labels:        v.Labels,
		Scope:         v.Scope,
		Size:          v.Size,
		FormattedSize: formattedSize,
	}
}

func formatBytes(b int64) string {
	const unit = 1000
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "kMGTPE"[exp])
}
