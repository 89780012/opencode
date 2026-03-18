//go:build !windows

package proc

import "os/exec"

func Hide(*exec.Cmd) {}
