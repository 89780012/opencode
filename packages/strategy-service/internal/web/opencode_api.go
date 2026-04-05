package web

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/opdoc"
	"strategy-service/internal/oprun"
)

func (a *API) opencodeSkillsList(c *gin.Context) {
	data, err := opdoc.ListSkills()
	if err != nil {
		slog.Error("opencode skill list failed", "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) opencodeSkillsCreate(c *gin.Context) {
	body := struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	item, err := opdoc.CreateSkill(body.Name, body.Content)
	if err != nil {
		slog.Error("opencode skill create failed", "name", body.Name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"skill":           item,
		"reload_required": true,
	})
}

func (a *API) opencodeAgentsList(c *gin.Context) {
	data, err := opdoc.ListAgents()
	if err != nil {
		slog.Error("opencode agent list failed", "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) opencodeAgentsCreate(c *gin.Context) {
	body := struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	item, err := opdoc.CreateAgent(body.Name, body.Content)
	if err != nil {
		slog.Error("opencode agent create failed", "name", body.Name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"agent":           item,
		"reload_required": true,
	})
}

func (a *API) opencodeSkillUpdate(c *gin.Context) {
	body := struct {
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	name := c.Param("name")
	item, err := opdoc.UpdateSkill(name, body.Content)
	if err != nil {
		slog.Error("opencode skill update failed", "name", name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"skill":           item,
		"reload_required": true,
	})
}

func (a *API) opencodeSkillDelete(c *gin.Context) {
	name := c.Param("name")
	if err := opdoc.DeleteSkill(name); err != nil {
		slog.Error("opencode skill delete failed", "name", name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"name":            name,
		"reload_required": true,
	})
}

func (a *API) opencodeAgentUpdate(c *gin.Context) {
	body := struct {
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	name := c.Param("name")
	item, err := opdoc.UpdateAgent(name, body.Content)
	if err != nil {
		slog.Error("opencode agent update failed", "name", name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"agent":           item,
		"reload_required": true,
	})
}

func (a *API) opencodeAgentDelete(c *gin.Context) {
	name := c.Param("name")
	if err := opdoc.DeleteAgent(name); err != nil {
		slog.Error("opencode agent delete failed", "name", name, "error", err)
		bad(c, err)
		return
	}

	ok(c, map[string]any{
		"name":            name,
		"reload_required": true,
	})
}

func (a *API) opencodeStatus(c *gin.Context) {
	ok(c, a.op.State())
}

func (a *API) opencodeStart(c *gin.Context) {
	slog.Info("opencode start request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Ensure(ctx); err != nil {
		slog.Error("opencode start failed via API", "error", err)
		fail(c, 503, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode started via API")
	ok(c, a.op.State())
}

func (a *API) opencodeRestart(c *gin.Context) {
	slog.Info("opencode restart request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Restart(ctx); err != nil {
		slog.Error("opencode restart failed via API", "error", err)
		fail(c, 503, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode restarted via API")
	ok(c, a.op.State())
}

func (a *API) opencodeStop(c *gin.Context) {
	slog.Info("opencode stop request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err := a.op.Stop(ctx)
	if err != nil && !errors.Is(err, oprun.ErrExternal()) {
		slog.Error("opencode stop failed via API", "error", err)
		fail(c, 503, err.Error(), a.op.State())
		return
	}

	slog.Info("opencode stopped via API")
	ok(c, a.op.State())
}
