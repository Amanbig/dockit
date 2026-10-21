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

var interactiveCommands = map[string]string{
	"vim":   "text editor",
	"vi":    "text editor",
	"nvim":  "text editor",
	"nano":  "text editor",
	"pico":  "text editor",
	"emacs": "text editor",
	"top":   "interactive process monitor",
	"htop":  "interactive process monitor",
	"btop":  "interactive process monitor",
	"less":  "interactive pager",
	"more":  "interactive pager",
	"man":   "interactive manual pager",
	"watch": "interactive display monitor",
}

// Session represents a single terminal tab session with isolated working directory and execution state.
type Session struct {
	mu            sync.Mutex
	cwd           string
	currentCancel context.CancelFunc
	currentCmd    *exec.Cmd
}

// Service provides host shell command execution with multi-tab stateful working directory management.
type Service struct {
	mu       sync.Mutex
	homeDir  string
	sessions map[string]*Session
}

// NewService initializes a new terminal service starting in user home directory.
func NewService() *Service {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		home, _ = os.Getwd()
	}
	return &Service{
		homeDir:  home,
		sessions: make(map[string]*Session),
	}
}

// GetHomeDir returns the user's home directory.
func (s *Service) GetHomeDir() string {
	return s.homeDir
}

func (s *Service) getSession(id string) *Session {
	if id == "" {
		id = "default"
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, exists := s.sessions[id]
	if !exists {
		sess = &Session{cwd: s.homeDir}
		s.sessions[id] = sess
	}
	return sess
}

// GetCwdSession returns current working directory for a given session.
func (s *Service) GetCwdSession(id string) string {
	sess := s.getSession(id)
	sess.mu.Lock()
	defer sess.mu.Unlock()
	return sess.cwd
}

// SetCwdSession changes the working directory for a given session.
func (s *Service) SetCwdSession(id string, dir string) error {
	sess := s.getSession(id)
	sess.mu.Lock()
	defer sess.mu.Unlock()

	target := strings.TrimSpace(dir)
	if target == "~" || strings.HasPrefix(target, "~/") {
		home := s.homeDir
		if target == "~" {
			target = home
		} else {
			target = filepath.Join(home, strings.TrimPrefix(target, "~/"))
		}
	} else if !filepath.IsAbs(target) {
		target = filepath.Join(sess.cwd, target)
	}

	clean := filepath.Clean(target)
	fi, err := os.Stat(clean)
	if err != nil || !fi.IsDir() {
		return fmt.Errorf("directory does not exist: %s", dir)
	}
	sess.cwd = clean
	return nil
}

// CancelSession terminates the currently running command in a given session if active.
func (s *Service) CancelSession(id string) bool {
	sess := s.getSession(id)
	sess.mu.Lock()
	defer sess.mu.Unlock()
	if sess.currentCancel != nil {
		sess.currentCancel()
		if sess.currentCmd != nil {
			killProcessGroup(sess.currentCmd)
		}
		sess.currentCancel = nil
		sess.currentCmd = nil
		return true
	}
	return false
}

// CloseSession terminates any running command in the session and frees its state.
func (s *Service) CloseSession(id string) {
	if id == "" {
		id = "default"
	}
	s.mu.Lock()
	sess, exists := s.sessions[id]
	if exists {
		delete(s.sessions, id)
	}
	s.mu.Unlock()

	if sess != nil {
		sess.mu.Lock()
		if sess.currentCancel != nil {
			sess.currentCancel()
			if sess.currentCmd != nil {
				killProcessGroup(sess.currentCmd)
			}
			sess.currentCancel = nil
			sess.currentCmd = nil
		}
		sess.mu.Unlock()
	}
}

// ExecSession executes a host shell command in the specific session's working directory.
func (s *Service) ExecSession(ctx context.Context, id string, command string) Result {
	sess := s.getSession(id)

	trimmed := strings.TrimSpace(command)
	if trimmed == "" {
		sess.mu.Lock()
		defer sess.mu.Unlock()
		return Result{Cwd: sess.cwd}
	}

	sess.mu.Lock()
	currentCwd := sess.cwd
	homeDir := s.homeDir
	sess.mu.Unlock()

	// Internal handling for 'cd' commands to maintain stateful directory navigation
	if trimmed == "cd" {
		sess.mu.Lock()
		sess.cwd = homeDir
		newCwd := sess.cwd
		sess.mu.Unlock()
		return Result{Cwd: newCwd}
	}

	if strings.HasPrefix(trimmed, "cd ") {
		target := strings.TrimSpace(strings.TrimPrefix(trimmed, "cd "))
		target = strings.Trim(target, "\"'")
		if target == "~" || strings.HasPrefix(target, "~/") {
			if target == "~" {
				target = homeDir
			} else {
				target = filepath.Join(homeDir, strings.TrimPrefix(target, "~/"))
			}
		} else if !filepath.IsAbs(target) {
			target = filepath.Join(currentCwd, target)
		}
		clean := filepath.Clean(target)
		fi, err := os.Stat(clean)
		if err != nil || !fi.IsDir() {
			return Result{
				Cwd:   currentCwd,
				Error: fmt.Sprintf("cd: no such file or directory: %s", target),
			}
		}
		sess.mu.Lock()
		sess.cwd = clean
		newCwd := sess.cwd
		sess.mu.Unlock()
		return Result{Cwd: newCwd}
	}

	// Intercept known full-screen interactive TTY applications that cannot run without a PTY
	fields := strings.Fields(trimmed)
	if len(fields) > 0 {
		baseCmd := strings.ToLower(filepath.Base(fields[0]))
		if desc, isInteractive := interactiveCommands[baseCmd]; isInteractive {
			arg := ""
			if len(fields) > 1 {
				arg = fields[1]
			}
			hint := ""
			switch baseCmd {
			case "vim", "vi", "nvim", "nano", "pico", "emacs":
				if arg != "" {
					hint = fmt.Sprintf("\nTips:\n  • View file content: cat %s\n  • Open in system editor: xdg-open %s (or code %s)", arg, arg, arg)
				} else {
					hint = "\nTip: To edit files, use 'xdg-open <file>' (or 'open' on Mac / 'code <file>') or view with 'cat <file>'."
				}
			case "top", "htop", "btop":
				hint = "\nTip: For non-interactive status, use 'ps aux' or 'docker stats --no-stream'."
			case "less", "more", "man":
				if arg != "" {
					hint = fmt.Sprintf("\nTip: View complete text non-interactively using 'cat %s'.", arg)
				} else {
					hint = "\nTip: Use 'cat <file>' to display text without an interactive pager."
				}
			}
			return Result{
				Cwd:   currentCwd,
				Error: fmt.Sprintf("'%s' is an %s requiring an interactive TTY and cannot run inside an inline subshell.%s", baseCmd, desc, hint),
			}
		}
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

	cmd := exec.CommandContext(execCtx, shell, flag, trimmed)
	cmd.Dir = currentCwd
	cmd.Env = os.Environ()
	setSysProcAttr(cmd)

	var combined bytes.Buffer
	cmd.Stdout = &combined
	cmd.Stderr = &combined

	sess.mu.Lock()
	sess.currentCancel = cancel
	sess.currentCmd = cmd
	sess.mu.Unlock()

	defer func() {
		sess.mu.Lock()
		if execCtx.Err() != nil && sess.currentCmd != nil {
			killProcessGroup(sess.currentCmd)
		}
		sess.currentCancel = nil
		sess.currentCmd = nil
		sess.mu.Unlock()
		cancel()
	}()

	err := cmd.Run()
	outStr := combined.String()

	sess.mu.Lock()
	finalCwd := sess.cwd
	sess.mu.Unlock()

	res := Result{
		Output: outStr,
		Cwd:    finalCwd,
	}

	if execCtx.Err() == context.Canceled {
		res.Error = "^C (command canceled)"
	} else if execCtx.Err() == context.DeadlineExceeded {
		res.Error = "Command timed out (exceeded 120s limit)"
	} else if err != nil && outStr == "" {
		res.Error = err.Error()
	}
	return res
}

// GetCwd returns current working directory for the default session.
func (s *Service) GetCwd() string {
	return s.GetCwdSession("default")
}

// SetCwd changes the working directory for the default session.
func (s *Service) SetCwd(dir string) error {
	return s.SetCwdSession("default", dir)
}

// Cancel terminates the currently running command in the default session if active.
func (s *Service) Cancel() bool {
	return s.CancelSession("default")
}

// Exec executes a host shell command in the default session.
func (s *Service) Exec(ctx context.Context, command string) Result {
	return s.ExecSession(ctx, "default", command)
}
