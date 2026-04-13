package oprun

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

	"strategy-service/internal/gitenv"
	"strategy-service/internal/logs"
	"strategy-service/internal/proc"
)

var errDisabled = errors.New("opencode is disabled")
var errExternal = errors.New("opencode is not managed by strategy-service")

// ErrDisabled 表示当前禁用了由 strategy-service 托管启动 opencode。
func ErrDisabled() error {
	return errDisabled
}

// ErrExternal 表示 opencode 可访问，但并非由当前服务托管。
func ErrExternal() error {
	return errExternal
}

type Manager struct {
	cfg    Config
	url    *url.URL
	client *http.Client
	log    *slog.Logger

	mu      sync.RWMutex
	cmd     *exec.Cmd
	wait    chan struct{}
	stop    bool
	state   State
	lastErr error
}

// New 创建 opencode 托管控制器。
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
		log: newLogger(),
		state: State{
			Enabled: cfg.Enabled,
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

// Target 返回 opencode 目标地址的只读副本。
func (m *Manager) Target() *url.URL {
	out := *m.url
	return &out
}

// State 返回当前托管状态快照。
func (m *Manager) State() State {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.state
}

// Ensure 确保目标地址上存在一个可用的 opencode 服务。
func (m *Manager) Ensure(ctx context.Context) error {
	if !m.cfg.Enabled {
		m.log.Warn("opencode ensure called but disabled")
		m.fail("disabled", errDisabled)
		return errDisabled
	}

	if err := m.health(ctx); err == nil {
		m.mu.RLock()
		cmd := m.cmd
		m.mu.RUnlock()
		if cmd != nil {
			m.log.Debug("opencode already running (owned)")
			m.live()
			return nil
		}

		m.log.Info("opencode detected as external process")
		m.external()
		return nil
	}

	ch, ok := m.begin()
	if !ok {
		m.log.Debug("opencode start already in progress, waiting")
		return m.await(ctx, ch)
	}
	defer m.done()

	m.log.Info("starting opencode process", "bin", m.cfg.Bin, "host", m.cfg.Host, "port", m.cfg.Port)
	if err := m.spawn(); err != nil {
		if ping := m.health(ctx); ping == nil {
			m.log.Info("opencode spawn failed but process is reachable externally")
			m.external()
			return nil
		}
		m.log.Error("opencode spawn failed", "error", err)
		m.fail("failed to start opencode", err)
		return err
	}

	if err := m.ready(ctx); err != nil {
		m.log.Error("opencode did not become ready", "error", err, "timeout", m.cfg.StartTimeout)
		_ = m.Stop(context.Background())
		m.fail("opencode did not become ready", err)
		return err
	}

	m.log.Info("opencode is ready")
	m.live()
	return nil
}

// Restart 先停止当前进程，再重新拉起 opencode。
func (m *Manager) Restart(ctx context.Context) error {
	m.log.Info("restarting opencode")
	if err := m.Stop(ctx); err != nil {
		m.log.Error("opencode stop failed during restart", "error", err)
		return err
	}
	if err := m.down(ctx); err != nil {
		m.log.Error("opencode did not stop during restart", "error", err)
		return err
	}
	return m.Ensure(ctx)
}

// Stop 停止当前由 strategy-service 托管的 opencode 进程。
func (m *Manager) Stop(context.Context) error {
	m.log.Info("stopping opencode")
	m.mu.Lock()
	cmd := m.cmd

	if cmd == nil {
		m.mu.Unlock()
		if m.healthy() {
			m.log.Info("opencode is external, cannot stop")
			return errExternal
		}
		m.mu.Lock()
		m.lastErr = nil
		m.state.Running = false
		m.state.Ready = false
		if m.state.Enabled {
			m.state.Status = "stopped"
		} else {
			m.state.Status = "disabled"
		}
		m.state.Message = ""
		m.mu.Unlock()
		m.log.Info("opencode stopped (no process)")
		return nil
	}

	m.stop = true
	m.state.Status = "stopping"
	m.state.Message = ""
	m.mu.Unlock()

	if cmd.Process == nil {
		return nil
	}

	m.log.Info("killing opencode process", "pid", cmd.Process.Pid)
	return proc.Kill(cmd)
}

// begin 抢占启动权，避免并发重复拉起进程。
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
	m.state.Message = ""
	m.state.StartedAt = nil
	return ch, true
}

// done 释放启动锁，并唤醒等待中的调用方。
func (m *Manager) done() {
	m.mu.Lock()
	ch := m.wait
	m.wait = nil
	m.mu.Unlock()

	if ch != nil {
		close(ch)
	}
}

// await 等待其他协程完成启动流程，并复用最终结果。
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

