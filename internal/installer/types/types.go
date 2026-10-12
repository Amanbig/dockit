package types

import "context"

// RuntimeStatus captures the presence and operational state of a container engine.
type RuntimeStatus struct {
	Name      string `json:"name"`      // "docker" or "podman"
	Installed bool   `json:"installed"` // binary present in PATH
	Running   bool   `json:"running"`   // daemon or socket actively responsive
	Version   string `json:"version"`   // detected version
	NeedsAuth bool   `json:"needsAuth"` // e.g. Linux docker group permissions required
	Message   string `json:"message"`   // diagnostic or status summary
}

// DetectionResult reports the presence, status, and recommendations for container runtimes.
type DetectionResult struct {
	OS               string        `json:"os"` // "linux", "darwin", "windows"
	Docker           RuntimeStatus `json:"docker"`
	Podman           RuntimeStatus `json:"podman"`
	Recommended      string        `json:"recommended"`      // "docker", "podman", or "none"
	PrerequisitesMet bool          `json:"prerequisitesMet"` // virtualization/kernel requirements
	Details          []string      `json:"details"`
}

// InstallStep describes an individual action in an installation plan.
type InstallStep struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Command     string `json:"command"`
	Privileged  bool   `json:"privileged"` // requires elevated/administrator permissions
	Optional    bool   `json:"optional"`
}

// InstallPlan details the steps, package manager, and security disclosures for an installation.
type InstallPlan struct {
	Runtime        string        `json:"runtime"`        // "docker" or "podman"
	OS             string        `json:"os"`             // "linux", "darwin", "windows"
	PackageManager string        `json:"packageManager"` // e.g. "apt", "dnf", "pacman", "brew", "winget"
	Steps          []InstallStep `json:"steps"`
	Warning        string        `json:"warning,omitempty"`
}

// Provider defines the platform-specific contract for detection and installation.
type Provider interface {
	OS() string
	Detect(ctx context.Context) (*DetectionResult, error)
	GetInstallPlan(targetRuntime string) (*InstallPlan, error)
	Install(ctx context.Context, targetRuntime string, progressCb func(step int, total int, message string)) error
}
