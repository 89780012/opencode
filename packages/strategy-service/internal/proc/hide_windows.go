//go:build windows

package proc

import (
	"os/exec"
	"syscall"
)

func Hide(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}

	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
}
