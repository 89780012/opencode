package web

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"strategy-service/internal/opencode"
	"strategy-service/internal/tool"
	"strategy-service/internal/workspace"
)

type API struct {
	svc *tool.Service
	ws  *workspace.Service
	op  *opencode.Manager
}

func NewAPI(svc *tool.Service, op *opencode.Manager) *API {
	return &API{
		svc: svc,
		ws:  workspace.NewService(),
		op:  op,
	}
}

func (a *API) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/workspace/list", a.workspaceList)
	mux.HandleFunc("/api/workspace/create", a.workspaceCreate)
	mux.HandleFunc("/api/workspace/files", a.workspaceFiles)
	mux.HandleFunc("/api/workspace/file-content", a.workspaceFileContent)
	mux.HandleFunc("/api/system/tools", a.tools)
	mux.HandleFunc("/api/system/tools/", a.install)
	mux.HandleFunc("/api/system/tasks/", a.task)
	mux.HandleFunc("/api/system/opencode/status", a.opencodeStatus)
	mux.HandleFunc("/api/system/opencode/logs", a.opencodeLogs)
	mux.HandleFunc("/api/system/opencode/start", a.opencodeStart)
	mux.HandleFunc("/api/system/opencode/restart", a.opencodeRestart)
	mux.HandleFunc("/api/system/opencode/stop", a.opencodeStop)
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	state := a.op.State()
	write(w, http.StatusOK, "ok", map[string]any{
		"status":         "ok",
		"opencode":       state,
		"opencode_ready": state.Ready,
	})
}

func (a *API) tools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.svc.List(r.Context()))
}

func (a *API) workspaceList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	data, err := a.ws.List()
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Name string `json:"name"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data, err := a.ws.Create(body.Name)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	data, err := a.ws.Files(r.URL.Query().Get("workspace_path"))
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceFileContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	data, err := a.ws.Content(
		r.URL.Query().Get("workspace_path"),
		r.URL.Query().Get("file_path"),
	)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

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

	task, err := a.svc.Install(context.Background(), name)
	if err == nil {
		write(w, http.StatusOK, "ok", task)
		return
	}

	if errors.Is(err, tool.ErrBusy()) {
		write(w, http.StatusConflict, err.Error(), nil)
		return
	}

	if errors.Is(err, tool.ErrTool()) {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

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
		write(w, http.StatusNotFound, "task not found", nil)
		return
	}

	write(w, http.StatusOK, "ok", task)
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

	if err := a.op.Ensure(r.Context()); err != nil {
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) opencodeRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	if err := a.op.Restart(r.Context()); err != nil {
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	write(w, http.StatusOK, "ok", a.op.State())
}

func (a *API) opencodeStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	err := a.op.Stop(r.Context())
	if err != nil && !errors.Is(err, opencode.ErrExternal()) {
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	write(w, http.StatusOK, "ok", a.op.State())
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

func readJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
