package web

import (
	"net/http"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/logs"
	oc "strategy-service/internal/opencode"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	"strategy-service/internal/workspace"

	"github.com/gin-gonic/gin"
)

type API struct {
	ws  *workspace.Service
	op  *oc.Service
	cfg *cfg.Store
	sx  *smartx.Service
	log *logs.Hub
}

type envelope struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

func ok(c *gin.Context, data any) {
	c.JSON(http.StatusOK, envelope{
		Code: http.StatusOK,
		Msg:  "ok",
		Data: data,
	})
}

func fail(c *gin.Context, code int, msg string, data any) {
	c.JSON(code, envelope{
		Code: code,
		Msg:  msg,
		Data: data,
	})
}

func bad(c *gin.Context, err error) {
	fail(c, http.StatusBadRequest, err.Error(), nil)
}

// NewAPI 组装 API 所需的各类底层服务。
func NewAPI(run *rt.Service, op *oc.Service, cfg *cfg.Store, sx *smartx.Service) *API {
	return &API{
		ws:  workspace.NewService(run),
		op:  op,
		cfg: cfg,
		sx:  sx,
		log: logs.New(),
	}
}

// Register 将所有 HTTP 路由挂载到 gin 引擎上。
func (a *API) Register(r *gin.Engine) {
	api := r.Group("/api")
	api.GET("/health", a.health)

	op := api.Group("/opencode")
	op.GET("/agents", a.opencodeAgentsList)
	op.POST("/agents", a.opencodeAgentsCreate)
	op.PUT("/agents/:name", a.opencodeAgentUpdate)
	op.DELETE("/agents/:name", a.opencodeAgentDelete)
	op.GET("/skills", a.opencodeSkillsList)
	op.POST("/skills", a.opencodeSkillsCreate)
	op.PUT("/skills/:name", a.opencodeSkillUpdate)
	op.DELETE("/skills/:name", a.opencodeSkillDelete)
	op.POST("/discover", a.opencodeDiscover)

	ws := api.Group("/workspace")
	ws.GET("/list", a.workspaceList)
	ws.POST("/create", a.workspaceCreate)
	ws.POST("/attach", a.workspaceAttach)
	ws.POST("/import", a.workspaceImport)
	ws.POST("/delete", a.workspaceDelete)
	ws.POST("/open", a.workspaceOpen)
	ws.GET("/files", a.workspaceFiles)
	ws.GET("/file-content", a.workspaceFileGet)
	ws.PUT("/file-content", a.workspaceFilePut)

	sys := api.Group("/system")
	sys.GET("/config", a.configGet)
	sys.PUT("/config", a.configPut)
	sys.GET("/smartx/logs/meta", a.smartxLogsMeta)
	sys.GET("/smartx/logs/watch", a.smartxLogsWatch)
	sys.POST("/smartx/startExtension", a.smartxStart)
	sys.GET("/opencode/status", a.opencodeStatus)
	sys.POST("/opencode/start", a.opencodeStart)
	sys.POST("/opencode/restart", a.opencodeRestart)
	sys.POST("/opencode/stop", a.opencodeStop)

	log := api.Group("/logs")
	log.GET("/sources", a.logSources)
	log.GET("/tail", a.logTail)

	r.GET("/mcp", a.mcpGet)
	r.POST("/mcp", a.mcpPost)
}
