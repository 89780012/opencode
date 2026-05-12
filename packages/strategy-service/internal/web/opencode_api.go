package web

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"strategy-service/internal/asset"

	"strategy-service/internal/oprun"

	"github.com/gin-gonic/gin"
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

// opencodeDiscover 在服务端请求外部 provider 的 /models 端点，
// 避免浏览器直接请求外部 API 导致 CORS 错误。
func (a *API) opencodeDiscover(c *gin.Context) {
	var req struct {
		BaseURL string            `json:"baseURL"`
		ApiKey  string            `json:"apiKey"`
		Headers map[string]string `json:"headers"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		bad(c, err)
		return
	}

	url := strings.TrimRight(req.BaseURL, "/")
	if !strings.HasSuffix(url, "/models") {
		url += "/models"
	}

	hdr := http.Header{
		"Accept": {"application/json"},
	}
	for k, v := range req.Headers {
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k != "" && v != "" {
			hdr.Set(k, v)
		}
	}
	if key := strings.TrimSpace(req.ApiKey); key != "" && hdr.Get("Authorization") == "" {
		hdr.Set("Authorization", "Bearer "+key)
	}

	httpReq, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, url, nil)
	if err != nil {
		fail(c, http.StatusBadRequest, "无效的服务地址: "+err.Error(), nil)
		return
	}
	httpReq.Header = hdr

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		slog.Error("discover models request failed", "url", url, "error", err)
		fail(c, http.StatusBadGateway, "请求模型列表失败: "+err.Error(), nil)
		return
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		fail(c, http.StatusBadGateway, "读取响应失败: "+err.Error(), nil)
		return
	}

	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		if json.Unmarshal(raw, &errBody) == nil && errBody.Error.Message != "" {
			fail(c, resp.StatusCode, errBody.Error.Message, nil)
			return
		}
		fail(c, resp.StatusCode, "获取模型失败: "+resp.Status, nil)
		return
	}

	var data any
	if json.Unmarshal(raw, &data) != nil {
		fail(c, http.StatusBadGateway, "解析响应失败", nil)
		return
	}

	rows := extractModels(data)
	ok(c, rows)
}

// extractModels 从不同格式的响应中提取模型列表。
func extractModels(data any) []map[string]string {
	var arr []any
	switch v := data.(type) {
	case []any:
		arr = v
	case map[string]any:
		if d, ok := v["data"].([]any); ok {
			arr = d
		} else if m, ok := v["models"].([]any); ok {
			arr = m
		}
	}

	var out []map[string]string
	for _, item := range arr {
		m, ok := item.(map[string]any)
		if !ok {
			continue
		}
		id, _ := m["id"].(string)
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		name := id
		if n, _ := m["name"].(string); strings.TrimSpace(n) != "" {
			name = strings.TrimSpace(n)
		}
		out = append(out, map[string]string{"id": id, "name": name})
	}
	if out == nil {
		out = []map[string]string{}
	}
	return out
}
