package web

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"strategy-service/internal/ipc"
	"strategy-service/internal/opencode"
	"strategy-service/internal/system"
	"strategy-service/internal/tool"
	"strategy-service/internal/workspace"
)

type API struct {
	svc *tool.Service
	ws  *workspace.Service
	op  *opencode.Manager
	ip  *ipc.Manager
	cfg *system.Store
}

func NewAPI(svc *tool.Service, op *opencode.Manager, ip *ipc.Manager, cfg *system.Store) *API {
	return &API{
		svc: svc,
		ws:  workspace.NewService(),
		op:  op,
		ip:  ip,
		cfg: cfg,
	}
}

func (a *API) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/opencode/agents", a.opencodeAgents)
	mux.HandleFunc("/api/opencode/agents/", a.opencodeAgent)
	mux.HandleFunc("/api/opencode/skills", a.opencodeSkills)
	mux.HandleFunc("/api/opencode/skills/", a.opencodeSkill)
	mux.HandleFunc("/api/workspace/list", a.workspaceList)
	mux.HandleFunc("/api/workspace/create", a.workspaceCreate)
	mux.HandleFunc("/api/workspace/open", a.workspaceOpen)
	mux.HandleFunc("/api/workspace/files", a.workspaceFiles)
	mux.HandleFunc("/api/workspace/file-content", a.workspaceFileContent)
	mux.HandleFunc("/api/system/tools", a.tools)
	mux.HandleFunc("/api/system/tools/", a.install)
	mux.HandleFunc("/api/system/tasks/", a.task)
	mux.HandleFunc("/api/system/config", a.config)
	mux.HandleFunc("/api/system/logs", a.logs)
	mux.HandleFunc("/api/system/opencode/status", a.opencodeStatus)
	mux.HandleFunc("/api/system/opencode/logs", a.opencodeLogs)
	mux.HandleFunc("/api/system/opencode/start", a.opencodeStart)
	mux.HandleFunc("/api/system/opencode/restart", a.opencodeRestart)
	mux.HandleFunc("/api/system/opencode/stop", a.opencodeStop)
	mux.HandleFunc("/api/system/ipc/status", a.ipcStatus)
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	state := a.op.State()
	slog.Debug("health check", "opencode_ready", state.Ready, "opencode_status", state.Status)
	write(w, http.StatusOK, "ok", map[string]any{
		"status":         "ok",
		"opencode":       state,
		"opencode_ready": state.Ready,
	})
}

