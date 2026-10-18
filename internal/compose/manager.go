package compose

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const TestComposeFileName = ".dockit.compose.test.yml"

// ComputeGitBlobHash calculates a Git-compatible SHA-256 blob hash for the given file content.
func ComputeGitBlobHash(content string) string {
	data := []byte(content)
	header := fmt.Sprintf("blob %d\x00", len(data))
	h := sha256.New()
	h.Write([]byte(header))
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}

// Manager coordinates project-level Docker Compose operations and testing workflows.
type Manager struct {
	mu          sync.RWMutex
	projects    map[string]*Project
	runner      *Runner
	runtimeType string
}

// NewManager creates a new Compose Manager for the given runtime type ("docker" or "podman").
func NewManager(runtimeType string) *Manager {
	return &Manager{
		projects:    make(map[string]*Project),
		runner:      NewRunner(runtimeType),
		runtimeType: runtimeType,
	}
}

// OpenProject loads a Compose project from a folder or specific compose file.
func (m *Manager) OpenProject(path string) (*Project, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var filePath, workingDir string
	fi, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("failed to access project path %q: %w", path, err)
	}

	if fi.IsDir() {
		workingDir = path
		cf, err := FindComposeFile(path)
		if err != nil {
			return nil, err
		}
		filePath = cf
	} else {
		filePath = path
		workingDir = filepath.Dir(path)
	}

	contentBytes, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read compose file %q: %w", filePath, err)
	}
	content := string(contentBytes)

	parsed, err := ParseCompose(content)
	if err != nil {
		return nil, err
	}

	projectName := parsed.Name
	if projectName == "" {
		projectName = filepath.Base(workingDir)
	}

	proj := &Project{
		ID:          filePath,
		Name:        projectName,
		WorkingDir:  workingDir,
		FilePath:    filePath,
		Content:     content,
		ContentHash: ComputeGitBlobHash(content),
		Services:    ExtractServices(parsed),
		Networks:    ExtractNetworks(parsed),
		Volumes:     ExtractVolumes(parsed),
		Status:      "stopped",
	}

	// Check if a staged test file already exists from a previous session
	testPath := filepath.Join(workingDir, TestComposeFileName)
	if stagedBytes, err := os.ReadFile(testPath); err == nil && len(stagedBytes) > 0 {
		proj.TemporaryContent = string(stagedBytes)
		proj.TemporaryHash = ComputeGitBlobHash(proj.TemporaryContent)
		proj.HasStagedChanges = true
	}

	// Check if .env exists in project working directory
	envPath := filepath.Join(workingDir, ".env")
	if envBytes, err := os.ReadFile(envPath); err == nil {
		proj.EnvContent = string(envBytes)
		proj.HasEnvFile = true
	}

	m.projects[proj.ID] = proj
	m.projects[workingDir] = proj

	// Query live status immediately if runtime is active
	if statuses, err := m.runner.PS(context.Background(), workingDir, filePath); err == nil && len(statuses) > 0 {
		statusMap := make(map[string]string)
		for _, st := range statuses {
			statusMap[st.Service] = st.State
		}
		runningCount := 0
		for i := range proj.Services {
			name := proj.Services[i].Name
			if st, ok := statusMap[name]; ok {
				proj.Services[i].Status = st
				if strings.EqualFold(st, "running") {
					runningCount++
				}
			} else {
				proj.Services[i].Status = "stopped"
			}
		}
		if runningCount == len(proj.Services) && len(proj.Services) > 0 {
			proj.Status = "running"
		} else if runningCount > 0 {
			proj.Status = "partial"
		} else {
			proj.Status = "stopped"
		}
	}

	return proj, nil
}

// OpenProjectFromURL downloads a compose file from a URL and saves it into destDir.
func (m *Manager) OpenProjectFromURL(ctx context.Context, destDir string, rawURL string) (*Project, error) {
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create destination directory: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create download request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download compose file from %q: %w", rawURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download returned HTTP status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read downloaded compose content: %w", err)
	}

	targetFile := filepath.Join(destDir, "docker-compose.yml")
	if err := os.WriteFile(targetFile, body, 0644); err != nil {
		return nil, fmt.Errorf("failed to write compose file: %w", err)
	}

	return m.OpenProject(targetFile)
}

