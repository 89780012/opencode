package ipc

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"os"
	"strings"
	"sync"
	"time"
)

type Manager struct {
	cfg Config

	mu      sync.RWMutex
	smart   net.Listener
	cont    net.Listener
	account map[string]Entry
	order   []string
	smartUp map[net.Conn]struct{}
	contUp  map[net.Conn]struct{}
	smartID string
	contID  string
	wg      sync.WaitGroup
}

func New(cfg Config) *Manager {
	if strings.TrimSpace(cfg.Product) == "" {
		cfg.Product = "IDE"
	}

	return &Manager{
		cfg:     cfg,
		account: map[string]Entry{},
		smartUp: map[net.Conn]struct{}{},
		contUp:  map[net.Conn]struct{}{},
	}
}

func (m *Manager) Start(context.Context) error {
	if !m.cfg.Enabled {
		slog.Info("ipc disabled, skipping start")
		return nil
	}

	m.mu.Lock()
	if m.smart != nil || m.cont != nil {
		m.mu.Unlock()
		slog.Debug("ipc already started")
		return nil
	}
	m.mu.Unlock()

	smartID, err := handle(m.cfg.Product, "IDESmartXServer", m.cfg.Version)
	if err != nil {
		slog.Error("ipc smart handle failed", "error", err)
		return err
	}

	contID, err := handle(m.cfg.Product, "IDEContinueServer", m.cfg.Version)
	if err != nil {
		slog.Error("ipc continue handle failed", "error", err)
		return err
	}

	slog.Info("ipc listening", "smart_handle", smartID, "continue_handle", contID)

	smart, err := listen(smartID)
	if err != nil {
		slog.Error("ipc smart listen failed", "handle", smartID, "error", err)
		return err
	}

	cont, err := listen(contID)
	if err != nil {
		slog.Error("ipc continue listen failed", "handle", contID, "error", err)
		_ = smart.Close()
		return err
	}

	m.mu.Lock()
	m.smart = smart
	m.cont = cont
	m.smartID = smartID
	m.contID = contID
	m.mu.Unlock()

	m.wg.Add(2)
	go m.serveSmart(smart)
	go m.serveCont(cont)
	slog.Info("ipc started successfully")
	return nil
}

func (m *Manager) Stop(ctx context.Context) error {
	slog.Info("stopping ipc manager")
	m.mu.Lock()
	smart := m.smart
	cont := m.cont
	m.smart = nil
	m.cont = nil
	m.mu.Unlock()

	if smart != nil {
		_ = smart.Close()
	}
	if cont != nil {
		_ = cont.Close()
	}

	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-ctx.Done():
		slog.Warn("ipc stop timed out")
		return ctx.Err()
	case <-done:
		slog.Info("ipc manager stopped")
		return nil
	}
}

func (m *Manager) State() State {
	m.mu.RLock()
	defer m.mu.RUnlock()

	state := State{
		Enabled:           m.cfg.Enabled,
		SmartHandle:       m.smartID,
		ContinueHandle:    m.contID,
		SmartListening:    m.smart != nil,
		ContinueListening: m.cont != nil,
		SmartConnected:    len(m.smartUp) > 0,
		ContinueConnected: len(m.contUp) > 0,
		AccountCount:      len(m.account),
	}

	if len(m.order) > 0 {
		state.LastUserID = m.order[len(m.order)-1]
	}

	return state
}

func (m *Manager) serveSmart(l net.Listener) {
	defer m.wg.Done()

	for {
		conn, err := l.Accept()
		if err != nil {
			if closed(err) {
				slog.Debug("ipc smart listener closed")
				return
			}
			slog.Warn("ipc smart accept error", "error", err)
			time.Sleep(50 * time.Millisecond)
			continue
		}

		slog.Info("ipc smart connection accepted", "remote", conn.RemoteAddr())
		m.wg.Add(1)
		go m.smartLoop(conn)
	}
}

func (m *Manager) serveCont(l net.Listener) {
	defer m.wg.Done()

	for {
		conn, err := l.Accept()
		if err != nil {
			if closed(err) {
				slog.Debug("ipc continue listener closed")
				return
			}
			slog.Warn("ipc continue accept error", "error", err)
			time.Sleep(50 * time.Millisecond)
			continue
		}

		slog.Info("ipc continue connection accepted", "remote", conn.RemoteAddr())
		m.wg.Add(1)
		go m.contLoop(conn)
	}
}

