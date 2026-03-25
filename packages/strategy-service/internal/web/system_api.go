package web

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/logs"
	"strategy-service/internal/meta"
	"strategy-service/internal/smartx"
	"strategy-service/internal/tool"
)

func (a *API) tools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Debug("tools list request")
	write(w, http.StatusOK, "ok", a.svc.List(r.Context()))
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

func (a *API) version(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", meta.Current())
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

	data, err := logs.Tail(r.URL.Query().Get("kind"), size)
	if err != nil {
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) ipcStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.ip.State())
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
