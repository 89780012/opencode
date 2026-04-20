package web

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"strategy-service/internal/asset"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/oprun"
)

type named struct {
	Name    string `json:"name"`
	Content string `json:"content"`
}

type content struct {
	Content string `json:"content"`
}

// list 统一处理 skill 和 agent 的列表接口。
func list[T any](c *gin.Context, kind string, fn func() (T, error)) {
	data, err := fn()
	if err != nil {
		slog.Error("opencode "+kind+" list failed", "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

// create 统一处理 skill 和 agent 的创建接口。
func create[T any](c *gin.Context, kind string, key string, fn func(string, string) (T, error)) {
	body := named{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	item, err := fn(body.Name, body.Content)
	if err != nil {
		slog.Error("opencode "+kind+" create failed", "name", body.Name, "error", err)
		bad(c, err)
		return
	}
	ok(c, map[string]any{
		key:               item,
		"reload_required": true,
	})
}

// update 统一处理 skill 和 agent 的更新接口。
func update[T any](c *gin.Context, kind string, key string, fn func(string, string) (T, error)) {
	body := content{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	name := c.Param("name")
	item, err := fn(name, body.Content)
	if err != nil {
		slog.Error("opencode "+kind+" update failed", "name", name, "error", err)
		bad(c, err)
		return
	}
	ok(c, map[string]any{
		key:               item,
		"reload_required": true,
	})
}

// del 统一处理 skill 和 agent 的删除接口。
func del(c *gin.Context, kind string, fn func(string) error) {
	name := c.Param("name")
	if err := fn(name); err != nil {
		slog.Error("opencode "+kind+" delete failed", "name", name, "error", err)
		bad(c, err)
		return
	}
	ok(c, map[string]any{
		"name":            name,
		"reload_required": true,
	})
}

// run 统一处理 opencode 运行态接口。
func run(c *gin.Context, act string, fn func(context.Context) (oprun.State, error)) {
	slog.Info("opencode " + act + " request via API")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	defer cancel()

	state, err := fn(ctx)
	if err != nil {
		slog.Error("opencode "+act+" failed via API", "error", err)
		fail(c, 503, err.Error(), state)
		return
	}

	slog.Info("opencode " + act + " completed via API")
	ok(c, state)
}

func syncMCP(c *gin.Context) error {
	url := origin(c)
	if url == "" {
		return nil
	}
	return asset.EnsureMCP(url)
}

func origin(c *gin.Context) string {
	host := strings.TrimSpace(c.Request.Host)
	if host == "" {
		host = strings.TrimSpace(c.Request.URL.Host)
	}
	if host == "" {
		return ""
	}

	proto := strings.TrimSpace(c.GetHeader("X-Forwarded-Proto"))
	if proto == "" {
		if c.Request.TLS != nil {
			proto = "https"
		} else {
			proto = "http"
		}
	}
	return proto + "://" + host
}

func (a *API) opencodeSkillsList(c *gin.Context) {
	list(c, "skill", a.op.ListSkills)
}

func (a *API) opencodeSkillsCreate(c *gin.Context) {
	create(c, "skill", "skill", a.op.CreateSkill)
}

func (a *API) opencodeAgentsList(c *gin.Context) {
	list(c, "agent", a.op.ListAgents)
}

func (a *API) opencodeAgentsCreate(c *gin.Context) {
	create(c, "agent", "agent", a.op.CreateAgent)
}

func (a *API) opencodeSkillUpdate(c *gin.Context) {
	update(c, "skill", "skill", a.op.UpdateSkill)
}

func (a *API) opencodeSkillDelete(c *gin.Context) {
	del(c, "skill", a.op.DeleteSkill)
}

func (a *API) opencodeAgentUpdate(c *gin.Context) {
	update(c, "agent", "agent", a.op.UpdateAgent)
}

func (a *API) opencodeAgentDelete(c *gin.Context) {
	del(c, "agent", a.op.DeleteAgent)
}

func (a *API) opencodeStatus(c *gin.Context) {
	ok(c, a.op.State())
}

func (a *API) opencodeStart(c *gin.Context) {
	if err := syncMCP(c); err != nil {
		slog.Error("opencode start mcp sync failed", "error", err)
		bad(c, err)
		return
	}
	run(c, "start", a.op.Start)
}

func (a *API) opencodeRestart(c *gin.Context) {
	if err := syncMCP(c); err != nil {
		slog.Error("opencode restart mcp sync failed", "error", err)
		bad(c, err)
		return
	}
	run(c, "restart", a.op.Restart)
}

func (a *API) opencodeStop(c *gin.Context) {
	run(c, "stop", a.op.Stop)
}
