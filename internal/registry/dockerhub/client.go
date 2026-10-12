package dockerhub

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"dockit/internal/registry"
)

var _ registry.Registry = (*Client)(nil)

const (
	DefaultBaseURL = "https://hub.docker.com/v2"
	RegistryName   = "dockerhub"
)

// Option configures the Docker Hub client.
type Option func(*Client)

// WithBaseURL overrides the API base URL (useful for testing).
func WithBaseURL(url string) Option {
	return func(c *Client) {
		c.baseURL = strings.TrimSuffix(url, "/")
	}
}

// WithHTTPClient overrides the default HTTP client.
func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// WithAuth sets registry credentials.
func WithAuth(auth *registry.AuthConfig) Option {
	return func(c *Client) {
		c.auth = auth
	}
}

// Client implements registry.Registry for Docker Hub.
type Client struct {
	baseURL    string
	httpClient *http.Client
	auth       *registry.AuthConfig
}

// NewClient creates a new Docker Hub client.
func NewClient(opts ...Option) *Client {
	c := &Client{
		baseURL: DefaultBaseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func (c *Client) Name() string {
	return RegistryName
}

type searchResponse struct {
	Count   int `json:"count"`
	Results []struct {
		RepoName         string `json:"repo_name"`
		ShortDescription string `json:"short_description"`
		StarCount        int    `json:"star_count"`
		PullCount        int64  `json:"pull_count"`
		IsOfficial       bool   `json:"is_official"`
		IsAutomated      bool   `json:"is_automated"`
	} `json:"results"`
}

// Search searches for container images on Docker Hub.
func (c *Client) Search(ctx context.Context, query string, opts registry.SearchOptions) ([]registry.SearchResult, error) {
	page := opts.Page
	if page < 1 {
		page = 1
	}
	limit := opts.Limit
	if limit < 1 || limit > 100 {
		limit = 25
	}

	endpoint := fmt.Sprintf("%s/search/repositories/?query=%s&page=%d&page_size=%d",
		c.baseURL, url.QueryEscape(query), page, limit)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}

	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("dockerhub search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dockerhub search returned status %d", resp.StatusCode)
	}

	var data searchResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}

	results := make([]registry.SearchResult, 0, len(data.Results))
	for _, r := range data.Results {
		results = append(results, registry.SearchResult{
			Name:        r.RepoName,
			Description: r.ShortDescription,
			Stars:       r.StarCount,
			PullCount:   r.PullCount,
			IsOfficial:  r.IsOfficial,
			IsAutomated: r.IsAutomated,
			Registry:    RegistryName,
		})
	}

	return results, nil
}

type tagsResponse struct {
	Count   int `json:"count"`
	Results []struct {
		Name        string `json:"name"`
		FullSize    int64  `json:"full_size"`
		LastUpdated string `json:"last_updated"`
		Digest      string `json:"digest"`
		Images      []struct {
			Architecture string `json:"architecture"`
			OS           string `json:"os"`
			Size         int64  `json:"size"`
		} `json:"images"`
	} `json:"results"`
}

// GetTags retrieves tags for a given Docker Hub repository.
func (c *Client) GetTags(ctx context.Context, repository string) ([]registry.Tag, error) {
	namespace, name := parseRepository(repository)
	endpoint := fmt.Sprintf("%s/repositories/%s/%s/tags/?page_size=50", c.baseURL, namespace, name)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create tags request: %w", err)
	}

	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("dockerhub tags request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dockerhub tags returned status %d", resp.StatusCode)
	}

	var data tagsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode tags response: %w", err)
	}

	tags := make([]registry.Tag, 0, len(data.Results))
	for _, t := range data.Results {
		var archs []string
		for _, img := range t.Images {
			if img.Architecture != "" && img.Architecture != "unknown" {
				archs = append(archs, fmt.Sprintf("%s/%s", img.OS, img.Architecture))
			}
		}

		tags = append(tags, registry.Tag{
			Name:          t.Name,
			Size:          t.FullSize,
			FormattedSize: formatBytes(t.FullSize),
			LastUpdated:   t.LastUpdated,
			Digest:        t.Digest,
			Architectures: archs,
		})
	}

	return tags, nil
}

type metadataResponse struct {
	Name            string `json:"name"`
	Namespace       string `json:"namespace"`
	Description     string `json:"description"`
	FullDescription string `json:"full_description"`
	StarCount       int    `json:"star_count"`
	PullCount       int64  `json:"pull_count"`
	LastUpdated     string `json:"last_updated"`
}

// GetMetadata fetches repository metadata and readme from Docker Hub.
func (c *Client) GetMetadata(ctx context.Context, repository string) (*registry.ImageMetadata, error) {
	namespace, name := parseRepository(repository)
	endpoint := fmt.Sprintf("%s/repositories/%s/%s/", c.baseURL, namespace, name)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata request: %w", err)
	}

	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("dockerhub metadata request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("dockerhub metadata returned status %d", resp.StatusCode)
	}

	var data metadataResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode metadata response: %w", err)
	}

	fullName := name
	if namespace != "library" {
		fullName = fmt.Sprintf("%s/%s", namespace, name)
	}

	return &registry.ImageMetadata{
		Name:            fullName,
		Description:     data.Description,
		FullDescription: data.FullDescription,
		StarCount:       data.StarCount,
		PullCount:       data.PullCount,
		LastUpdated:     data.LastUpdated,
		Registry:        RegistryName,
	}, nil
}

func (c *Client) applyAuth(req *http.Request) {
	if c.auth != nil && c.auth.IdentityToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.auth.IdentityToken)
	}
}

func parseRepository(repo string) (namespace, name string) {
	parts := strings.Split(repo, "/")
	if len(parts) == 1 {
		return "library", parts[0]
	}
	return parts[0], strings.Join(parts[1:], "/")
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
