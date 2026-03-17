package opencode

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

var errDisabled = errors.New("opencode is disabled")
var errExternal = errors.New("opencode is not managed by strategy-service")

func ErrDisabled() error {
	return errDisabled
}

func ErrExternal() error {
	return errExternal
}

type Manager struct {
	cfg    Config
	url    *url.URL
	client *http.Client

	mu      sync.RWMutex
	cmd     *exec.Cmd
	wait    chan struct{}
	stop    bool
	state   State
	lastErr error
}

func New(cfg Config) *Manager {
	target := &url.URL{
		Scheme: "http",
		Host:   fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
	}

	return &Manager{
		cfg: cfg,
		url: target,
		client: &http.Client{
			Timeout: 2 * time.Second,
		},
		state: State{
			Enabled: cfg.Enabled,
			Startup: cfg.Startup,
			Bin:     cfg.Bin,
			URL:     target.String(),
			Cwd:     cfg.Cwd,
			Status:  idle(cfg.Enabled),
		},
	}
}

func (m *Manager) Enabled() bool {
	return m.cfg.Enabled
}

func (m *Manager) Startup() string {
	return strings.ToLower(strings.TrimSpace(m.cfg.Startup))
}

func (m *Manager) Target() *url.URL {
	out := *m.url
	return &out
}

func (m *Manager) State() State {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := m.state
	if out.Log != nil {
		out.Log = append([]string{}, out.Log...)
	}
	return out
}

func (m *Manager) Ensure(ctx context.Context) error {
	if !m.cfg.Enabled {
		m.fail("disabled", errDisabled)
		return errDisabled
	}

	if err := m.health(ctx); err == nil {
		m.mu.RLock()
		owned := m.cmd != nil || m.state.Owned
		m.mu.RUnlock()
		if owned {
			m.live()
			return nil
		}
		m.external()
		return nil
	}

	ch, ok := m.begin()
	if !ok {
		return m.await(ctx, ch)
	}

	if err := m.spawn(); err != nil {
		if ping := m.health(ctx); ping == nil {
			m.external()
			return nil
		}
		m.fail("failed to start opencode", err)
		m.done()
		return err
	}

	err := m.ready(ctx)
	if err != nil {
		_ = m.Stop(context.Background())
		m.fail("opencode did not become ready", err)
		m.done()
		return err
	}

	m.live()
	m.done()
	return nil
}

func (m *Manager) Restart(ctx context.Context) error {
	if err := m.Stop(ctx); err != nil && !errors.Is(err, errExternal) {
		return err
	}
	return m.Ensure(ctx)
}

func (m *Manager) Stop(context.Context) error {
	m.mu.Lock()
	cmd := m.cmd
	owned := m.state.Owned

	if cmd == nil {
		m.mu.Unlock()
		if !owned && m.healthy() {
			return errExternal
		}
		m.mu.Lock()
		m.state.Running = false
		m.state.Ready = false
		m.state.Owned = false
		m.state.PID = 0
		if m.state.Enabled {
			m.state.Status = "stopped"
		} else {
			m.state.Status = "disabled"
		}
		m.state.Message = ""
		m.mu.Unlock()
		return nil
	}

	m.stop = true
	m.state.Status = "stopping"
	m.state.Message = ""
	m.mu.Unlock()

	if cmd.Process == nil {
		return nil
	}

	return cmd.Process.Kill()
}

func (m *Manager) begin() (chan struct{}, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.wait != nil {
		return m.wait, false
	}

	ch := make(chan struct{})
	m.wait = ch
	m.lastErr = nil
	m.state.Status = "starting"
	m.state.Ready = false
	m.state.Running = true
	m.state.Owned = true
	m.state.Message = ""
	m.state.StartedAt = nil
	return ch, true
}

func (m *Manager) done() {
	m.mu.Lock()
	ch := m.wait
	m.wait = nil
	m.mu.Unlock()

	if ch != nil {
		close(ch)
	}
}

func (m *Manager) await(ctx context.Context, ch chan struct{}) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-ch:
		m.mu.RLock()
		defer m.mu.RUnlock()
		if m.state.Ready {
			return nil
		}
		if m.lastErr != nil {
			return m.lastErr
		}
		return errors.New("opencode is unavailable")
	}
}

