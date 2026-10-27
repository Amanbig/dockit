package installer

import (
	"context"
	"fmt"
	goruntime "runtime"

	"dockit/internal/installer/linux"
	"dockit/internal/installer/macos"
	"dockit/internal/installer/types"
	"dockit/internal/installer/windows"
)

// Re-export types so callers can use installer.RuntimeStatus etc. directly.
type RuntimeStatus = types.RuntimeStatus
type DetectionResult = types.DetectionResult
type InstallStep = types.InstallStep
type InstallPlan = types.InstallPlan
type Provider = types.Provider

// CurrentProvider returns the appropriate Provider for the host operating system.
func CurrentProvider() Provider {
	switch goruntime.GOOS {
	case "linux":
		return linux.NewProvider()
	case "darwin":
		return macos.NewProvider()
	case "windows":
		return windows.NewProvider()
	default:
		return linux.NewProvider()
	}
}

// Detect checks the host system for Docker and Podman installations and services.
func Detect(ctx context.Context) (*DetectionResult, error) {
	provider := CurrentProvider()
	if provider == nil {
		return nil, fmt.Errorf("unsupported operating system: %s", goruntime.GOOS)
	}
	return provider.Detect(ctx)
}

// GetInstallPlan generates the detailed step-by-step installation plan for a runtime.
func GetInstallPlan(targetRuntime string) (*InstallPlan, error) {
	provider := CurrentProvider()
	if provider == nil {
		return nil, fmt.Errorf("unsupported operating system: %s", goruntime.GOOS)
	}
	return provider.GetInstallPlan(targetRuntime)
}

// GetStartPlan returns a safe startup plan to start an already-installed runtime engine.
func GetStartPlan(targetRuntime string) (*InstallPlan, error) {
	provider := CurrentProvider()
	if provider == nil {
		return nil, fmt.Errorf("unsupported operating system: %s", goruntime.GOOS)
	}
	return provider.GetStartPlan(targetRuntime)
}

// StartEngine attempts to start the container engine service (daemon/socket/app) directly.
func StartEngine(ctx context.Context, targetRuntime string) error {
	provider := CurrentProvider()
	if provider == nil {
		return fmt.Errorf("unsupported operating system: %s", goruntime.GOOS)
	}
	return provider.StartEngine(ctx, targetRuntime)
}

// Install executes the installation plan for the specified runtime.
func Install(ctx context.Context, targetRuntime string, progressCb func(step int, total int, message string)) error {
	provider := CurrentProvider()
	if provider == nil {
		return fmt.Errorf("unsupported operating system: %s", goruntime.GOOS)
	}
	return provider.Install(ctx, targetRuntime, progressCb)
}
