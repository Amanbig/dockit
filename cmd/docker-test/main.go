
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	dockerclient "dockit/internal/runtime/docker"
)

func main() {
	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	cli, err := dockerclient.NewClient(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to Docker: %v", err)
	}
	defer cli.Close()

	containers, err := cli.ListContainers(ctx)
	if err != nil {
		log.Fatalf("Failed to list containers: %v", err)
	}

	if len(containers) == 0 {
		fmt.Println("No containers found.")
		return
	}

	for _, c := range containers {
		fmt.Printf(
			"ID: %.12s | Image: %s | Status: %s\n",
			c.ID,
			c.Image,
			c.Status,
		)
	}
}
