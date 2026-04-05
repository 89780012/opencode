package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

func (a *API) health(c *gin.Context) {
	state := a.op.State()
	slog.Debug("health check", "opencode_ready", state.Ready, "opencode_status", state.Status)
	c.JSON(200, envelope{
		Code: 200,
		Msg:  "ok",
		Data: map[string]any{
			"status":         "ok",
			"opencode":       state,
			"opencode_ready": state.Ready,
		},
	})
}
