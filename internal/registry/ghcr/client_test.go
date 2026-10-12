package ghcr

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"dockit/internal/registry"
)

func TestGHCRGetTags(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"token":"test-token"}`))
			return
		}

		if r.URL.Path == "/v2/myorg/myapp/tags/list" {
			if r.Header.Get("Authorization") != "Bearer test-token" {
				t.Errorf("expected auth bearer token, got %q", r.Header.Get("Authorization"))
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"name":"myorg/myapp","tags":["v1.0.0","latest"]}`))
			return
		}

		t.Errorf("unexpected path: %s", r.URL.Path)
	}))
	defer server.Close()

	client := NewClient(
		WithRegistryURL(server.URL),
		WithAuthURL(server.URL+"/token"),
	)

	tags, err := client.GetTags(context.Background(), "myorg/myapp")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(tags) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(tags))
	}

	if tags[0].Name != "v1.0.0" || tags[1].Name != "latest" {
		t.Errorf("unexpected tags: %v", tags)
	}
}

func TestGHCRSearch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/search/repositories" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{
				"items": [
					{
						"full_name": "owner/repo",
						"description": "sample repo",
						"stargazers_count": 42
					}
				]
			}`))
			return
		}
		t.Errorf("unexpected path: %s", r.URL.Path)
	}))
	defer server.Close()

	client := NewClient()
	client.apiURL = server.URL

	results, err := client.Search(context.Background(), "sample", registry.SearchOptions{})
	if err != nil {
		t.Fatalf("unexpected search error: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	if results[0].Name != "owner/repo" {
		t.Errorf("expected name 'owner/repo', got %q", results[0].Name)
	}
	if results[0].Stars != 42 {
		t.Errorf("expected 42 stars, got %d", results[0].Stars)
	}
}
