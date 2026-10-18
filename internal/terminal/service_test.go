package terminal

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestService_ExecBasic(t *testing.T) {
	svc := NewService()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res := svc.Exec(ctx, "echo 'hello dockit'")
	if res.Error != "" {
		t.Fatalf("unexpected error: %s", res.Error)
	}
	if !strings.Contains(res.Output, "hello dockit") {
		t.Fatalf("expected output to contain 'hello dockit', got: %s", res.Output)
	}
}

func TestService_InteractiveCommandRejected(t *testing.T) {
	svc := NewService()
	ctx := context.Background()

	res := svc.Exec(ctx, "nano test.txt")
	if res.Error == "" {
		t.Fatalf("expected error blocking interactive command 'nano', got none")
	}
	if !strings.Contains(res.Error, "requiring an interactive TTY") {
		t.Fatalf("expected interactive error message, got: %s", res.Error)
	}
}

func TestService_SetCwd(t *testing.T) {
	svc := NewService()
	home := svc.GetHomeDir()

	err := svc.SetCwd(home)
	if err != nil {
		t.Fatalf("failed to set cwd to home: %v", err)
	}
	if svc.GetCwd() != home {
		t.Fatalf("expected cwd %s, got %s", home, svc.GetCwd())
	}

	err = svc.SetCwd("/path_that_does_not_exist_at_all_12345")
	if err == nil {
		t.Fatalf("expected error for non-existent path, got nil")
	}
}

func TestService_Cancel(t *testing.T) {
	svc := NewService()
	done := make(chan Result, 1)

	go func() {
		res := svc.Exec(context.Background(), "sleep 5")
		done <- res
	}()

	time.Sleep(100 * time.Millisecond)
	canceled := svc.Cancel()
	if !canceled {
		t.Fatalf("expected Cancel() to return true for running sleep")
	}

	res := <-done
	if !strings.Contains(res.Error, "canceled") {
		t.Fatalf("expected canceled error in result, got: %s", res.Error)
	}
}
