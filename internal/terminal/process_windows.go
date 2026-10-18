//go:build windows

package terminal

import (
	"os/exec"
)

func setSysProcAttr(cmd *exec.Cmd) {
}

func killProcessGroup(cmd *exec.Cmd) {
	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
}
