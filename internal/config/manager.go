package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

const (
	AppName        = "dockit"
	ConfigFileName = "config.json"
)

// DefaultConfigDir returns the OS-standard directory for storing Dockit configuration.
func DefaultConfigDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to resolve user config dir: %w", err)
	}
	return filepath.Join(configDir, AppName), nil
}

// DefaultConfigPath returns the full path to config.json.
func DefaultConfigPath() (string, error) {
	dir, err := DefaultConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, ConfigFileName), nil
}

// Manager coordinates reading, writing, and updating application configuration.
type Manager struct {
	mu       sync.RWMutex
	filePath string
	cfg      *Config
}

// NewDefaultManager creates a Manager using the OS default config location.
func NewDefaultManager() (*Manager, error) {
	path, err := DefaultConfigPath()
	if err != nil {
		return nil, err
	}
	return NewManager(path)
}

// NewManager creates a Manager with a specified config file path.
func NewManager(filePath string) (*Manager, error) {
	m := &Manager{
		filePath: filePath,
		cfg:      DefaultConfig(),
	}

	if err := m.Load(); err != nil {
		return nil, fmt.Errorf("failed to initialize config: %w", err)
	}

	return m, nil
}

// Path returns the configuration file path.
func (m *Manager) Path() string {
	return m.filePath
}

// Load reads the configuration from disk, creating defaults if it doesn't exist yet.
func (m *Manager) Load() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := os.ReadFile(m.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			m.cfg = DefaultConfig()
			return m.saveLocked()
		}
		return fmt.Errorf("failed to read config file: %w", err)
	}

	cfg := DefaultConfig()
	if err := json.Unmarshal(data, cfg); err != nil {
		// If config is corrupted, fall back to default
		m.cfg = DefaultConfig()
		return m.saveLocked()
	}

	m.cfg = cfg
	return nil
}

// Save writes the current in-memory configuration to disk.
func (m *Manager) Save() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.saveLocked()
}

func (m *Manager) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(m.filePath), 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := json.MarshalIndent(m.cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode config: %w", err)
	}

	// Atomic write via temporary file
	tmpFile := m.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write temp config: %w", err)
	}

	if err := os.Rename(tmpFile, m.filePath); err != nil {
		return fmt.Errorf("failed to save config file: %w", err)
	}

	return nil
}

// Get returns a shallow copy of the current Config for reading.
func (m *Manager) Get() Config {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return *m.cfg
}

// Update executes a mutation function on the config and persists it.
func (m *Manager) Update(fn func(cfg *Config)) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	fn(m.cfg)
	return m.saveLocked()
}

// Reset restores all settings to default and saves.
func (m *Manager) Reset() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.cfg = DefaultConfig()
	return m.saveLocked()
}

// GetSelectedRuntime returns the currently selected container runtime ("docker", "podman", or "auto").
func (m *Manager) GetSelectedRuntime() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg.Runtime.Selected
}

// SetSelectedRuntime updates the selected container runtime.
func (m *Manager) SetSelectedRuntime(selected string) error {
	return m.Update(func(cfg *Config) {
		cfg.Runtime.Selected = selected
	})
}

// GetTheme returns the configured UI theme ("dark", "light", or "system").
func (m *Manager) GetTheme() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.cfg.UI.Theme
}

// SetTheme updates the UI theme preference.
func (m *Manager) SetTheme(theme string) error {
	return m.Update(func(cfg *Config) {
		cfg.UI.Theme = theme
	})
}

// GetRegistryAuth retrieves saved credentials for a registry host.
func (m *Manager) GetRegistryAuth(server string) (RegistryAuth, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	auth, found := m.cfg.Registries[server]
	return auth, found
}

// SetRegistryAuth saves credentials for a registry host.
func (m *Manager) SetRegistryAuth(server string, auth RegistryAuth) error {
	return m.Update(func(cfg *Config) {
		if cfg.Registries == nil {
			cfg.Registries = make(map[string]RegistryAuth)
		}
		cfg.Registries[server] = auth
	})
}

// RemoveRegistryAuth deletes credentials for a registry host.
func (m *Manager) RemoveRegistryAuth(server string) error {
	return m.Update(func(cfg *Config) {
		delete(cfg.Registries, server)
	})
}

// AddFavorite adds an image name to saved favorites.
func (m *Manager) AddFavorite(image string) error {
	return m.Update(func(cfg *Config) {
		for _, f := range cfg.Favorites {
			if f == image {
				return
			}
		}
		cfg.Favorites = append(cfg.Favorites, image)
	})
}

// RemoveFavorite removes an image name from saved favorites.
func (m *Manager) RemoveFavorite(image string) error {
	return m.Update(func(cfg *Config) {
		filtered := make([]string, 0, len(cfg.Favorites))
		for _, f := range cfg.Favorites {
			if f != image {
				filtered = append(filtered, f)
			}
		}
		cfg.Favorites = filtered
	})
}

// GetFavorites returns the list of saved favorite image names.
func (m *Manager) GetFavorites() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	copied := make([]string, len(m.cfg.Favorites))
	copy(copied, m.cfg.Favorites)
	return copied
}

// SetCustomValue stores an arbitrary key-value pair in local state storage.
func (m *Manager) SetCustomValue(key, val string) error {
	return m.Update(func(cfg *Config) {
		if cfg.CustomData == nil {
			cfg.CustomData = make(map[string]string)
		}
		cfg.CustomData[key] = val
	})
}

// GetCustomValue retrieves an arbitrary key-value pair from local state storage.
func (m *Manager) GetCustomValue(key string) (string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	val, ok := m.cfg.CustomData[key]
	return val, ok
}
