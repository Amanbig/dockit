package main

import (
	"embed"
	"os"
	"runtime/debug"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

func init() {
	// WebKitGTK 2.42+ uses DMA-BUF / GBM buffers by default, which fails on NVIDIA drivers
	// with "KMS: DRM_IOCTL_MODE_CREATE_DUMB failed: Permission denied" and "Failed to create GBM buffer".
	// Setting WEBKIT_DISABLE_DMABUF_RENDERER=1 tells WebKitGTK to fall back to standard rendering.
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
	}

	// Optimize Go runtime for desktop memory efficiency:
	// Set target GC percentage to 50% (default 100%) so garbage is collected more frequently,
	// keeping the heap tight and lightweight.
	debug.SetGCPercent(50)

	// Set soft memory limit (256MB) to trigger garbage collection before heap expands.
	debug.SetMemoryLimit(256 * 1024 * 1024)
}

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	// Automatically register icon and desktop entry on Linux for standalone binaries
	installDesktopIntegration(appIcon)

	// Periodic idle OS memory scavenger to return unused heap pages back to the OS
	go func() {
		ticker := time.NewTicker(45 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			debug.FreeOSMemory()
		}
	}()

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "Dockit",
		Width:     1024,
		Height:    768,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Linux: &linux.Options{
			Icon:                appIcon,
			ProgramName:         "dockit",
			WindowIsTranslucent: true,
			WebviewGpuPolicy:    linux.WebviewGpuPolicyOnDemand,
		},
		Windows: &windows.Options{
			DisableFramelessWindowDecorations: false,
			WindowIsTranslucent:               true,
			WebviewIsTransparent:              true,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
