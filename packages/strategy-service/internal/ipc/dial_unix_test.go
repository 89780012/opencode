//go:build !windows

package ipc

import "net"

func dialTest(path string) (net.Conn, error) {
	return net.Dial("unix", path)
}
