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

func (a *API) opencodeSkills(c *gin.Context) {
	if c.Request.Method == "GET" {
		data, err := opdoc.ListSkills()
		if err != nil {
			slog.Error("opencode skill list failed", "error", err)
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}
		c.JSON(200, envelope{Code: 200, Msg: "ok", Data: data})
		return
	}

	body := struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	item, err := opdoc.CreateSkill(body.Name, body.Content)
	if err != nil {
		slog.Error("opencode skill create failed", "name", body.Name, "error", err)
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
		"skill":           item,
		"reload_required": true,
	}})
}

func (a *API) opencodeAgents(c *gin.Context) {
	if c.Request.Method == "GET" {
		data, err := opdoc.ListAgents()
		if err != nil {
			slog.Error("opencode agent list failed", "error", err)
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}
		c.JSON(200, envelope{Code: 200, Msg: "ok", Data: data})
		return
	}

	body := struct {
		Name    string `json:"name"`
		Content string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	item, err := opdoc.CreateAgent(body.Name, body.Content)
	if err != nil {
		slog.Error("opencode agent create failed", "name", body.Name, "error", err)
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
		"agent":           item,
		"reload_required": true,
	}})
}

func (a *API) opencodeSkill(c *gin.Context) {
	name := c.Param("name")
	if c.Request.Method == "PUT" {
		body := struct {
			Content string `json:"content"`
		}{}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}

		item, err := opdoc.UpdateSkill(name, body.Content)
		if err != nil {
			slog.Error("opencode skill update failed", "name", name, "error", err)
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}

		c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
			"skill":           item,
			"reload_required": true,
		}})
		return
	}

	if err := opdoc.DeleteSkill(name); err != nil {
		slog.Error("opencode skill delete failed", "name", name, "error", err)
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
		"name":            name,
		"reload_required": true,
	}})
}

func (a *API) opencodeAgent(c *gin.Context) {
	name := c.Param("name")
	if c.Request.Method == "PUT" {
		body := struct {
			Content string `json:"content"`
		}{}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}

		item, err := opdoc.UpdateAgent(name, body.Content)
		if err != nil {
			slog.Error("opencode agent update failed", "name", name, "error", err)
			c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
			return
		}

		c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
			"agent":           item,
			"reload_required": true,
		}})
		return
	}

	if err := opdoc.DeleteAgent(name); err != nil {
		slog.Error("opencode agent delete failed", "name", name, "error", err)
		c.JSON(400, envelope{Code: 400, Msg: err.Error(), Data: nil})
		return
	}

	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: map[string]any{
		"name":            name,
		"reload_required": true,
	}})
}

func (a *API) opencodeStatus(c *gin.Context) {
	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: a.op.State()})
}

func (a *API) opencodeStart(c *gin.Context) {
	slog.Info("opencode start request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Ensure(ctx); err != nil {
		slog.Error("opencode start failed via API", "error", err)
		c.JSON(503, envelope{Code: 503, Msg: err.Error(), Data: a.op.State()})
		return
	}

	slog.Info("opencode started via API")
	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: a.op.State()})
}

func (a *API) opencodeRestart(c *gin.Context) {
	slog.Info("opencode restart request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	if err := a.op.Restart(ctx); err != nil {
		slog.Error("opencode restart failed via API", "error", err)
		c.JSON(503, envelope{Code: 503, Msg: err.Error(), Data: a.op.State()})
		return
	}

	slog.Info("opencode restarted via API")
	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: a.op.State()})
}

func (a *API) opencodeStop(c *gin.Context) {
	slog.Info("opencode stop request via API")
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	err := a.op.Stop(ctx)
	if err != nil && !errors.Is(err, oprun.ErrExternal()) {
		slog.Error("opencode stop failed via API", "error", err)
		c.JSON(503, envelope{Code: 503, Msg: err.Error(), Data: a.op.State()})
		return
	}

	slog.Info("opencode stopped via API")
	c.JSON(200, envelope{Code: 200, Msg: "ok", Data: a.op.State()})
}
