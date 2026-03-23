package opencode

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/proc"
	"strategy-service/internal/system"
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
			Timeout:   2 * time.Second,
			Transport: &http.Transport{Proxy: nil},
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
		slog.Warn("opencode ensure called but disabled")
		m.note("opencode ensure called but disabled")
		m.fail("disabled", errDisabled)
		return errDisabled
	}

	if err := m.health(ctx); err == nil {
		m.mu.RLock()
		owned := m.cmd != nil || m.state.Owned
		m.mu.RUnlock()
		if owned {
			slog.Debug("opencode already running (owned)")
			m.note("opencode already running (owned)")
			m.live()
			return nil
		}

		if item, ok := m.owner(); ok {
			slog.Info("opencode ownership restored", "pid", item.PID)
			m.note(fmt.Sprintf("opencode ownership restored pid=%d", item.PID))
			m.attach(item)
			return nil
		}

		slog.Info("opencode detected as external process")
		m.note("opencode detected as external process")
		m.external()
		return nil
	}

	ch, ok := m.begin()
	if !ok {
		slog.Debug("opencode start already in progress, waiting")
		return m.await(ctx, ch)
	}

	slog.Info("starting opencode process", "bin", m.cfg.Bin, "host", m.cfg.Host, "port", m.cfg.Port)
	m.note(fmt.Sprintf("starting opencode process bin=%s host=%s port=%d", m.cfg.Bin, m.cfg.Host, m.cfg.Port))
	if err := m.spawn(); err != nil {
		if ping := m.health(ctx); ping == nil {
			slog.Info("opencode spawn failed but process is reachable externally")
			m.note("opencode spawn failed but process is reachable externally")
			m.external()
			return nil
		}
		slog.Error("opencode spawn failed", "error", err)
		m.note("opencode spawn failed: " + err.Error())
		m.fail("failed to start opencode", err)
		m.done()
		return err
	}

	err := m.ready(ctx)
	if err != nil {
		slog.Error("opencode did not become ready", "error", err, "timeout", m.cfg.StartTimeout)
		m.note("opencode did not become ready: " + err.Error())
		_ = m.Stop(context.Background())
		m.fail("opencode did not become ready", err)
		m.done()
		return err
	}

	slog.Info("opencode is ready")
	m.note("opencode is ready")
	m.live()
	m.done()
	return nil
}

func (m *Manager) Restart(ctx context.Context) error {
	slog.Info("restarting opencode")
	m.note("restarting opencode")
	if err := m.Stop(ctx); err != nil {
		slog.Error("opencode stop failed during restart", "error", err)
		m.note("opencode stop failed during restart: " + err.Error())
		return err
	}

	if err := m.down(ctx); err != nil {
		slog.Error("opencode did not stop during restart", "error", err)
		m.note("opencode did not stop during restart: " + err.Error())
		return err
	}

	return m.Ensure(ctx)
}

