//go:build !windows

package smartx

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"
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
		"登录失败",
		"login failed",
		"invalid account",
	}, "smartx login timeout"); err != nil {
		return "", err
	}

	if err := write(pass); err != nil {
		return "", err
	}
	if err := wait(ctx, buf, []string{
		"登录成功",
		"login success",
	}, []string{
		"登录失败",
		"login failed",
		"密码错误",
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
		"失败",
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
			"失败",
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
		"失败",
	}, "smartx startExtension timeout"); err != nil {
		return "", err
	}

	_ = write("exit")
	return tidy(buf.text()), nil
}

func (s *Service) backtest(ctx context.Context, name string, body string) (string, error) {
	return s.once(ctx, startBacktest(name, body))
}

func (s *Service) progress(ctx context.Context, name string, id string) (string, error) {
	return s.once(ctx, queryBacktest(name, id))
}

func (s *Service) once(ctx context.Context, call string) (string, error) {
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

	if err := write(login(strings.TrimSpace(s.cfg.Account), strings.TrimSpace(s.cfg.WindowId))); err != nil {
		return "", err
	}
	if err := wait(ctx, buf, []string{"password:"}, []string{
		"登录失败",
		"login failed",
		"invalid account",
	}, "smartx login timeout"); err != nil {
		return "", err
	}
	if err := write("123456"); err != nil {
		return "", err
	}
	if err := wait(ctx, buf, []string{
		"登录成功",
		"login success",
	}, []string{
		"登录失败",
		"login failed",
		"密码错误",
		"incorrect password",
	}, "smartx login timeout"); err != nil {
		return "", err
	}

	n := buf.size()
	if err := write(call); err != nil {
		return "", err
	}
	if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{}, "smartx command timeout"); err != nil {
		return "", err
	}

	_ = write("exit")
	return tidy(buf.text()[n:]), nil
}
