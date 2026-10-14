//go:build linux

package main

import (
	"os"
	"path/filepath"
)

func installDesktopIntegration(iconBytes []byte) {
	if len(iconBytes) == 0 {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}

	// 1. Install icons to user directories
	iconDirs := []string{
		filepath.Join(home, ".local", "share", "icons", "hicolor", "512x512", "apps"),
		filepath.Join(home, ".local", "share", "icons"),
		filepath.Join(home, ".local", "share", "pixmaps"),
	}

	for _, dir := range iconDirs {
		_ = os.MkdirAll(dir, 0755)
		target := filepath.Join(dir, "dockit.png")
		_ = os.WriteFile(target, iconBytes, 0644)
	}

	// 2. Install desktop entry to ~/.local/share/applications/dockit.desktop
	execPath, err := os.Executable()
	if err != nil {
		execPath = "dockit"
	}

	appDir := filepath.Join(home, ".local", "share", "applications")
	_ = os.MkdirAll(appDir, 0755)
	desktopFile := filepath.Join(appDir, "dockit.desktop")

	desktopContent := "[Desktop Entry]\n" +
		"Name=Dockit\n" +
		"Comment=Cross-platform Docker & Podman desktop management\n" +
		"Exec=" + execPath + "\n" +
		"Icon=dockit\n" +
		"Terminal=false\n" +
		"Type=Application\n" +
		"Categories=Development;Utility;\n" +
		"Keywords=docker;podman;containers;devops;\n" +
		"StartupWMClass=dockit\n"

	_ = os.WriteFile(desktopFile, []byte(desktopContent), 0644)
}
