package main

import (
	"embed"
	"os"

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
	// On Linux systems with NVIDIA drivers lacking DRI2/GBM screen support (e.g. GeForce GT 730),
	// Mesa libEGL prints driver (null) warnings when compositing modes are attempted.
	if os.Getenv("WEBKIT_DISABLE_COMPOSITING_MODE") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
	}
}

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var appIcon []byte

func main() {
	// Automatically register icon and desktop entry on Linux for standalone binaries
	installDesktopIntegration(appIcon)

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
			WebviewGpuPolicy:    linux.WebviewGpuPolicyNever,
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
