package terminal

import (
	"context"
	"os"
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

func TestService_MultiSession(t *testing.T) {
	svc := NewService()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Session 1 and Session 2 should have independent CWD and execution
	res1 := svc.ExecSession(ctx, "tab-1", "echo 'session-1'")
	if !strings.Contains(res1.Output, "session-1") {
		t.Fatalf("expected session-1 output, got: %s", res1.Output)
	}

	res2 := svc.ExecSession(ctx, "tab-2", "echo 'session-2'")
	if !strings.Contains(res2.Output, "session-2") {
		t.Fatalf("expected session-2 output, got: %s", res2.Output)
	}

	// Change cwd in session 1 only
	tmpDir := os.TempDir()
	err := svc.SetCwdSession("tab-1", tmpDir)
	if err != nil {
		t.Fatalf("failed to set cwd in tab-1: %v", err)
	}

	if svc.GetCwdSession("tab-1") != tmpDir {
		t.Fatalf("expected tab-1 cwd %s, got %s", tmpDir, svc.GetCwdSession("tab-1"))
	}

	// Tab-2 should still be at home directory
	if svc.GetCwdSession("tab-2") != svc.GetHomeDir() {
		t.Fatalf("expected tab-2 cwd to be home dir %s, got %s", svc.GetHomeDir(), svc.GetCwdSession("tab-2"))
	}

	// Close tab 1
	svc.CloseSession("tab-1")
}

func TestService_ExecMultiline(t *testing.T) {
	svc := NewService()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := "echo 'line 1'\necho 'line 2'"
	res := svc.Exec(ctx, cmd)
	if res.Error != "" {
		t.Fatalf("unexpected error executing multiline command: %s", res.Error)
	}
	if !strings.Contains(res.Output, "line 1") || !strings.Contains(res.Output, "line 2") {
		t.Fatalf("expected multiline output with line 1 and line 2, got: %s", res.Output)
	}
}
