package compose

// ComposeFile represents the top-level structure of a Docker Compose YAML.
type ComposeFile struct {
	Version  string                            `yaml:"version,omitempty" json:"version,omitempty"`
	Name     string                            `yaml:"name,omitempty" json:"name,omitempty"`
	Services map[string]ServiceConfig          `yaml:"services" json:"services"`
	Networks map[string]map[string]interface{} `yaml:"networks,omitempty" json:"networks,omitempty"`
	Volumes  map[string]map[string]interface{} `yaml:"volumes,omitempty" json:"volumes,omitempty"`
}

// ServiceConfig represents a single service within a compose file.
type ServiceConfig struct {
	Image         string            `yaml:"image,omitempty" json:"image,omitempty"`
	Build         interface{}       `yaml:"build,omitempty" json:"build,omitempty"`
	ContainerName string            `yaml:"container_name,omitempty" json:"containerName,omitempty"`
	Command       interface{}       `yaml:"command,omitempty" json:"command,omitempty"`
	Ports         []interface{}     `yaml:"ports,omitempty" json:"ports,omitempty"`
	Environment   interface{}       `yaml:"environment,omitempty" json:"environment,omitempty"`
	Volumes       []interface{}     `yaml:"volumes,omitempty" json:"volumes,omitempty"`
	Networks      []interface{}     `yaml:"networks,omitempty" json:"networks,omitempty"`
	Restart       string            `yaml:"restart,omitempty" json:"restart,omitempty"`
	DependsOn     interface{}       `yaml:"depends_on,omitempty" json:"dependsOn,omitempty"`
}

// ServiceInfo represents parsed service status and metadata for UI display.
type ServiceInfo struct {
	Name          string   `json:"name"`
	Image         string   `json:"image"`
	ContainerName string   `json:"containerName,omitempty"`
	Ports         []string `json:"ports"`
	Status        string   `json:"status"` // "running", "exited", "created", "disabled"
}

// Project represents a managed Docker Compose project.
type Project struct {
	ID               string        `json:"id"`
	Name             string        `json:"name"`
	WorkingDir       string        `json:"workingDir"`
	FilePath         string        `json:"filePath"`
	Content          string        `json:"content"`
	TemporaryContent string        `json:"temporaryContent,omitempty"`
	HasStagedChanges bool          `json:"hasStagedChanges"`
	Services         []ServiceInfo `json:"services"`
	Networks         []string      `json:"networks"`
	Volumes          []string      `json:"volumes"`
	Status           string        `json:"status"` // "running", "partial", "stopped"
}

// UpOptions defines options when launching a compose project.
type UpOptions struct {
	Services      []string `json:"services,omitempty"` // run only selected services
	Detach        bool     `json:"detach"`
	Build         bool     `json:"build"`
	RemoveOrphans bool     `json:"removeOrphans"`
	UseStaged     bool     `json:"useStaged"` // run using staged temporary content
}

// DownOptions defines options when stopping and cleaning up a compose project.
type DownOptions struct {
	RemoveVolumes bool `json:"removeVolumes"`
	RemoveImages  bool `json:"removeImages"`
	RemoveOrphans bool `json:"removeOrphans"`
}

// ContainerStatus represents a container instance belonging to a compose project.
type ContainerStatus struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Service string `json:"service"`
	State   string `json:"state"`
	Status  string `json:"status"`
	Ports   string `json:"ports"`
}
