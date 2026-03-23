//go:build windows

package proc

import (
	"os/exec"
	"strconv"
)

func Kill(cmd *exec.Cmd) error {
	if cmd == nil || cmd.Process == nil {
		return nil
	}

	kill := exec.Command("taskkill", "/PID", strconv.Itoa(cmd.Process.Pid), "/T", "/F")
	if err := kill.Run(); err != nil {
		return cmd.Process.Kill()
	}

	return nil
}
