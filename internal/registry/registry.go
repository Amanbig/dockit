package registry

import (
	"context"
)

// SearchResult represents a repository search hit from a container registry.
type SearchResult struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Stars       int    `json:"stars"`
	PullCount   int64  `json:"pullCount"`
	IsOfficial  bool   `json:"isOfficial"`
	IsAutomated bool   `json:"isAutomated"`
	Registry    string `json:"registry"` // "dockerhub", "ghcr", "generic"
}

// Tag represents a specific image tag available in a repository.
type Tag struct {
	Name          string   `json:"name"`
	Size          int64    `json:"size"`
	FormattedSize string   `json:"formattedSize"`
	LastUpdated   string   `json:"lastUpdated"`
	Digest        string   `json:"digest"`
	Architectures []string `json:"architectures,omitempty"`
}

// ImageMetadata represents detailed information about a registry repository.
type ImageMetadata struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	FullDescription string `json:"fullDescription,omitempty"`
	StarCount       int    `json:"starCount"`
	PullCount       int64  `json:"pullCount"`
	LastUpdated     string `json:"lastUpdated"`
	Registry        string `json:"registry"`
}

// AuthConfig stores registry authentication credentials.
type AuthConfig struct {
	Username      string `json:"username,omitempty"`
	Password      string `json:"password,omitempty"`
	Auth          string `json:"auth,omitempty"`
	IdentityToken string `json:"identityToken,omitempty"`
	ServerAddress string `json:"serverAddress,omitempty"`
}

// SearchOptions defines criteria for image repository queries.
type SearchOptions struct {
	Query string `json:"query"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
}

// Registry defines the contract for communicating with a container image registry.
type Registry interface {
	// Name returns the identifier of this registry (e.g. "dockerhub", "ghcr", "generic").
	Name() string

	// Search queries the registry for images matching the query.
	Search(ctx context.Context, query string, opts SearchOptions) ([]SearchResult, error)

	// GetTags lists available tags for a given repository.
	GetTags(ctx context.Context, repository string) ([]Tag, error)

	// GetMetadata retrieves repository details and documentation.
	GetMetadata(ctx context.Context, repository string) (*ImageMetadata, error)
}
