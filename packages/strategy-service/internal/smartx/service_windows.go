//go:build windows

package smartx

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/UserExistsError/conpty"
)

func (s *Service) run(ctx context.Context, name string, account string, id string, pass string) (string, error) {
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
		"\u4e0d\u662f\u5185\u90e8\u6216\u5916\u90e8\u547d\u4ee4",
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