func (m *Manager) smartLoop(conn net.Conn) {
	defer m.wg.Done()

	m.mu.Lock()
	m.smartUp[conn] = struct{}{}
	m.mu.Unlock()

	defer func() {
		_ = conn.Close()
		m.mu.Lock()
		delete(m.smartUp, conn)
		m.drop(conn)
		m.mu.Unlock()
	}()

	buf := make([]byte, 64*1024)
	for {
		n, err := conn.Read(buf)
		if n > 0 {
			m.onSmart(conn, strings.TrimSpace(string(buf[:n])))
		}
		if err != nil {
			return
		}
	}
}

func (m *Manager) contLoop(conn net.Conn) {
	defer m.wg.Done()

	m.mu.Lock()
	m.contUp[conn] = struct{}{}
	m.mu.Unlock()

	defer func() {
		_ = conn.Close()
		m.mu.Lock()
		delete(m.contUp, conn)
		m.mu.Unlock()
	}()

	buf := make([]byte, 64*1024)
	for {
		n, err := conn.Read(buf)
		if n > 0 {
			m.onCont(conn, strings.TrimSpace(string(buf[:n])))
		}
		if err != nil {
			return
		}
	}
}

func (m *Manager) onSmart(conn net.Conn, text string) {
	if text == "" {
		return
	}

	tag, body := split(text)
	if tag != msgInfo && tag != msgLogout {
		slog.Debug("ipc smart unknown tag", "tag", tag)
		return
	}
	if strings.TrimSpace(body) == "" {
		return
	}

	item := struct {
		UserID string `json:"userId"`
	}{}
	if json.Unmarshal([]byte(body), &item) != nil || item.UserID == "" {
		slog.Warn("ipc smart invalid payload", "tag", tag)
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if tag == msgInfo {
		slog.Info("ipc smart user login", "user_id", item.UserID)
		m.account[item.UserID] = Entry{
			UserID: item.UserID,
			Info:   json.RawMessage(body),
			Conn:   conn,
		}
		m.touch(item.UserID)
		return
	}

	slog.Info("ipc smart user logout", "user_id", item.UserID)
	delete(m.account, item.UserID)
	m.cut(item.UserID)
}

func (m *Manager) onCont(conn net.Conn, text string) {
	if text != msgQuery {
		slog.Debug("ipc continue unknown message", "text", text)
		return
	}

	slog.Debug("ipc continue query received")
	reply := m.reply()
	if reply == "" {
		slog.Debug("ipc continue no reply available")
		return
	}

	_, _ = conn.Write([]byte(reply))
	slog.Debug("ipc continue reply sent")
}

func (m *Manager) reply() string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.order) == 0 {
		return ""
	}

	last := m.order[len(m.order)-1]
	item, ok := m.account[last]
	if !ok || len(item.Info) == 0 {
		return ""
	}

	return msgReply + ":" + string(item.Info)
}

func (m *Manager) touch(id string) {
	m.cut(id)
	m.order = append(m.order, id)
}

func (m *Manager) cut(id string) {
	m.order = append([]string{}, slices(m.order, func(item string) bool {
		return item != id
	})...)
}

func (m *Manager) drop(conn net.Conn) {
	all := make([]string, 0, len(m.account))
	for id, item := range m.account {
		if item.Conn != conn {
			continue
		}
		delete(m.account, id)
		all = append(all, id)
	}

	if len(all) == 0 {
		return
	}

	m.order = append([]string{}, slices(m.order, func(item string) bool {
		for _, id := range all {
			if item == id {
				return false
			}
		}
		return true
	})...)
}

func slices(all []string, keep func(string) bool) []string {
	out := make([]string, 0, len(all))
	for _, item := range all {
		if keep(item) {
			out = append(out, item)
		}
	}
	return out
}

func closed(err error) bool {
	return errors.Is(err, net.ErrClosed) || errors.Is(err, os.ErrClosed)
}