func (a *API) opencodeSkills(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		data, err := opencode.ListSkills()
		if err != nil {
			slog.Error("opencode skill list failed", "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}
		write(w, http.StatusOK, "ok", data)
		return
	}

	if r.Method == http.MethodPost {
		body := struct {
			Name    string `json:"name"`
			Content string `json:"content"`
		}{}
		err := readJSON(r, &body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		item, err := opencode.CreateSkill(body.Name, body.Content)
		if err != nil {
			slog.Error("opencode skill create failed", "name", body.Name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"skill":           item,
			"reload_required": true,
		})
		return
	}

	write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
}

func (a *API) opencodeAgents(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		data, err := opencode.ListAgents()
		if err != nil {
			slog.Error("opencode agent list failed", "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}
		write(w, http.StatusOK, "ok", data)
		return
	}

	if r.Method == http.MethodPost {
		body := struct {
			Name    string `json:"name"`
			Content string `json:"content"`
		}{}
		err := readJSON(r, &body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		item, err := opencode.CreateAgent(body.Name, body.Content)
		if err != nil {
			slog.Error("opencode agent create failed", "name", body.Name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"agent":           item,
			"reload_required": true,
		})
		return
	}

	write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
}

func (a *API) opencodeSkill(w http.ResponseWriter, r *http.Request) {
	name, ok := tail(r.URL.Path, "/api/opencode/skills/")
	if !ok {
		write(w, http.StatusNotFound, "skill not found", nil)
		return
	}

	if r.Method == http.MethodPut {
		body := struct {
			Content string `json:"content"`
		}{}
		err := readJSON(r, &body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		item, err := opencode.UpdateSkill(name, body.Content)
		if err != nil {
			slog.Error("opencode skill update failed", "name", name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"skill":           item,
			"reload_required": true,
		})
		return
	}

	if r.Method == http.MethodDelete {
		err := opencode.DeleteSkill(name)
		if err != nil {
			slog.Error("opencode skill delete failed", "name", name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"name":            name,
			"reload_required": true,
		})
		return
	}

	write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
}

func (a *API) opencodeAgent(w http.ResponseWriter, r *http.Request) {
	name, ok := tail(r.URL.Path, "/api/opencode/agents/")
	if !ok {
		write(w, http.StatusNotFound, "agent not found", nil)
		return
	}

	if r.Method == http.MethodPut {
		body := struct {
			Content string `json:"content"`
		}{}
		err := readJSON(r, &body)
		if err != nil {
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		item, err := opencode.UpdateAgent(name, body.Content)
		if err != nil {
			slog.Error("opencode agent update failed", "name", name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"agent":           item,
			"reload_required": true,
		})
		return
	}

	if r.Method == http.MethodDelete {
		err := opencode.DeleteAgent(name)
		if err != nil {
			slog.Error("opencode agent delete failed", "name", name, "error", err)
			write(w, http.StatusBadRequest, err.Error(), nil)
			return
		}

		write(w, http.StatusOK, "ok", map[string]any{
			"name":            name,
			"reload_required": true,
		})
		return
	}

	write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
}

func (a *API) tools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Debug("tools list request")
	write(w, http.StatusOK, "ok", a.svc.List(r.Context()))
}

func (a *API) workspaceList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Debug("workspace list request")
	data, err := a.ws.List()
	if err != nil {
		slog.Error("workspace list failed", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspaces = a.workspaceLocals(r.Context(), data.Workspaces)
	slog.Info("workspace list", "count", len(data.Workspaces))
	write(w, http.StatusOK, "ok", data)
}

// 创建工作空间
func (a *API) workspaceCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Name string `json:"name"`
		Git  bool   `json:"git"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("workspace create bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("workspace create", "name", body.Name)
	data, err := a.ws.Create(body.Name, body.Git)
	if err != nil {
		slog.Error("workspace create failed", "name", body.Name, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspace = a.workspaceLocal(r.Context(), data.Workspace)
	slog.Info("workspace created", "name", body.Name, "path", data.Workspace.Path)
	write(w, http.StatusOK, "ok", data)
}

// 打开工作空间
func (a *API) workspaceOpen(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Path string `json:"path"`
		Git  bool   `json:"git"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("workspace open bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("workspace open", "path", body.Path)
	data, err := a.ws.Open(body.Path, body.Git)
	if err != nil {
		slog.Error("workspace open failed", "path", body.Path, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspace = a.workspaceLocal(r.Context(), data.Workspace)
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	wsPath := r.URL.Query().Get("workspace_path")
	slog.Debug("workspace files request", "workspace_path", wsPath)
	data, err := a.ws.Files(wsPath)
	if err != nil {
		slog.Error("workspace files failed", "workspace_path", wsPath, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Debug("workspace files", "workspace_path", wsPath, "total", data.TotalFiles)
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceFileContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	wsPath := r.URL.Query().Get("workspace_path")
	filePath := r.URL.Query().Get("file_path")
	slog.Debug("workspace file-content request", "workspace_path", wsPath, "file_path", filePath)
	data, err := a.ws.Content(wsPath, filePath)
	if err != nil {
		slog.Error("workspace file-content failed", "workspace_path", wsPath, "file_path", filePath, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Debug("workspace file-content", "file_path", filePath, "size", data.Size, "binary", data.Binary)
	write(w, http.StatusOK, "ok", data)
}

func (a *API) install(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	id, ok := cut(r.URL.Path, "/api/system/tools/", "/install")
	if !ok {
		write(w, http.StatusNotFound, "task not found", nil)
		return
	}

	name, err := url.PathUnescape(id)
	if err != nil {
		write(w, http.StatusBadRequest, "invalid tool id", nil)
		return
	}

	slog.Info("tool install request", "tool", name)
	task, err := a.svc.Install(context.Background(), name)
	if err == nil {
		slog.Info("tool install started", "tool", name, "task_id", task.ID)
		write(w, http.StatusOK, "ok", task)
		return
	}

	if errors.Is(err, tool.ErrBusy()) {
		slog.Warn("tool install busy", "tool", name)
		write(w, http.StatusConflict, err.Error(), nil)
		return
	}

	if errors.Is(err, tool.ErrTool()) {
		slog.Warn("tool install unsupported", "tool", name)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Error("tool install failed", "tool", name, "error", err)
	write(w, http.StatusBadRequest, err.Error(), nil)
}

func (a *API) task(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/system/tasks/")
	id, err := url.PathUnescape(id)
	if err != nil || id == "" {
		write(w, http.StatusBadRequest, "invalid task id", nil)
		return
	}

	task, ok := a.svc.Get(id)
	if !ok {
		slog.Debug("task not found", "task_id", id)
		write(w, http.StatusNotFound, "task not found", nil)
		return
	}

	write(w, http.StatusOK, "ok", task)
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
		body := system.Config{}
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

func (a *API) logs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	cfg, err := a.cfg.Load()
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	size := cfg.Logs.Tail
	raw := strings.TrimSpace(r.URL.Query().Get("tail"))
	if raw != "" {
		size, err = strconv.Atoi(raw)
		if err != nil {
			write(w, http.StatusBadRequest, "invalid tail", nil)
			return
		}
	}

	data, err := system.Tail(r.URL.Query().Get("kind"), size)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) opencodeStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) opencodeLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", map[string]any{
		"log": a.op.State().Log,
	})
}

func (a *API) opencodeStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Info("opencode start request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Ensure(ctx); err != nil {
		slog.Error("opencode start failed via API", "error", err)
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode started via API")
	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) opencodeRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Info("opencode restart request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Restart(ctx); err != nil {
		slog.Error("opencode restart failed via API", "error", err)
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode restarted via API")
	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) opencodeStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Info("opencode stop request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err := a.op.Stop(ctx)
	if err != nil && !errors.Is(err, opencode.ErrExternal()) {
		slog.Error("opencode stop failed via API", "error", err)
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode stopped via API")
	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) ipcStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.ip.State())
}

func cut(path string, pre string, suf string) (string, bool) {
	if !strings.HasPrefix(path, pre) || !strings.HasSuffix(path, suf) {
		return "", false
	}

	name := strings.TrimSuffix(strings.TrimPrefix(path, pre), suf)
	if name == "" || strings.Contains(name, "/") {
		return "", false
	}

	return name, true
}

func tail(path string, pre string) (string, bool) {
	if !strings.HasPrefix(path, pre) {
		return "", false
	}

	name := strings.TrimPrefix(path, pre)
	if name == "" || strings.Contains(name, "/") {
		return "", false
	}

	out, err := url.PathUnescape(name)
	if err != nil || out == "" {
		return "", false
	}
	return out, true
}

func readJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
