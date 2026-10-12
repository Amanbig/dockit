package main

import (
	"context"
	"fmt"

	dockerclient "dockit/internal/runtime/docker"
    "dockit/internal/containers"
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


func (a *App) GetContainers() ([]containers.Container, error) {
    cli, err := dockerclient.NewClient(a.ctx)
    if err != nil {
        return nil, fmt.Errorf("connect to Docker: %w", err)
    }
    defer cli.Close()

    result, err := cli.ListContainers(a.ctx)
    if err != nil {
        return nil, err
    }

    items := make([]containers.Container, 0, len(result))

    for _, c := range result {
        name := ""
        if len(c.Names) > 0 {
            name = c.Names[0]
            if len(name) > 0 && name[0] == '/' {
                name = name[1:]
            }
        }

        ports := make([]string, 0, len(c.Ports))
        for _, p := range c.Ports {
            ports = append(ports, fmt.Sprintf(
                "%d/%s", p.PublicPort, p.Type,
            ))
        }

        items = append(items, containers.Container{
            ID:     c.ID,
            Name:   name,
            Image:  c.Image,
            Status: c.Status,
            State:  string(c.State),
            Ports:  ports,
        })
    }

    return items, nil
}