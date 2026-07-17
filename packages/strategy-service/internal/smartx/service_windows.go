//go:build windows

package smartx

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/UserExistsError/conpty"
)

func (s *Service) run(ctx context.Context, name string, account string, id string, pass string) (string, error) {
	return s.session(ctx, func(write func(string) error, buf *feed) error {
		n := buf.size()
		if err := write(state(name)); err != nil {
			return err
		}
		if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
			"status extension failed",
			"statusExtension failed",
			"not found",
			"error",
		}, "smartx statusExtension timeout"); err != nil {
			return err
		}
		all := buf.text()
		if live(all[n:]) {
			n = buf.size()
			if err := write(halt(name)); err != nil {
				return err
			}
			if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
				"close extension failed",
				"closeExtension failed",
				"not found",
				"error",
			}, "smartx closeExtension timeout"); err != nil {
				return err
			}
		}

		n = buf.size()
		if err := write(fmt.Sprintf("startExtension %s", name)); err != nil {
			return err
		}
		if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{
			"start extension failed",
			"startExtension failed",
			"not found",
			"error",
		}, "smartx startExtension timeout"); err != nil {
			return err
		}
		n = buf.size()
		if err := write(state(name)); err != nil {
			return err
		}
		if err := waitTail(ctx, buf, n, []string{"smartx>"}, []string{"status extension failed", "not found", "error"}, "smartx statusExtension timeout"); err != nil {
			return err
		}
		if !live(buf.text()[n:]) {
			return fmt.Errorf("extension did not stay running")
		}
		return nil
	})
}

func (s *Service) status(ctx context.Context, name string) (string, error) {
	return s.command(ctx, state(name))
}

func (s *Service) backtest(ctx context.Context, name string, body string) (string, error) {
	return s.command(ctx, startBacktest(name, body))
}

func (s *Service) progress(ctx context.Context, name string, id string) (string, error) {
	return s.command(ctx, queryBacktest(name, id))
}

func (s *Service) command(ctx context.Context, call string) (string, error) {
	body := ""
	_, err := s.session(ctx, func(write func(string) error, buf *feed) error {
		start := buf.size()
		if err := write(call); err != nil {
			return err
		}
		if err := waitTail(ctx, buf, start, []string{"smartx>"}, []string{}, "smartx command timeout"); err != nil {
			return err
		}
		body = buf.text()[start:]
		return nil
	})
	if err != nil {
		return "", err
	}
	return tidy(body), nil
}

func (s *Service) session(ctx context.Context, fn func(func(string) error, *feed) error) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, s.cfg.Timeout)
	defer cancel()

	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	pty, err := conpty.Start("smartx-cli",
		conpty.ConPtyDimensions(120, 40),
		conpty.ConPtyWorkDir(dir),
		conpty.ConPtyEnv(os.Environ()),
	)
	if err != nil {
		return "", err
	}

	buf := &feed{}
	done := make(chan error, 1)
	go func() {
		_, err := pty.Wait(ctx)
		done <- err
	}()
	go read(buf, pty)
	defer func() {
		_ = pty.Close()
		select {
		case <-done:
		case <-time.After(time.Second):
		}
	}()

	write := func(text string) error {
		_, err := pty.Write([]byte(text + "\r\n"))
		return err
	}

	if err := wait(ctx, buf, []string{"smartx>"}, []string{
		"is not recognized as an internal or external command",
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
	if err := fn(write, buf); err != nil {
		return "", err
	}
	_ = write("exit")
	return tidy(buf.text()), nil
}
