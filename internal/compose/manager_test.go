package compose

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

const sampleComposeYAML = `version: "3.8"
name: myapp
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
networks:
  frontend:
volumes:
  pgdata:
`

func TestParseComposeAndExtract(t *testing.T) {
	file, err := ParseCompose(sampleComposeYAML)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}

	if file.Name != "myapp" {
		t.Errorf("expected project name 'myapp', got %q", file.Name)
	}

	services := ExtractServices(file)
	if len(services) != 2 {
		t.Fatalf("expected 2 services, got %d", len(services))
	}

	if services[0].Name != "db" || services[1].Name != "web" {
		t.Errorf("expected sorted services ['db', 'web'], got %v, %v", services[0].Name, services[1].Name)
	}

	networks := ExtractNetworks(file)
	if len(networks) != 1 || networks[0] != "frontend" {
		t.Errorf("expected network 'frontend', got %v", networks)
	}

	volumes := ExtractVolumes(file)
	if len(volumes) != 1 || volumes[0] != "pgdata" {
		t.Errorf("expected volume 'pgdata', got %v", volumes)
	}
}

func TestFilterServices(t *testing.T) {
	filteredYAML, err := FilterServices(sampleComposeYAML, []string{"web"})
	if err != nil {
		t.Fatalf("unexpected filter error: %v", err)
	}

	file, err := ParseCompose(filteredYAML)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}

	if len(file.Services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(file.Services))
	}

	if _, ok := file.Services["web"]; !ok {
		t.Errorf("expected 'web' service to remain")
	}
	if _, ok := file.Services["db"]; ok {
		t.Errorf("expected 'db' service to be skipped")
	}
}

func TestProjectStagingAndApplyingChanges(t *testing.T) {
	tmpDir := t.TempDir()
	composePath := filepath.Join(tmpDir, "docker-compose.yml")

	if err := os.WriteFile(composePath, []byte(sampleComposeYAML), 0644); err != nil {
		t.Fatalf("failed to create test compose file: %v", err)
	}

	mgr := NewManager("docker")
	proj, err := mgr.OpenProject(tmpDir)
	if err != nil {
		t.Fatalf("failed to open project: %v", err)
	}

	if proj.HasStagedChanges {
		t.Errorf("expected no staged changes initially")
	}

	modifiedYAML := `version: "3.8"
name: myapp
services:
  web:
    image: nginx:latest
`

	// Stage temporary changes
	if err := mgr.StageChanges(proj.ID, modifiedYAML); err != nil {
		t.Fatalf("failed to stage changes: %v", err)
	}

	if !proj.HasStagedChanges {
		t.Errorf("expected HasStagedChanges to be true")
	}

	testFilePath := filepath.Join(tmpDir, TestComposeFileName)
	if _, err := os.Stat(testFilePath); err != nil {
		t.Fatalf("expected test compose file on disk: %v", err)
	}

	// Apply changes (replaces the original file)
	if err := mgr.ApplyChanges(proj.ID); err != nil {
		t.Fatalf("failed to apply changes: %v", err)
	}

	if proj.HasStagedChanges {
		t.Errorf("expected HasStagedChanges to be false after apply")
	}

	// Verify primary file was replaced
	contentOnDisk, err := os.ReadFile(composePath)
	if err != nil {
		t.Fatalf("failed to read compose file: %v", err)
	}

	if string(contentOnDisk) != modifiedYAML {
		t.Errorf("expected compose file to be updated on disk with new content")
	}

	// Verify temporary file was deleted
	if _, err := os.Stat(testFilePath); !os.IsNotExist(err) {
		t.Errorf("expected test compose file to be removed after apply")
	}
}

func TestOpenProjectFromURL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/yaml")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(sampleComposeYAML))
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	mgr := NewManager("docker")

	proj, err := mgr.OpenProjectFromURL(context.Background(), tmpDir, server.URL+"/docker-compose.yml")
	if err != nil {
		t.Fatalf("failed to open project from URL: %v", err)
	}

	if proj.Name != "myapp" {
		t.Errorf("expected project name 'myapp', got %q", proj.Name)
	}
	if len(proj.Services) != 2 {
		t.Errorf("expected 2 services, got %d", len(proj.Services))
	}
}
