package web

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

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

func (a *API) startup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.inspectStartup(r.Context()))
}

func (a *API) startupPrepare(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	state := a.inspectStartup(r.Context())
	if state.Opencode.Installed {
		write(w, http.StatusOK, "ok", state)
		return
	}

	if !a.rt.Has("opencode") {
		write(w, http.StatusServiceUnavailable, "builtin opencode runtime not found", state)
		return
	}

	if _, err := a.rt.Ensure(r.Context(), "opencode"); err != nil {
		slog.Error("startup prepare failed", "tool", "opencode", "error", err)
		write(w, http.StatusServiceUnavailable, err.Error(), a.inspectStartup(r.Context()))
		return
	}

	write(w, http.StatusOK, "ok", a.inspectStartup(r.Context()))
}

func (a *API) config(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		cfg, err := a.cfg.Load()
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", cfg)
		return
	}

	if r.Method == http.MethodPut {
		body := cfg.Config{}
		err := readJSON(r, &body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		cfg, err := a.cfg.Save(body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", cfg)
		return
	}

	write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
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

func (a *API) version(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", meta.Current())
}

func (a *API) logSources(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	limit, err := queryInt(r, "limit", 10)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid limit", nil)
		return
	}

	out, err := a.log.Sources(r.Context(), limit)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", map[string]any{"sources": out})
}

func (a *API) logTail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	size, err := queryInt(r, "tail", 200)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid tail", nil)
		return
	}

	out, err := a.log.Tail(r.Context(), r.URL.Query().Get("source"), size)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", out)
}

func (a *API) smartxStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := smartx.Input{}
	if r.ContentLength != 0 {
		err := readJSON(r, &body)
		if err != nil && !errors.Is(err, io.EOF) {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}
	}

	out, err := a.sx.Start(r.Context(), body)
	if err != nil {
		slog.Warn("smartx startExtension failed", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", out)
}

func (a *API) smartxLogsMeta(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	limit, err := queryInt(r, "limit", 3)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid limit", nil)
		return
	}

	out, err := a.sx.Meta(r.URL.Query().Get("name"), limit)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", out)
}

func (a *API) smartxLogsWatch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	tail, err := queryInt(r, "tail", 200)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid tail", nil)
		return
	}
	limit, err := queryInt(r, "limit", 3)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid limit", nil)
		return
	}
	sec, err := queryInt(r, "seconds", 10)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid seconds", nil)
		return
	}

	out, err := a.sx.Watch(r.Context(), r.URL.Query().Get("name"), tail, limit, time.Duration(sec)*time.Second)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", out)
}

func queryInt(r *http.Request, key string, fallback int) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}
