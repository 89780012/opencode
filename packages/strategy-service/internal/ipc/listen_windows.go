//go:build windows

package ipc

import (
	"net"
	"os"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

const (
	pipeAccessDuplex       = 0x00000003
	fileFlagFirstInstance  = 0x00080000
	pipeTypeByte           = 0x00000000
	pipeReadmodeByte       = 0x00000000
	pipeWait               = 0x00000000
	pipeUnlimitedInstances = 255
	errPipeConnected       = syscall.Errno(535)
	invalidHandle          = ^uintptr(0)
)

type pipeListener struct {
	path   string
	mu     sync.Mutex
	closed bool
	next   syscall.Handle
}

type pipeConn struct {
	file *os.File
	path string
}

type pipeAddr string

var (
	kernel32            = syscall.NewLazyDLL("kernel32.dll")
	procCreateNamedPipe = kernel32.NewProc("CreateNamedPipeW")
	procConnectPipe     = kernel32.NewProc("ConnectNamedPipe")
)

func listen(path string) (net.Listener, error) {
	h, err := makePipe(path, true)
	if err != nil {
		return nil, err
	}

	return &pipeListener{
		path: path,
		next: h,
	}, nil
}

func (l *pipeListener) Accept() (net.Conn, error) {
	l.mu.Lock()
	if l.closed {
		l.mu.Unlock()
		return nil, net.ErrClosed
	}

	h := l.next
	l.next = 0
	l.mu.Unlock()

	var err error
	if h == 0 {
		h, err = makePipe(l.path, false)
		if err != nil {
			return nil, err
		}
	}

	l.mu.Lock()
	closed := l.closed
	l.mu.Unlock()
	if closed {
		_ = syscall.CloseHandle(h)
		return nil, net.ErrClosed
	}

	err = connectPipe(h)
	if err != nil && err != errPipeConnected {
		_ = syscall.CloseHandle(h)
		return nil, err
	}

	l.mu.Lock()
	closed = l.closed
	l.mu.Unlock()
	if closed {
		_ = syscall.CloseHandle(h)
		return nil, net.ErrClosed
	}

	return &pipeConn{
		file: os.NewFile(uintptr(h), l.path),
		path: l.path,
	}, nil
}

func (l *pipeListener) Close() error {
	l.mu.Lock()
	if l.closed {
		l.mu.Unlock()
		return nil
	}
	l.closed = true
	path := l.path
	next := l.next
	l.next = 0
	l.mu.Unlock()

	if next != 0 {
		_ = syscall.CloseHandle(next)
	}

	conn, err := dial(path)
	if err == nil {
		_ = conn.Close()
	}
	return nil
}

func (l *pipeListener) Addr() net.Addr {
	return pipeAddr(l.path)
}

func makePipe(path string, first bool) (syscall.Handle, error) {
	mode := uint32(pipeAccessDuplex)
	if first {
		mode |= fileFlagFirstInstance
	}

	name, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, err
	}

	return createNamedPipe(name, mode)
}

func dial(path string) (net.Conn, error) {
	name, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return nil, err
	}

	h, err := syscall.CreateFile(
		name,
		syscall.GENERIC_READ|syscall.GENERIC_WRITE,
		0,
		nil,
		syscall.OPEN_EXISTING,
		0,
		0,
	)
	if err != nil {
		return nil, err
	}

	return &pipeConn{
		file: os.NewFile(uintptr(h), path),
		path: path,
	}, nil
}

func (c *pipeConn) Read(buf []byte) (int, error) {
	return c.file.Read(buf)
}

func (c *pipeConn) Write(buf []byte) (int, error) {
	return c.file.Write(buf)
}

func (c *pipeConn) Close() error {
	return c.file.Close()
}

func (c *pipeConn) LocalAddr() net.Addr {
	return pipeAddr(c.path)
}

func (c *pipeConn) RemoteAddr() net.Addr {
	return pipeAddr(c.path)
}

func (c *pipeConn) SetDeadline(t time.Time) error {
	return c.file.SetDeadline(t)
}

func (c *pipeConn) SetReadDeadline(t time.Time) error {
	return c.file.SetReadDeadline(t)
}

func (c *pipeConn) SetWriteDeadline(t time.Time) error {
	return c.file.SetWriteDeadline(t)
}

func (a pipeAddr) Network() string {
	return "pipe"
}

func (a pipeAddr) String() string {
	return string(a)
}

func createNamedPipe(name *uint16, mode uint32) (syscall.Handle, error) {
	r1, _, err := procCreateNamedPipe.Call(
		uintptr(unsafe.Pointer(name)),
		uintptr(mode),
		uintptr(pipeTypeByte|pipeReadmodeByte|pipeWait),
		uintptr(pipeUnlimitedInstances),
		uintptr(64*1024),
		uintptr(64*1024),
		0,
		0,
	)
	if r1 == invalidHandle {
		if err != syscall.Errno(0) {
			return 0, err
		}
		return 0, syscall.EINVAL
	}
	return syscall.Handle(r1), nil
}

func connectPipe(h syscall.Handle) error {
	r1, _, err := procConnectPipe.Call(uintptr(h), 0)
	if r1 != 0 {
		return nil
	}
	if err != syscall.Errno(0) {
		return err
	}
	return syscall.EINVAL
}
