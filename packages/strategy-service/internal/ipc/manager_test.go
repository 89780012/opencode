package ipc

import (
	"context"
	"io"
	"net"
	"strconv"
	"testing"
	"time"
)

func TestManagerReplyUsesLastAccount(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	m := New(Config{
		Enabled: true,
		Product: "IDE-IPC-TEST-" + strconv.FormatInt(time.Now().UnixNano(), 10),
	})

	if err := m.Start(ctx); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = m.Stop(context.Background())
	}()

	state := m.State()
	smart, err := waitConn(state.SmartHandle)
	if err != nil {
		t.Fatal(err)
	}
	defer smart.Close()

	cont, err := waitConn(state.ContinueHandle)
	if err != nil {
		t.Fatal(err)
	}
	defer cont.Close()

	_, err = smart.Write([]byte(`accountInfo:{"userId":"a","name":"one"}`))
	if err != nil {
		t.Fatal(err)
	}

	if err := waitState(ctx, m, func(state State) bool {
		return state.AccountCount == 1 && state.LastUserID == "a"
	}); err != nil {
		t.Fatal(err)
	}

	_, err = smart.Write([]byte(`accountInfo:{"userId":"b","name":"two"}`))
	if err != nil {
		t.Fatal(err)
	}

	if err := waitState(ctx, m, func(state State) bool {
		return state.AccountCount == 2 && state.LastUserID == "b"
	}); err != nil {
		t.Fatal(err)
	}

	_, err = cont.Write([]byte(msgQuery))
	if err != nil {
		t.Fatal(err)
	}

	body, err := read(cont)
	if err != nil {
		t.Fatal(err)
	}

	want := `queryAccountInfoRsp:{"userId":"b","name":"two"}`
	if body != want {
		t.Fatalf("unexpected reply: %s", body)
	}
}

func TestManagerDropsAccountOnClose(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	m := New(Config{
		Enabled: true,
		Product: "IDE-IPC-TEST-" + strconv.FormatInt(time.Now().UnixNano(), 10),
	})

	if err := m.Start(ctx); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = m.Stop(context.Background())
	}()

	smart, err := waitConn(m.State().SmartHandle)
	if err != nil {
		t.Fatal(err)
	}

	_, err = smart.Write([]byte(`accountInfo:{"userId":"a"}`))
	if err != nil {
		t.Fatal(err)
	}

	if err := waitState(ctx, m, func(state State) bool {
		return state.AccountCount == 1
	}); err != nil {
		t.Fatal(err)
	}

	_ = smart.Close()

	if err := waitState(ctx, m, func(state State) bool {
		return state.AccountCount == 0
	}); err != nil {
		t.Fatal(err)
	}
}

func waitConn(path string) (net.Conn, error) {
	limit := time.Now().Add(2 * time.Second)
	for time.Now().Before(limit) {
		conn, err := dialTest(path)
		if err == nil {
			return conn, nil
		}
		time.Sleep(25 * time.Millisecond)
	}
	return nil, context.DeadlineExceeded
}

func waitState(ctx context.Context, m *Manager, fn func(State) bool) error {
	tick := time.NewTicker(25 * time.Millisecond)
	defer tick.Stop()

	for {
		if fn(m.State()) {
			return nil
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
		}
	}
}

func read(conn net.Conn) (string, error) {
	buf := make([]byte, 1024)
	_ = conn.SetReadDeadline(time.Now().Add(time.Second))
	n, err := conn.Read(buf)
	if err != nil {
		if err == io.EOF {
			return "", nil
		}
		return "", err
	}
	return string(buf[:n]), nil
}
