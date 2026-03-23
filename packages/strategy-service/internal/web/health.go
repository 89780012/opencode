package web

import (
	"log/slog"
	"net/http"
)

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
