package generic

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dockit/internal/registry"
)

var _ registry.Registry = (*Client)(nil)

// Option configures the generic OCI registry client.
type Option func(*Client)

// WithHTTPClient overrides the HTTP client.
func WithHTTPClient(client *http.Client) Option {
	return func(c *Client) {
		c.httpClient = client
	}
}

// WithAuth sets registry credentials.
func WithAuth(auth *registry.AuthConfig) Option {
	return func(c *Client) {
		c.auth = auth
	}
}

// Client implements registry.Registry for any OCI Distribution v2 compliant registry.
type Client struct {
	name       string
	baseURL    string
	httpClient *http.Client
	auth       *registry.AuthConfig
}

// NewClient creates a new generic OCI registry client.
func NewClient(name, baseURL string, opts ...Option) *Client {
	c := &Client{
		name:    name,
		baseURL: strings.TrimSuffix(baseURL, "/"),
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
	return c.name
}

type catalogResponse struct {
	Repositories []string `json:"repositories"`
}

// Search queries the registry catalog for matching image repositories.
func (c *Client) Search(ctx context.Context, query string, opts registry.SearchOptions) ([]registry.SearchResult, error) {
	endpoint := fmt.Sprintf("%s/v2/_catalog", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create catalog request: %w", err)
	}

	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("registry search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("registry catalog returned status %d", resp.StatusCode)
	}

	var data catalogResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode catalog response: %w", err)
	}

	queryLower := strings.ToLower(query)
	var results []registry.SearchResult
	for _, repo := range data.Repositories {
		if queryLower == "" || strings.Contains(strings.ToLower(repo), queryLower) {
			results = append(results, registry.SearchResult{
				Name:     repo,
				Registry: c.name,
			})
		}
	}

	return results, nil
}

type tagsListResponse struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

// GetTags lists tags for a repository via OCI Distribution Spec.
func (c *Client) GetTags(ctx context.Context, repository string) ([]registry.Tag, error) {
	endpoint := fmt.Sprintf("%s/v2/%s/tags/list", c.baseURL, repository)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create tags request: %w", err)
	}

	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("registry tags request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("registry tags returned status %d", resp.StatusCode)
	}

	var data tagsListResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode tags response: %w", err)
	}

	tags := make([]registry.Tag, 0, len(data.Tags))
	for _, t := range data.Tags {
		tags = append(tags, registry.Tag{
			Name: t,
		})
	}

	return tags, nil
}

// GetMetadata returns basic image metadata for an OCI repository.
func (c *Client) GetMetadata(ctx context.Context, repository string) (*registry.ImageMetadata, error) {
	tags, err := c.GetTags(ctx, repository)
	if err != nil {
		return nil, err
	}

	return &registry.ImageMetadata{
		Name:        repository,
		Description: fmt.Sprintf("%d tags available in %s", len(tags), c.name),
		Registry:    c.name,
	}, nil
}

func (c *Client) applyAuth(req *http.Request) {
	if c.auth == nil {
		return
	}
	if c.auth.IdentityToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.auth.IdentityToken)
	} else if c.auth.Username != "" && c.auth.Password != "" {
		req.SetBasicAuth(c.auth.Username, c.auth.Password)
	}
}