// StageChanges saves modified compose YAML into a temporary test file for dry-running/testing.
func (m *Manager) StageChanges(projectID string, newContent string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return fmt.Errorf("project %q not loaded", projectID)
	}

	// Validate syntax
	if _, err := ParseCompose(newContent); err != nil {
		return fmt.Errorf("invalid compose YAML syntax: %w", err)
	}

	testPath := filepath.Join(proj.WorkingDir, TestComposeFileName)
	if err := os.WriteFile(testPath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write test compose file: %w", err)
	}

	proj.TemporaryContent = newContent
	proj.TemporaryHash = ComputeGitBlobHash(newContent)
	proj.HasStagedChanges = true
	return nil
}

// ApplyChanges commits the staged changes into the primary compose file on disk.
func (m *Manager) ApplyChanges(projectID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return fmt.Errorf("project %q not found", projectID)
	}

	if !proj.HasStagedChanges || proj.TemporaryContent == "" {
		return fmt.Errorf("project %q has no staged changes to apply", projectID)
	}

	// Write into primary compose file
	if err := os.WriteFile(proj.FilePath, []byte(proj.TemporaryContent), 0644); err != nil {
		return fmt.Errorf("failed to apply changes to %q: %w", proj.FilePath, err)
	}

	// Remove temporary test file
	testPath := filepath.Join(proj.WorkingDir, TestComposeFileName)
	_ = os.Remove(testPath)

	proj.Content = proj.TemporaryContent
	proj.ContentHash = ComputeGitBlobHash(proj.Content)
	proj.TemporaryContent = ""
	proj.TemporaryHash = ""
	proj.HasStagedChanges = false

	// Refresh parsed metadata
	if parsed, err := ParseCompose(proj.Content); err == nil {
		proj.Services = ExtractServices(parsed)
		proj.Networks = ExtractNetworks(parsed)
		proj.Volumes = ExtractVolumes(parsed)
	}

	return nil
}

// DiscardChanges removes the temporary staged test file and clears uncommitted modifications.
func (m *Manager) DiscardChanges(projectID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return fmt.Errorf("project %q not found", projectID)
	}

	testPath := filepath.Join(proj.WorkingDir, TestComposeFileName)
	_ = os.Remove(testPath)

	proj.TemporaryContent = ""
	proj.TemporaryHash = ""
	proj.HasStagedChanges = false
	return nil
}

// SaveSnapshot records a revision snapshot of the compose YAML using Git blob SHA-256.
func (m *Manager) SaveSnapshot(projectID, message string) (*Snapshot, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return nil, fmt.Errorf("project %q not found", projectID)
	}

	contentToSave := proj.Content
	if proj.HasStagedChanges && proj.TemporaryContent != "" {
		contentToSave = proj.TemporaryContent
	}

	hash := ComputeGitBlobHash(contentToSave)
	if message == "" {
		shortHash := hash
		if len(shortHash) > 8 {
			shortHash = shortHash[:8]
		}
		message = fmt.Sprintf("Snapshot %s", shortHash)
	}

	snap := Snapshot{
		Hash:      hash,
		Message:   message,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Content:   contentToSave,
	}

	proj.Snapshots = append([]Snapshot{snap}, proj.Snapshots...)
	return &snap, nil
}

// RestoreSnapshot restores project content from a previous snapshot hash into the testing sandbox.
func (m *Manager) RestoreSnapshot(projectID, hash string) (*Project, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return nil, fmt.Errorf("project %q not found", projectID)
	}

	var targetContent string
	found := false
	for _, s := range proj.Snapshots {
		if s.Hash == hash {
			targetContent = s.Content
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("snapshot hash %q not found", hash)
	}

	// Stage the restored content so the user can inspect/test it
	testPath := filepath.Join(proj.WorkingDir, TestComposeFileName)
	if err := os.WriteFile(testPath, []byte(targetContent), 0644); err != nil {
		return nil, fmt.Errorf("failed to write test compose file: %w", err)
	}

	proj.TemporaryContent = targetContent
	proj.TemporaryHash = ComputeGitBlobHash(targetContent)
	proj.HasStagedChanges = true

	return proj, nil
}

// Up runs the project or selected services, optionally using staged changes.
func (m *Manager) Up(ctx context.Context, projectID string, opts UpOptions) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}

	targetFile := proj.FilePath
	if opts.UseStaged && proj.HasStagedChanges {
		targetFile = filepath.Join(proj.WorkingDir, TestComposeFileName)
	}

	return m.runner.Up(ctx, proj.WorkingDir, targetFile, opts)
}

