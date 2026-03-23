//go:build windows

package proc

import (
	"os/exec"
	"syscall"
)

const noWindow = 0x08000000

func Hide(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}

	attr := cmd.SysProcAttr
	if attr == nil {
		attr = &syscall.SysProcAttr{}
	}
	attr.HideWindow = true
	attr.CreationFlags |= noWindow
	cmd.SysProcAttr = attr
}
