package opencode

import (
	"context"
	"errors"
	"net/url"

	"strategy-service/internal/opdoc"
	"strategy-service/internal/oprun"
)

type Service struct {
	mgr *oprun.Manager
}

func New(mgr *oprun.Manager) *Service {
	return &Service{mgr: mgr}
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
