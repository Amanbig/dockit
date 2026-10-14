package main

import (
	"context"
	"testing"
	"time"
)

func TestAllMethods(t *testing.T) {
	app := NewApp()
	ctx := context.Background()
	app.startup(ctx)

	testFn := func(name string, fn func()) {
		done := make(chan bool)
		go func() {
			fn()
			done <- true
		}()
		select {
		case <-done:
			t.Logf("PASS: %s", name)
		case <-time.After(3 * time.Second):
			t.Fatalf("TIMEOUT/HANG: %s", name)
		}
	}

	testFn("GetActiveRuntime", func() { app.GetActiveRuntime() })
	testFn("GetSystemInfo", func() { app.GetSystemInfo() })
	testFn("GetHostMetrics", func() { app.GetHostMetrics() })
	testFn("DetectRuntimes", func() { app.DetectRuntimes() })
	testFn("GetContainers", func() { app.GetContainers(true) })
	testFn("GetImages", func() { app.GetImages(false) })
	testFn("GetVolumes", func() { app.GetVolumes() })
	testFn("GetNetworks", func() { app.GetNetworks() })
	testFn("GetFavorites", func() { app.GetFavorites() })
	testFn("GetConfig", func() { app.GetConfig() })
	testFn("GetAppVersion", func() { app.GetAppVersion() })

	// Test switching to an offline / not installed runtime (Podman)
	testFn("SwitchRuntimeToPodman", func() {
		app.SwitchRuntime("podman")
	})
	testFn("GetSystemInfoAfterSwitch", func() { app.GetSystemInfo() })
	testFn("GetContainersAfterSwitch", func() { app.GetContainers(true) })
	testFn("DetectRuntimesAfterSwitch", func() { app.DetectRuntimes() })
}
