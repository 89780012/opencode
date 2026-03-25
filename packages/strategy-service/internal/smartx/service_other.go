//go:build !windows

package smartx

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"time"

	"strategy-service/internal/proc"
)

func (s *Service) run(ctx context.Context, name string, account string, id string, pass string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, s.cfg.Timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "smartx-cli")
	proc.Hide(cmd)

	in, err := cmd.StdinPipe()
	if err != nil {
		return "", err
	}

	out, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}

	er, err := cmd.StderrPipe()
	if err != nil {
		return "", err
	}

	if err := cmd.Start(); err != nil {
		return "", err
	}

	buf := &feed{}
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()
	go read(buf, out)
	go read(buf, er)
	defer func() {
		_ = in.Close()
		select {
		case <-done:
			return
		default:
		}
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		select {
		case <-done:
		case <-time.After(time.Second):
		}
	}()

	write := func(text string) error {
		_, err := io.WriteString(in, text+"\n")
		return err
	}

	if err := wait(ctx, buf, []string{"smartx>"}, []string{
		"command not found",
		"no such file or directory",
	}, "smartx cli timeout"); err != nil {
		return "", err
	}

	if err := write(login(account, id)); err != nil {
		return "", err
	}
	if err := wait(ctx, buf, []string{"password:"}, []string{
		"\u767b\u5f55\u5931\u8d25",
		"login failed",
		"invalid account",
	}, "smartx login timeout"); err != nil {
		return "", err
	}

	if err := write(pass); err != nil {
		return "", err
	}
	if err := wait(ctx, buf, []string{
		"\u767b\u5f55\u6210\u529f",
		"login success",
	}, []string{
		"\u767b\u5f55\u5931\u8d25",
		"login failed",
		"\u5bc6\u7801\u9519\u8bef",
		"incorrect password",
	}, "smartx login timeout"); err != nil {
		return "", err
	}

	n := buf.size()
	if err := write(state(name)); err != nil {
		return "", err
	}
	if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
		"status extension failed",
		"statusExtension failed",
		"not found",
		"error",
		"\u5931\u8d25",
	}, "smartx statusExtension timeout"); err != nil {
		return "", err
	}
	all := buf.text()
	if live(all[n:]) {
		n = buf.size()
		if err := write(halt(name)); err != nil {
			return "", err
		}
		if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
			"close extension failed",
			"closeExtension failed",
			"not found",
			"error",
			"\u5931\u8d25",
		}, "smartx closeExtension timeout"); err != nil {
			return "", err
		}
	}

	n = buf.size()
	if err := write(fmt.Sprintf("startExtension %s", name)); err != nil {
		return "", err
	}
	if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
		"start extension failed",
		"startExtension failed",
		"not found",
		"error",
		"\u5931\u8d25",
	}, "smartx startExtension timeout"); err != nil {
		return "", err
	}

	_ = write("exit")
	return tidy(buf.text()), nil
}