// spawn 启动 opencode 子进程并接管日志流。
func (m *Manager) spawn() error {
	m.log.Info("spawning opencode", "bin", m.cfg.Bin, "host", m.cfg.Host, "port", m.cfg.Port, "cwd", m.cfg.Cwd)
	cmd := exec.Command(m.cfg.Bin, "serve", "--hostname", m.cfg.Host, "--port", fmt.Sprintf("%d", m.cfg.Port))
	proc.Hide(cmd)
	if m.cfg.Cwd != "" {
		cmd.Dir = m.cfg.Cwd
	}
	cmd.Env = env(m.cfg)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		m.log.Error("opencode stdout pipe failed", "error", err)
		return err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		m.log.Error("opencode stderr pipe failed", "error", err)
		return err
	}

	if err := cmd.Start(); err != nil {
		m.log.Error("opencode start failed", "error", err)
		return err
	}

	now := time.Now()
	m.mu.Lock()
	m.cmd = cmd
	m.state.StartedAt = &now
	m.mu.Unlock()

	m.log.Info("opencode process started", "pid", cmd.Process.Pid)
	go m.scan(stdout)
	go m.scan(stderr)
	go m.watch(cmd)
	return nil
}

// ready 轮询健康检查，直到服务可访问或超时。
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

// down 等待托管进程和健康状态都彻底消失。
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

// live 将状态切换为本服务托管且可用。
func (m *Manager) live() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = nil
	m.state.Status = "running"
	m.state.Ready = true
	m.state.Running = true
	m.state.Message = ""
}

// external 将状态标记为“服务可用但不归当前进程托管”。
func (m *Manager) external() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = nil
	m.state.Status = "external"
	m.state.Ready = true
	m.state.Running = true
	m.state.Message = ""
	m.state.StartedAt = nil
	m.cmd = nil
}

// fail 记录一次启动或运行失败，并写入日志中心。
func (m *Manager) fail(msg string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastErr = err
	m.state.Status = "failed"
	m.state.Ready = false
	m.state.Running = m.cmd != nil
	m.state.Message = msg
	if err != nil {
		_ = logs.Append(logs.OpencodeKind, err.Error())
	}
}

// watch 等待子进程退出，并把退出原因写回状态机。
func (m *Manager) watch(cmd *exec.Cmd) {
	err := cmd.Wait()
	if err == nil {
		m.log.Info("opencode process exited normally", "pid", cmd.Process.Pid)
		m.close(cmd, "stopped", "", nil)
		return
	}
	if errors.Is(err, os.ErrProcessDone) {
		m.log.Info("opencode process already done", "pid", cmd.Process.Pid)
		m.close(cmd, "stopped", "", nil)
		return
	}
	if exit, ok := err.(*exec.ExitError); ok {
		m.log.Error("opencode process exited with error", "pid", cmd.Process.Pid, "exit_code", exit.ExitCode(), "error", exit.Error())
		m.close(cmd, "failed", strings.TrimSpace(exit.Error()), err)
		return
	}

	m.log.Error("opencode process exited unexpectedly", "pid", cmd.Process.Pid, "error", err)
	m.close(cmd, "failed", "opencode exited unexpectedly", err)
}

// close 在子进程退出后收尾状态，并处理主动停止场景。
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
	m.state.Ready = false
	m.state.Running = false
	m.state.Status = status
	m.state.Message = msg
	m.lastErr = err
	if err != nil {
		_ = logs.Append(logs.OpencodeKind, err.Error())
	}
}

// scan 持续读取子进程日志并追加到统一日志文件。
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
		_ = logs.Append(logs.OpencodeKind, line)
	}
}

// health 通过健康检查判断目标地址上的 opencode 是否可用。
func (m *Manager) health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m.url.String()+"/global/health", nil)
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

// healthy 用短超时快速判断当前目标地址是否存活。
func (m *Manager) healthy() bool {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	return m.health(ctx) == nil
}

// env 构造拉起 opencode 时使用的完整环境变量。
func env(cfg Config) []string {
	out := append([]string{}, os.Environ()...)
	out = set(out, "OPENCODE_CLIENT", "strategy-service")
	out = set(out, "OPENCODE_SERVER_PASSWORD", "")
	out = set(out, "OPENCODE_SERVER_USERNAME", "")
	out = injectGit(out, cfg)
	return out
}

// injectGit 为 opencode 注入便携版 Git 所需环境。
func injectGit(all []string, cfg Config) []string {
	return gitenv.Apply(all, cfg.GitBin, true)
}

// set 覆盖或追加一条环境变量。
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

// idle 根据功能开关返回初始状态名。
func idle(ok bool) string {
	if ok {
		return "stopped"
	}
	return "disabled"
}
