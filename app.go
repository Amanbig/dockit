package main

import (
	"context"
	"fmt"

	"dockit/internal/containers"
	dockerclient "dockit/internal/runtime/docker"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetContainers returns the list of containers using the containers Service.
func (a *App) GetContainers() ([]containers.Container, error) {
	cli, err := dockerclient.NewClient(a.ctx)
	if err != nil {
		return nil, fmt.Errorf("connect to Docker: %w", err)
	}
	defer cli.Close()

	svc := containers.NewService(cli)
	return svc.List(a.ctx, true)
}