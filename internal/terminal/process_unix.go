//go:build !windows

package terminal

import (
	"os/exec"
	"syscall"
)

func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

func killProcessGroup(cmd *exec.Cmd) {
	if cmd != nil && cmd.Process != nil && cmd.Process.Pid > 0 {
		// Send SIGKILL to the negative process group ID to cleanly terminate
		// both the shell and any child processes spawned by it.
		_ = syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
}
