package opencode

import (
	"context"
	"errors"
	"log/slog"
	"net/url"
	"time"

	"strategy-service/internal/opdoc"
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
)

type Tool struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Installed bool      `json:"installed"`
	Status    string    `json:"status"`
	Source    string    `json:"source,omitempty"`
	Path      string    `json:"path,omitempty"`
	Message   string    `json:"message,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Startup struct {
	Ready    bool   `json:"ready"`
	Summary  string `json:"summary"`
	Opencode Tool   `json:"opencode"`
	Git      Tool   `json:"git"`
}

type Service struct {
	run *rt.Service
	mgr *oprun.Manager
}

// New 创建 opencode 统一入口，收口文档与运行时相关操作。
func New(run *rt.Service, mgr *oprun.Manager) *Service {
	return &Service{
		run: run,
		mgr: mgr,
	}
}

// Disabled 判断错误是否表示托管启动被禁用。
func Disabled(err error) bool {
	return errors.Is(err, oprun.ErrDisabled())
}

// Target 返回 opencode 代理目标地址。
func (s *Service) Target() *url.URL {
	return s.mgr.Target()
}

// Enabled 返回当前是否允许托管 opencode。
func (s *Service) Enabled() bool {
	return s.mgr.Enabled()
}

// StartupMode 返回当前 opencode 的启动策略。
func (s *Service) StartupMode() string {
	return s.mgr.Startup()
}

// State 返回当前 opencode 运行状态。
func (s *Service) State() oprun.State {
	return s.mgr.State()
}

// Ensure 确保目标地址上存在可用的 opencode。
func (s *Service) Ensure(ctx context.Context) error {
	return s.mgr.Ensure(ctx)
}

// Start 启动 opencode 并返回最新状态。
func (s *Service) Start(ctx context.Context) (oprun.State, error) {
	return s.act(ctx, s.mgr.Ensure)
}

// Restart 重启 opencode 并返回最新状态。
func (s *Service) Restart(ctx context.Context) (oprun.State, error) {
	return s.act(ctx, s.mgr.Restart)
}

// Stop 停止 opencode；若当前是外部进程，则保持幂等。
func (s *Service) Stop(ctx context.Context) (oprun.State, error) {
	return s.act(ctx, func(ctx context.Context) error {
		err := s.mgr.Stop(ctx)
		if errors.Is(err, oprun.ErrExternal()) {
			return nil
		}
		return err
	})
}

// Startup 返回当前 opencode 启动环境的检测结果。
func (s *Service) Startup(ctx context.Context) Startup {
	op := s.inspect(ctx, "opencode")
	git := s.inspect(ctx, "git")
	return Startup{
		Ready:    op.Installed,
		Summary:  summary(op, git),
		Opencode: op,
		Git:      git,
	}
}

// Prepare 预激活内置 opencode，并返回最新检测结果。
func (s *Service) Prepare(ctx context.Context) (Startup, error) {
	state := s.Startup(ctx)
	if state.Opencode.Installed {
		return state, nil
	}
	if !s.run.Has("opencode") {
		return state, errors.New("builtin opencode runtime not found")
	}
	if _, err := s.run.Ensure(ctx, "opencode"); err != nil {
		slog.Error("startup prepare failed", "tool", "opencode", "error", err)
		return s.Startup(ctx), err
	}
	return s.Startup(ctx), nil
}

// ListSkills 列出本地 opencode skills。
func (s *Service) ListSkills() (opdoc.SkillList, error) {
	return opdoc.ListSkills()
}

// CreateSkill 创建一条 skill 文档。
func (s *Service) CreateSkill(name string, content string) (opdoc.SkillDoc, error) {
	return opdoc.CreateSkill(name, content)
}

// UpdateSkill 更新一条 skill 文档。
func (s *Service) UpdateSkill(name string, content string) (opdoc.SkillDoc, error) {
	return opdoc.UpdateSkill(name, content)
}

// DeleteSkill 删除一条 skill 文档。
func (s *Service) DeleteSkill(name string) error {
	return opdoc.DeleteSkill(name)
}

// ListAgents 列出本地 opencode agents。
func (s *Service) ListAgents() (opdoc.AgentList, error) {
	return opdoc.ListAgents()
}

// CreateAgent 创建一条 agent 文档。
func (s *Service) CreateAgent(name string, content string) (opdoc.AgentDoc, error) {
	return opdoc.CreateAgent(name, content)
}

// UpdateAgent 更新一条 agent 文档。
func (s *Service) UpdateAgent(name string, content string) (opdoc.AgentDoc, error) {
	return opdoc.UpdateAgent(name, content)
}

// DeleteAgent 删除一条 agent 文档。
func (s *Service) DeleteAgent(name string) error {
	return opdoc.DeleteAgent(name)
}

// act 统一执行运行态操作，并回传最新状态快照。
func (s *Service) act(ctx context.Context, fn func(context.Context) error) (oprun.State, error) {
	err := fn(ctx)
	return s.mgr.State(), err
}

// inspect 读取单个工具的安装状态。
func (s *Service) inspect(ctx context.Context, id string) Tool {
	out := Tool{
		ID:        id,
		Label:     label(id),
		Status:    "missing",
		UpdatedAt: time.Now(),
	}

	row, err := s.run.Resolve(ctx, id)
	if err != nil {
		out.Status = "failed"
		out.Message = err.Error()
		return out
	}
	if !row.Found {
		out.Message = row.Message
		return out
	}

	out.Installed = true
	out.Status = "installed"
	out.Source = string(row.Source)
	out.Path = row.Path
	return out
}

// summary 根据工具准备情况生成用户可读的提示语。
func summary(op Tool, git Tool) string {
	if !op.Installed {
		return "系统会优先准备 OpenCode，确保 AI 策略研发环境可以直接进入。"
	}
	if git.Source == string(rt.SourceSystem) {
		return "已检测到系统 Git，启动 OpenCode 时会自动复用系统 Git。"
	}
	if git.Source == string(rt.SourceBuiltin) {
		return "未检测到系统 Git，启动 OpenCode 时会自动注入内置 Git。"
	}
	return "AI 策略研发环境已准备完成。"
}

// label 将内部工具名映射为更适合展示的名称。
func label(id string) string {
	if id == "git" {
		return "Git"
	}
	if id == "opencode" {
		return "OpenCode"
	}
	return id
}
