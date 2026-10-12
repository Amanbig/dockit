package compose

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"gopkg.in/yaml.v3"
)

var StandardComposeFileNames = []string{
	"compose.yaml",
	"compose.yml",
	"docker-compose.yaml",
	"docker-compose.yml",
}

// FindComposeFile searches a directory for standard compose file names.
func FindComposeFile(dir string) (string, error) {
	for _, name := range StandardComposeFileNames {
		candidate := filepath.Join(dir, name)
		if fi, err := os.Stat(candidate); err == nil && !fi.IsDir() {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("no compose file found in %s", dir)
}

// ParseCompose parses a YAML string into a structured ComposeFile.
func ParseCompose(content string) (*ComposeFile, error) {
	var file ComposeFile
	if err := yaml.Unmarshal([]byte(content), &file); err != nil {
		return nil, fmt.Errorf("failed to parse compose YAML: %w", err)
	}
	return &file, nil
}

// ExtractServices extracts a sorted slice of ServiceInfo from a ComposeFile.
func ExtractServices(file *ComposeFile) []ServiceInfo {
	if file == nil || len(file.Services) == 0 {
		return nil
	}

	services := make([]ServiceInfo, 0, len(file.Services))
	for name, svc := range file.Services {
		var ports []string
		for _, p := range svc.Ports {
			ports = append(ports, fmt.Sprintf("%v", p))
		}

		services = append(services, ServiceInfo{
			Name:          name,
			Image:         svc.Image,
			ContainerName: svc.ContainerName,
			Ports:         ports,
			Status:        "unknown",
		})
	}

	sort.Slice(services, func(i, j int) bool {
		return services[i].Name < services[j].Name
	})

	return services
}

// ExtractNetworks returns the list of network names declared in the ComposeFile.
func ExtractNetworks(file *ComposeFile) []string {
	if file == nil || len(file.Networks) == 0 {
		return nil
	}
	networks := make([]string, 0, len(file.Networks))
	for name := range file.Networks {
		networks = append(networks, name)
	}
	sort.Strings(networks)
	return networks
}

// ExtractVolumes returns the list of volume names declared in the ComposeFile.
func ExtractVolumes(file *ComposeFile) []string {
	if file == nil || len(file.Volumes) == 0 {
		return nil
	}
	volumes := make([]string, 0, len(file.Volumes))
	for name := range file.Volumes {
		volumes = append(volumes, name)
	}
	sort.Strings(volumes)
	return volumes
}

// FilterServices takes compose YAML content and removes any services not in allowedServices.
func FilterServices(content string, allowedServices []string) (string, error) {
	file, err := ParseCompose(content)
	if err != nil {
		return "", err
	}

	allowedSet := make(map[string]bool)
	for _, s := range allowedServices {
		allowedSet[s] = true
	}

	filteredServices := make(map[string]ServiceConfig)
	for name, svc := range file.Services {
		if allowedSet[name] {
			filteredServices[name] = svc
		}
	}
	file.Services = filteredServices

	out, err := yaml.Marshal(file)
	if err != nil {
		return "", fmt.Errorf("failed to serialize filtered compose YAML: %w", err)
	}

	return string(out), nil
}
