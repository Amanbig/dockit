package config

// CurrentVersion is the schema version for the configuration file.
const CurrentVersion = 1

// Config represents the application settings and persisted local state.
type Config struct {
	Version    int                     `json:"version"`
	Runtime    RuntimeConfig           `json:"runtime"`
	UI         UIConfig                `json:"ui"`
	Registries map[string]RegistryAuth `json:"registries"`
	Favorites  []string                `json:"favorites"`
	CustomData map[string]string       `json:"customData,omitempty"`
}

// RuntimeConfig stores container engine preferences and socket overrides.
type RuntimeConfig struct {
	Selected     string `json:"selected"` // "docker", "podman", or "auto"
	DockerSocket string `json:"dockerSocket,omitempty"`
	PodmanSocket string `json:"podmanSocket,omitempty"`
	AutoConnect  bool   `json:"autoConnect"`
}

// UIConfig stores display and user interface preferences.
type UIConfig struct {
	Theme           string `json:"theme"` // "dark", "light", or "system"
	RefreshInterval int    `json:"refreshInterval"` // in seconds, default 5
	Notifications   bool   `json:"notifications"`
	CompactView     bool   `json:"compactView"`
}

// RegistryAuth stores saved authentication credentials for a container registry.
type RegistryAuth struct {
	ServerAddress string `json:"serverAddress"`
	Username      string `json:"username,omitempty"`
	Password      string `json:"password,omitempty"`
	IdentityToken string `json:"identityToken,omitempty"`
}

// DefaultConfig returns a fresh Config populated with default values.
func DefaultConfig() *Config {
	return &Config{
		Version: CurrentVersion,
		Runtime: RuntimeConfig{
			Selected:    "auto",
			AutoConnect: true,
		},
		UI: UIConfig{
			Theme:           "system",
			RefreshInterval: 5,
			Notifications:   true,
			CompactView:     false,
		},
		Registries: make(map[string]RegistryAuth),
		Favorites:  make([]string, 0),
		CustomData: make(map[string]string),
	}
}
