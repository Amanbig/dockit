package terminal

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// Result represents the outcome of executing a host shell command.
type Result struct {
	Output string `json:"output"`
	Cwd    string `json:"cwd"`
	Error  string `json:"error,omitempty"`
}

// Service provides host shell command execution with stateful working directory management.
type Service struct {
	mu  sync.Mutex
	cwd string
}

// NewService initializes a new terminal service starting in user home directory.
func NewService() *Service {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home, _ = os.Getwd()
	}
	return &Service{
		cwd: home,
	}
}

// GetCwd returns current working directory.
func (s *Service) GetCwd() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.cwd
}

// SetCwd changes the working directory.
func (s *Service) SetCwd(dir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	target := strings.TrimSpace(dir)
	if target == "~" || strings.HasPrefix(target, "~/") {
		home, _ := os.UserHomeDir()
		if target == "~" {
			target = home
		} else {
			target = filepath.Join(home, strings.TrimPrefix(target, "~/"))
		}
	} else if !filepath.IsAbs(target) {
		target = filepath.Join(s.cwd, target)
	}

	clean := filepath.Clean(target)
	fi, err := os.Stat(clean)
	if err != nil || !fi.IsDir() {
		return fmt.Errorf("directory does not exist: %s", dir)
	}
	s.cwd = clean
	return nil
}

// Exec executes a host shell command in the current working directory.
func (s *Service) Exec(ctx context.Context, command string) Result {
	s.mu.Lock()
	defer s.mu.Unlock()

	trimmed := strings.TrimSpace(command)
	if trimmed == "" {
		return Result{Cwd: s.cwd}
	}

	// Internal handling for 'cd' commands to maintain stateful directory navigation
	if trimmed == "cd" {
		if home, err := os.UserHomeDir(); err == nil {
			s.cwd = home
		}
		return Result{Cwd: s.cwd}
	}

	if strings.HasPrefix(trimmed, "cd ") {
		target := strings.TrimSpace(strings.TrimPrefix(trimmed, "cd "))
		target = strings.Trim(target, "\"'")
		if target == "~" || strings.HasPrefix(target, "~/") {
			home, _ := os.UserHomeDir()
			if target == "~" {
				target = home
			} else {
				target = filepath.Join(home, strings.TrimPrefix(target, "~/"))
			}
		} else if !filepath.IsAbs(target) {
			target = filepath.Join(s.cwd, target)
		}
		clean := filepath.Clean(target)
		fi, err := os.Stat(clean)
		if err != nil || !fi.IsDir() {
			return Result{
				Cwd:   s.cwd,
				Error: fmt.Sprintf("cd: no such file or directory: %s", target),
			}
		}
		s.cwd = clean
		return Result{Cwd: s.cwd}
	}

	// Determine shell depending on OS
	var shell, flag string
	if runtime.GOOS == "windows" {
		shell = "cmd.exe"
		flag = "/c"
	} else {
		// Prefer user's SHELL or bash, then zsh, fallback to sh
		if envShell := os.Getenv("SHELL"); envShell != "" {
			shell = envShell
		} else if p, err := exec.LookPath("bash"); err == nil {
			shell = p
		} else if p, err := exec.LookPath("zsh"); err == nil {
			shell = p
		} else {
			shell = "sh"
		}
		flag = "-c"
	}

	execCtx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(execCtx, shell, flag, trimmed)
	cmd.Dir = s.cwd
	cmd.Env = os.Environ()

	var combined bytes.Buffer
	cmd.Stdout = &combined
	cmd.Stderr = &combined

	err := cmd.Run()
	outStr := combined.String()

	res := Result{
		Output: outStr,
		Cwd:    s.cwd,
	}
	if err != nil && outStr == "" {
		res.Error = err.Error()
	}
	return res
}