func (m *Manager) spawn() error {
	cmd := exec.Command(m.cfg.Bin, "serve", "--hostname", m.cfg.Host, "--port", fmt.Sprintf("%d", m.cfg.Port))
	if m.cfg.Cwd != "" {
		cmd.Dir = m.cfg.Cwd
	}
	cmd.Env = env()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	now := time.Now()

	m.mu.Lock()
	m.cmd = cmd
	m.state.PID = cmd.Process.Pid
	m.state.StartedAt = &now
	m.mu.Unlock()

	go m.scan(stdout)
	go m.scan(stderr)
	go m.watch(cmd)
	return nil
}

func (m *Manager) ready(ctx context.Context) error {
	limit := time.NewTimer(m.cfg.StartTimeout)
	defer limit.Stop()

	tick := time.NewTicker(250 * time.Millisecond)
	defer tick.Stop()

	for {
		if err := m.health(ctx); err == nil {
			return nil
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-limit.C:
			return context.DeadlineExceeded
		case <-tick.C:
		}
	}
}

func (m *Manager) live() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = nil
	m.state.Status = "running"
	m.state.Ready = true
	m.state.Running = true
	m.state.Owned = true
	m.state.Message = ""
}

func (m *Manager) external() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = nil
	m.state.Status = "external"
	m.state.Ready = true
	m.state.Running = true
	m.state.Owned = false
	m.state.PID = 0
	m.state.Message = ""
	m.state.StartedAt = nil
	m.cmd = nil
}

func (m *Manager) fail(msg string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = err
	m.state.Status = "failed"
	m.state.Ready = false
	m.state.Running = m.cmd != nil
	m.state.Owned = m.cmd != nil
	if m.cmd == nil {
		m.state.PID = 0
	}
	m.state.Message = msg
	if err != nil {
		m.push(err.Error())
	}
}

func (m *Manager) watch(cmd *exec.Cmd) {
	err := cmd.Wait()
	if err == nil {
		m.close(cmd, "stopped", "", nil)
		return
	}

	if errors.Is(err, os.ErrProcessDone) {
		m.close(cmd, "stopped", "", nil)
		return
	}

	if exit, ok := err.(*exec.ExitError); ok {
		m.close(cmd, "failed", strings.TrimSpace(exit.Error()), err)
		return
	}

	m.close(cmd, "failed", "opencode exited unexpectedly", err)
}

func (m *Manager) close(cmd *exec.Cmd, status string, msg string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.cmd != cmd {
		return
	}

	if m.stop {
		status = "stopped"
		msg = ""
		err = nil
		m.stop = false
	}

	m.cmd = nil
	m.state.PID = 0
	m.state.Ready = false
	m.state.Running = false
	m.state.Owned = false
	m.state.Status = status
	m.state.Message = msg
	m.lastErr = err
	if err != nil {
		m.push(err.Error())
	}
}

func (m *Manager) scan(in io.ReadCloser) {
	defer in.Close()

	buf := make([]byte, 0, 64*1024)
	scan := bufio.NewScanner(in)
	scan.Buffer(buf, 1024*1024)
	for scan.Scan() {
		line := strings.TrimSpace(scan.Text())
		if line == "" {
			continue
		}

		m.mu.Lock()
		m.push(line)
		m.mu.Unlock()
	}
}

func (m *Manager) push(line string) {
	m.state.Log = append(m.state.Log, line)
	if len(m.state.Log) > 80 {
		m.state.Log = append([]string{}, m.state.Log[len(m.state.Log)-80:]...)
	}
}

func (m *Manager) health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m.url.String()+"/path", nil)
	if err != nil {
		return err
	}

	res, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}

	return fmt.Errorf("unexpected status: %s", res.Status)
}

func (m *Manager) healthy() bool {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	return m.health(ctx) == nil
}

func env() []string {
	out := append([]string{}, os.Environ()...)
	out = set(out, "OPENCODE_CLIENT", "strategy-service")
	out = set(out, "OPENCODE_SERVER_PASSWORD", "")
	out = set(out, "OPENCODE_SERVER_USERNAME", "")
	return out
}

func set(all []string, key string, value string) []string {
	pre := key + "="
	for i, item := range all {
		if strings.HasPrefix(item, pre) {
			all[i] = pre + value
			return all
		}
	}
	return append(all, pre+value)
}

func idle(ok bool) string {
	if ok {
		return "stopped"
	}
	return "disabled"
}
