package web

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	cfg "strategy-service/internal/config"
	"strategy-service/internal/meta"
	"strategy-service/internal/proc"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
)

type startupTool struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Installed bool      `json:"installed"`
	Status    string    `json:"status"`
	Source    string    `json:"source,omitempty"`
	Path      string    `json:"path,omitempty"`
	Version   string    `json:"version,omitempty"`
	Message   string    `json:"message,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type startupState struct {
	Ready    bool        `json:"ready"`
	Summary  string      `json:"summary"`
	Opencode startupTool `json:"opencode"`
	Git      startupTool `json:"git"`
}

// startup 返回当前启动环境的检测结果。
func (a *API) startup(c *gin.Context) {
	ok(c, a.inspectStartup(c.Request.Context()))
}

// startupPrepare 预激活内置 opencode，便于首次启动前完成准备。
func (a *API) startupPrepare(c *gin.Context) {
	state := a.inspectStartup(c.Request.Context())
	if state.Opencode.Installed {
		ok(c, state)
		return
	}

	if !a.rt.Has("opencode") {
		fail(c, 503, "builtin opencode runtime not found", state)
		return
	}

	if _, err := a.rt.Ensure(c.Request.Context(), "opencode"); err != nil {
		slog.Error("startup prepare failed", "tool", "opencode", "error", err)
		fail(c, 503, err.Error(), a.inspectStartup(c.Request.Context()))
		return
	}

	ok(c, a.inspectStartup(c.Request.Context()))
}

// configGet 读取 strategy-service 的持久化配置。
func (a *API) configGet(c *gin.Context) {
	cfg, err := a.cfg.Load()
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

// configPut 保存 strategy-service 的持久化配置。
func (a *API) configPut(c *gin.Context) {
	body := cfg.Config{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	cfg, err := a.cfg.Save(body)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

// inspectStartup 汇总 opencode 和 Git 的准备情况。
func (a *API) inspectStartup(ctx context.Context) startupState {
	op := a.inspectRuntime(ctx, "opencode")
	git := a.inspectRuntime(ctx, "git")

	return startupState{
		Ready:    op.Installed,
		Summary:  summary(op, git),
		Opencode: op,
		Git:      git,
	}
}

// summary 根据工具准备情况生成更易懂的状态说明。
func summary(op startupTool, git startupTool) string {
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

// inspectRuntime 读取单个运行时工具的安装与版本信息。
func (a *API) inspectRuntime(ctx context.Context, id string) startupTool {
	out := startupTool{
		ID:        id,
		Label:     label(id),
		Status:    "missing",
		UpdatedAt: time.Now(),
	}

	row, err := a.rt.Resolve(ctx, id)
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
	out.Version = version(ctx, row.Path)
	return out
}

// version 尝试执行 `<bin> --version` 读取工具版本。
func version(ctx context.Context, path string) string {
	sub, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(sub, path, "--version")
	proc.Hide(cmd)
	out, err := cmd.CombinedOutput()
	text := strings.TrimSpace(string(out))
	if err != nil {
		return text
	}
	return text
}

// label 将内部工具名映射为对用户更友好的展示名。
func label(id string) string {
	if id == "git" {
		return "Git"
	}
	if id == "opencode" {
		return "OpenCode"
	}
	return id
}

func (a *API) version(c *gin.Context) {
	ok(c, meta.Current())
}

func (a *API) logSources(c *gin.Context) {
	limit, err := queryInt(c, "limit", 10)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}

	out, err := a.log.Sources(c.Request.Context(), limit)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, map[string]any{"sources": out})
}

func (a *API) logTail(c *gin.Context) {
	size, err := queryInt(c, "tail", 200)
	if err != nil {
		fail(c, 400, "invalid tail", nil)
		return
	}

	out, err := a.log.Tail(c.Request.Context(), c.Query("source"), size)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxStart(c *gin.Context) {
	body := smartx.Input{}
	if c.Request.ContentLength != 0 {
		err := c.ShouldBindJSON(&body)
		if err != nil && !errors.Is(err, io.EOF) {
			bad(c, err)
			return
		}
	}

	out, err := a.sx.Start(c.Request.Context(), body)
	if err != nil {
		slog.Warn("smartx startExtension failed", "error", err)
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxLogsMeta(c *gin.Context) {
	limit, err := queryInt(c, "limit", 3)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}

	out, err := a.sx.Meta(c.Query("name"), limit)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxLogsWatch(c *gin.Context) {
	tail, err := queryInt(c, "tail", 200)
	if err != nil {
		fail(c, 400, "invalid tail", nil)
		return
	}
	limit, err := queryInt(c, "limit", 3)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}
	sec, err := queryInt(c, "seconds", 10)
	if err != nil {
		fail(c, 400, "invalid seconds", nil)
		return
	}

	out, err := a.sx.Watch(c.Request.Context(), c.Query("name"), tail, limit, time.Duration(sec)*time.Second)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

// queryInt 读取查询参数中的整数，缺失时返回默认值。
func queryInt(c *gin.Context, key string, fallback int) (int, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}