// Down stops and tears down containers and networks for the project.
func (m *Manager) Down(ctx context.Context, projectID string, opts DownOptions) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}

	targetFile := proj.FilePath
	if proj.HasStagedChanges {
		testFile := filepath.Join(proj.WorkingDir, TestComposeFileName)
		if _, err := os.Stat(testFile); err == nil {
			targetFile = testFile
		}
	}

	return m.runner.Down(ctx, proj.WorkingDir, targetFile, opts)
}

// Start starts existing containers in the project.
func (m *Manager) Start(ctx context.Context, projectID string, services ...string) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}
	return m.runner.Start(ctx, proj.WorkingDir, proj.FilePath, services...)
}

// Stop stops running containers in the project.
func (m *Manager) Stop(ctx context.Context, projectID string, services ...string) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}
	return m.runner.Stop(ctx, proj.WorkingDir, proj.FilePath, services...)
}

// Restart restarts containers in the project.
func (m *Manager) Restart(ctx context.Context, projectID string, services ...string) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}
	return m.runner.Restart(ctx, proj.WorkingDir, proj.FilePath, services...)
}

// PS retrieves the status of all containers belonging to the project.
func (m *Manager) PS(ctx context.Context, projectID string) ([]ContainerStatus, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return nil, err
	}
	return m.runner.PS(ctx, proj.WorkingDir, proj.FilePath)
}

// Logs returns container logs for the project or a specific service.
func (m *Manager) Logs(ctx context.Context, projectID string, service string, tail string) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}
	return m.runner.Logs(ctx, proj.WorkingDir, proj.FilePath, service, tail)
}

// Refresh updates the runtime status of all services in the project.
func (m *Manager) Refresh(ctx context.Context, projectID string) (*Project, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return nil, err
	}

	statuses, err := m.PS(ctx, projectID)
	if err != nil {
		return proj, nil // return project even if PS fails
	}

	statusMap := make(map[string]string)
	for _, st := range statuses {
		statusMap[st.Service] = st.State
	}

	runningCount := 0
	for i := range proj.Services {
		name := proj.Services[i].Name
		if st, ok := statusMap[name]; ok {
			proj.Services[i].Status = st
			if strings.EqualFold(st, "running") {
				runningCount++
			}
		} else {
			proj.Services[i].Status = "stopped"
		}
	}

	if runningCount == len(proj.Services) && len(proj.Services) > 0 {
		proj.Status = "running"
	} else if runningCount > 0 {
		proj.Status = "partial"
	} else {
		proj.Status = "stopped"
	}

	return proj, nil
}

func (m *Manager) getProject(projectID string) (*Project, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	proj, exists := m.projects[projectID]
	if !exists {
		return nil, fmt.Errorf("project %q not loaded", projectID)
	}
	return proj, nil
}

// ReadEnv reads the .env file in the project's working directory.
func (m *Manager) ReadEnv(projectID string) (string, error) {
	proj, err := m.getProject(projectID)
	if err != nil {
		return "", err
	}
	envPath := filepath.Join(proj.WorkingDir, ".env")
	b, err := os.ReadFile(envPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("failed to read .env file: %w", err)
	}
	return string(b), nil
}

// SaveEnv writes content to the .env file in the project's working directory.
func (m *Manager) SaveEnv(projectID string, content string) error {
	proj, err := m.getProject(projectID)
	if err != nil {
		return err
	}
	envPath := filepath.Join(proj.WorkingDir, ".env")
	if err := os.WriteFile(envPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write .env file: %w", err)
	}
	m.mu.Lock()
	proj.EnvContent = content
	proj.HasEnvFile = true
	m.mu.Unlock()
	return nil
}

// DeleteEnv removes the .env file from the project's working directory.
func (m *Manager) DeleteEnv(projectID string) error {
	proj, err := m.getProject(projectID)
	if err != nil {
		return err
	}
	envPath := filepath.Join(proj.WorkingDir, ".env")
	if err := os.Remove(envPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove .env file: %w", err)
	}
	m.mu.Lock()
	proj.EnvContent = ""
	proj.HasEnvFile = false
	m.mu.Unlock()
	return nil
}

