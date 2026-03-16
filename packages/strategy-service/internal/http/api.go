package web

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"strategy-service/internal/tool"
)

type API struct {
	svc *tool.Service
}

func NewAPI(svc *tool.Service) *API {
	return &API{svc: svc}
}

func (a *API) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/system/tools", a.tools)
	mux.HandleFunc("/api/system/tools/", a.install)
	mux.HandleFunc("/api/system/tasks/", a.task)
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", map[string]string{"status": "ok"})
}

func (a *API) tools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.svc.List(r.Context()))
}

func (a *API) install(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	id, ok := cut(r.URL.Path, "/api/system/tools/", "/install")
	if !ok {
		write(w, http.StatusNotFound, "not found", nil)
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
