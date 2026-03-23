//go:build windows

package proc

import (
	"os"
	"os/exec"
	"strconv"
)

func Kill(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}

	return KillPID(cmd.Process.Pid)
}

func KillPID(pid int) error {
	if pid <= 0 {
		return nil
	}

	kill := exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/T", "/F")
	Hide(kill)
	if err := kill.Run(); err != nil {
		proc, find := os.FindProcess(pid)
		if find != nil {
			return err
		}
		return proc.Kill()
	}

	return nil
}
