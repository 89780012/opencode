//go:build !windows

package ipc

import (
	"errors"
	"net"
	"os"
)

func listen(path string) (net.Listener, error) {
	_, err := os.Stat(path)
	if err == nil {
		conn, derr := net.Dial("unix", path)
		if derr == nil {
			_ = conn.Close()
			return nil, errInUse
		}

		err = os.Remove(path)
		if err != nil {
			return nil, err
		}
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	return net.Listen("unix", path)
}
