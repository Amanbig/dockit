package ghcr

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
	DefaultRegistryURL = "https://ghcr.io"
	DefaultAuthURL     = "https://ghcr.io/token"
	DefaultGitHubAPI   = "https://api.github.com"
	RegistryName       = "ghcr"
)

// Option configures the GHCR client.
type Option func(*Client)

// WithRegistryURL sets the registry base URL.
func WithRegistryURL(url string) Option {
	return func(c *Client) {
		c.registryURL = strings.TrimSuffix(url, "/")
	}
}

// WithAuthURL sets the token auth endpoint.
func WithAuthURL(url string) Option {
	return func(c *Client) {
		c.authURL = strings.TrimSuffix(url, "/")
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(client *http.Client) Option {
	return func(c *Client) {
		c.httpClient = client
	}
}

// WithAuth sets credentials for authenticated access.
func WithAuth(auth *registry.AuthConfig) Option {
	return func(c *Client) {
		c.auth = auth
	}
}

// Client implements registry.Registry for GitHub Container Registry (ghcr.io).
type Client struct {
	registryURL string
	authURL     string
	apiURL      string
	httpClient  *http.Client
	auth        *registry.AuthConfig
}

// NewClient creates a new GHCR client.
func NewClient(opts ...Option) *Client {
	c := &Client{
		registryURL: DefaultRegistryURL,
		authURL:     DefaultAuthURL,
		apiURL:      DefaultGitHubAPI,
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

type ghRepoSearchResponse struct {
	Items []struct {
		FullName    string `json:"full_name"`
		Description string `json:"description"`
		Stargazers  int    `json:"stargazers_count"`
	} `json:"items"`
}

// Search searches for container packages or repositories on GitHub.
func (c *Client) Search(ctx context.Context, query string, opts registry.SearchOptions) ([]registry.SearchResult, error) {
	page := opts.Page
	if page < 1 {
		page = 1
	}
	limit := opts.Limit
	if limit < 1 || limit > 100 {
		limit = 25
	}

	endpoint := fmt.Sprintf("%s/search/repositories?q=%s&page=%d&per_page=%d",
		c.apiURL, url.QueryEscape(query), page, limit)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}

	c.applyGitHubAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ghcr search request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ghcr search returned status %d", resp.StatusCode)
	}

	var data ghRepoSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}

	results := make([]registry.SearchResult, 0, len(data.Items))
	for _, item := range data.Items {
		results = append(results, registry.SearchResult{
			Name:        item.FullName,
			Description: item.Description,
			Stars:       item.Stargazers,
			Registry:    RegistryName,
		})
	}

	return results, nil
}

type tagListResponse struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

// GetTags retrieves tags for a given GHCR package using OCI Distribution v2.
func (c *Client) GetTags(ctx context.Context, repository string) ([]registry.Tag, error) {
	token, err := c.obtainToken(ctx, repository)
	if err != nil {
		return nil, fmt.Errorf("failed to obtain token for %s: %w", repository, err)
	}

	endpoint := fmt.Sprintf("%s/v2/%s/tags/list", c.registryURL, repository)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create tags request: %w", err)
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ghcr tags request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ghcr tags returned status %d", resp.StatusCode)
	}

	var data tagListResponse
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

// GetMetadata fetches package details from GitHub API.
func (c *Client) GetMetadata(ctx context.Context, repository string) (*registry.ImageMetadata, error) {
	parts := strings.Split(repository, "/")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid repository format, expected owner/package")
	}
	owner := parts[0]
	pkg := strings.Join(parts[1:], "/")

	endpoint := fmt.Sprintf("%s/users/%s/packages/container/%s", c.apiURL, owner, url.PathEscape(pkg))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata request: %w", err)
	}

	c.applyGitHubAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ghcr metadata request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var data struct {
			Name       string `json:"name"`
			CreatedAt  string `json:"created_at"`
			UpdatedAt  string `json:"updated_at"`
			HTMLURL    string `json:"html_url"`
			Repository struct {
				Description string `json:"description"`
				Stargazers  int    `json:"stargazers_count"`
			} `json:"repository"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
			return &registry.ImageMetadata{
				Name:        repository,
				Description: data.Repository.Description,
				StarCount:   data.Repository.Stargazers,
				LastUpdated: data.UpdatedAt,
				Registry:    RegistryName,
			}, nil
		}
	}

	return &registry.ImageMetadata{
		Name:     repository,
		Registry: RegistryName,
	}, nil
}

type tokenResponse struct {
	Token string `json:"token"`
}

func (c *Client) obtainToken(ctx context.Context, repository string) (string, error) {
	if c.auth != nil && c.auth.IdentityToken != "" {
		return c.auth.IdentityToken, nil
	}
	if c.auth != nil && c.auth.Password != "" {
		return c.auth.Password, nil
	}

	// Request anonymous token for public pulls
	endpoint := fmt.Sprintf("%s?service=ghcr.io&scope=repository:%s:pull", c.authURL, repository)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil // Some registries allow unauthenticated access directly
	}

	var t tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&t); err != nil {
		return "", nil
	}

	return t.Token, nil
}

func (c *Client) applyGitHubAuth(req *http.Request) {
	if c.auth != nil {
		if c.auth.IdentityToken != "" {
			req.Header.Set("Authorization", "Bearer "+c.auth.IdentityToken)
		} else if c.auth.Password != "" {
			req.Header.Set("Authorization", "Bearer "+c.auth.Password)
		}
	}
	req.Header.Set("Accept", "application/vnd.github+json")
}