func (m *Manager) Stop(context.Context) error {
	slog.Info("stopping opencode")
	m.note("stopping opencode")
	m.mu.Lock()
	cmd := m.cmd
	owned := m.state.Owned
	pid := m.state.PID

	if cmd == nil {
		m.mu.Unlock()
		if owned && pid > 0 {
			slog.Info("killing restored opencode process", "pid", pid)
			m.note(fmt.Sprintf("killing restored opencode process pid=%d", pid))
			if err := proc.KillPID(pid); err != nil {
				m.note("failed to kill restored opencode process: " + err.Error())
				return err
			}
			dropOwner()
			m.mu.Lock()
			m.lastErr = nil
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
			m.state.StartedAt = nil
			m.mu.Unlock()
			slog.Info("opencode stopped (restored process)")
			m.note("opencode stopped (restored process)")
			return nil
		}

		if !owned && m.healthy() {
			slog.Info("opencode is external, cannot stop")
			m.note("opencode is external, cannot stop")
			return errExternal
		}
		m.mu.Lock()
		m.lastErr = nil
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
		slog.Info("opencode stopped (no process)")
		m.note("opencode stopped (no process)")
		return nil
	}

	m.stop = true
	m.state.Status = "stopping"
	m.state.Message = ""
	m.mu.Unlock()

	if cmd.Process == nil {
		return nil
	}

	slog.Info("killing opencode process", "pid", cmd.Process.Pid)
	m.note(fmt.Sprintf("killing opencode process pid=%d", cmd.Process.Pid))
	return proc.Kill(cmd)
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
	slog.Info("spawning opencode", "bin", m.cfg.Bin, "host", m.cfg.Host, "port", m.cfg.Port, "cwd", m.cfg.Cwd)
	m.note(fmt.Sprintf("spawning opencode bin=%s host=%s port=%d cwd=%s", m.cfg.Bin, m.cfg.Host, m.cfg.Port, m.cfg.Cwd))
	cmd := exec.Command(m.cfg.Bin, "serve", "--hostname", m.cfg.Host, "--port", fmt.Sprintf("%d", m.cfg.Port))
	proc.Hide(cmd)
	if m.cfg.Cwd != "" {
		cmd.Dir = m.cfg.Cwd
	}
	cmd.Env = env()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		slog.Error("opencode stdout pipe failed", "error", err)
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		slog.Error("opencode stderr pipe failed", "error", err)
		return err
	}

	if err := cmd.Start(); err != nil {
		slog.Error("opencode start failed", "error", err)
		m.note("opencode start failed: " + err.Error())
		return err
	}

	now := time.Now()

	m.mu.Lock()
	m.cmd = cmd
	m.state.PID = cmd.Process.Pid
	m.state.StartedAt = &now
	m.mu.Unlock()

	err = writeOwner(owner{
		PID:       cmd.Process.Pid,
		Bin:       m.cfg.Bin,
		Host:      m.cfg.Host,
		Port:      m.cfg.Port,
		Cwd:       m.cfg.Cwd,
		StartedAt: &now,
	})
	if err != nil {
		slog.Warn("opencode owner write failed", "error", err)
		m.note("opencode owner write failed: " + err.Error())
	}

	slog.Info("opencode process started", "pid", cmd.Process.Pid)
	m.note(fmt.Sprintf("opencode process started pid=%d", cmd.Process.Pid))

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

func (m *Manager) down(ctx context.Context) error {
	tick := time.NewTicker(50 * time.Millisecond)
	defer tick.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		m.mu.RLock()
		cmd := m.cmd
		m.mu.RUnlock()
		if cmd == nil && !m.healthy() {
			return nil
		}

		select {
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

func (m *Manager) attach(item owner) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = nil
	m.state.Status = "running"
	m.state.Ready = true
	m.state.Running = true
	m.state.Owned = true
	m.state.PID = item.PID
	m.state.Message = ""
	m.state.StartedAt = item.StartedAt
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
		slog.Info("opencode process exited normally", "pid", cmd.Process.Pid)
		m.note(fmt.Sprintf("opencode process exited normally pid=%d", cmd.Process.Pid))
		m.close(cmd, "stopped", "", nil)
		return
	}

	if errors.Is(err, os.ErrProcessDone) {
		slog.Info("opencode process already done", "pid", cmd.Process.Pid)
		m.note(fmt.Sprintf("opencode process already done pid=%d", cmd.Process.Pid))
		m.close(cmd, "stopped", "", nil)
		return
	}

	if exit, ok := err.(*exec.ExitError); ok {
		slog.Error("opencode process exited with error", "pid", cmd.Process.Pid, "exit_code", exit.ExitCode(), "error", exit.Error())
		m.note(fmt.Sprintf("opencode process exited with error pid=%d exit_code=%d error=%s", cmd.Process.Pid, exit.ExitCode(), exit.Error()))
		m.close(cmd, "failed", strings.TrimSpace(exit.Error()), err)
		return
	}

	slog.Error("opencode process exited unexpectedly", "pid", cmd.Process.Pid, "error", err)
	m.note(fmt.Sprintf("opencode process exited unexpectedly pid=%d error=%s", cmd.Process.Pid, err.Error()))
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

	dropOwner()

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
		_ = system.Append(system.OpencodeLog, line)
	}
}

func (m *Manager) push(line string) {
	m.state.Log = append(m.state.Log, line)
	if len(m.state.Log) > 80 {
		m.state.Log = append([]string{}, m.state.Log[len(m.state.Log)-80:]...)
	}
}

func (m *Manager) note(line string) {
	line = strings.TrimSpace(line)
	if line == "" {
		return
	}

	text := time.Now().Format(time.RFC3339) + " " + line
	m.mu.Lock()
	m.push(text)
	m.mu.Unlock()
	_ = system.Append(system.OpencodeLog, text)
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
