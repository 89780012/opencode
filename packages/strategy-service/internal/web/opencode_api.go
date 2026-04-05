package web

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"strategy-service/internal/opdoc"
	"strategy-service/internal/oprun"
)

func (a *API) opencodeSkills(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		data, err := opdoc.ListSkills()
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

		item, err := opdoc.CreateSkill(body.Name, body.Content)
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
		data, err := opdoc.ListAgents()
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

		item, err := opdoc.CreateAgent(body.Name, body.Content)
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

		item, err := opdoc.UpdateSkill(name, body.Content)
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
		err := opdoc.DeleteSkill(name)
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

		item, err := opdoc.UpdateAgent(name, body.Content)
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
		err := opdoc.DeleteAgent(name)
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

func (a *API) opencodeStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	write(w, http.StatusOK, "ok", a.op.State())
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
	if err != nil && !errors.Is(err, oprun.ErrExternal()) {
		slog.Error("opencode stop failed via API", "error", err)
		write(w, http.StatusServiceUnavailable, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode stopped via API")
	write(w, http.StatusOK, "ok", a.op.State())
}
