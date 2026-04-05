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

func (a *API) startup(c *gin.Context) {
	ok(c, a.inspectStartup(c.Request.Context()))
}

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

func (a *API) configGet(c *gin.Context) {
	cfg, err := a.cfg.Load()
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, cfg)
}

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

func (a *API) inspectStartup(ctx context.Context) startupState {
	op := a.inspectRuntime(ctx, "opencode")
	git := a.inspectRuntime(ctx, "git")

	out := startupState{
		Ready:    op.Installed,
		Opencode: op,
		Git:      git,
	}

	if !op.Installed {
		out.Summary = "系统会优先准备 OpenCode，确保 AI 策略研发环境可以直接进入。"
		return out
	}
	if git.Source == string(rt.SourceSystem) {
		out.Summary = "已检测到系统 Git，启动 OpenCode 时会自动继承系统 Git。"
		return out
	}
	if git.Source == string(rt.SourceBuiltin) {
		out.Summary = "未检测到系统 Git，启动 OpenCode 时会自动注入内置 Git。"
		return out
	}
	out.Summary = "AI 策略研发环境已准备完成。"
	return out
}

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

func queryInt(c *gin.Context, key string, fallback int) (int, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}
