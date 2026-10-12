package images

import (
	"context"
	"fmt"
	"io"
	"strings"

	"dockit/internal/runtime"
)

// Service provides high-level local image operations backed by a container runtime.
type Service struct {
	rt runtime.Runtime
}

// NewService creates a new images Service using the provided runtime.
func NewService(rt runtime.Runtime) *Service {
	return &Service{rt: rt}
}

// Runtime returns the underlying runtime instance.
func (s *Service) Runtime() runtime.Runtime {
	return s.rt
}

// List returns local container images formatted for the UI.
func (s *Service) List(ctx context.Context, all bool) ([]Image, error) {
	summaries, err := s.rt.ListImages(ctx, runtime.ImageListOptions{All: all})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	result := make([]Image, 0, len(summaries))
	for _, img := range summaries {
		result = append(result, formatImageSummary(img))
	}
	return result, nil
}

// Inspect returns deep inspection metadata for an image.
func (s *Service) Inspect(ctx context.Context, imageID string) (*runtime.ImageInspect, error) {
	return s.rt.InspectImage(ctx, imageID)
}

// Pull downloads an image from a remote registry and streams the progress output.
func (s *Service) Pull(ctx context.Context, ref string) (io.ReadCloser, error) {
	return s.rt.PullImage(ctx, ref)
}

// Tag assigns a new repository tag to an existing image.
func (s *Service) Tag(ctx context.Context, source, target string) error {
	return s.rt.TagImage(ctx, source, target)
}

// Remove deletes an image from local storage.
func (s *Service) Remove(ctx context.Context, imageID string, force bool) ([]runtime.ImageDeleteResult, error) {
	return s.rt.RemoveImage(ctx, imageID, runtime.ImageRemoveOptions{Force: force})
}

func formatImageSummary(img runtime.ImageSummary) Image {
	repo := "<none>"
	tag := "<none>"

	if len(img.RepoTags) > 0 && img.RepoTags[0] != "<none>:<none>" {
		primary := img.RepoTags[0]
		if idx := strings.LastIndex(primary, ":"); idx != -1 {
			repo = primary[:idx]
			tag = primary[idx+1:]
		} else {
			repo = primary
		}
	}

	shortID := strings.TrimPrefix(img.ID, "sha256:")
	if len(shortID) > 12 {
		shortID = shortID[:12]
	}

	return Image{
		ID:            img.ID,
		ShortID:       shortID,
		Repository:    repo,
		Tag:           tag,
		RepoTags:      img.RepoTags,
		RepoDigests:   img.RepoDigests,
		Created:       img.Created,
		Size:          img.Size,
		FormattedSize: formatBytes(img.Size),
		Containers:    img.Containers,
		Labels:        img.Labels,
	}
}

func formatBytes(b int64) string {
	const unit = 1000 // decimal units commonly used by docker CLI
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
