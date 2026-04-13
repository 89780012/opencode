package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
	cfg "strategy-service/internal/config"
	"strategy-service/internal/logs"
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	"strategy-service/internal/workflow"
	"strategy-service/internal/workspace"
)

type API struct {
	rt  *rt.Service
	ws  *workspace.Service
	op  *oprun.Manager
	cfg *cfg.Store
	sx  *smartx.Service
	log *logs.Hub
	wf  *workflow.Service
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

// NewAPI wires the HTTP handlers to the runtime services.
func NewAPI(run *rt.Service, op *oprun.Manager, cfg *cfg.Store, sx *smartx.Service) *API {
	return &API{
		rt:  run,
		ws:  workspace.NewService(run),
		op:  op,
		cfg: cfg,
		sx:  sx,
		log: logs.New(),
		wf:  workflow.New(op),
	}
}

// Register mounts all API routes onto the provided engine.
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
	ws.GET("/chat-state", a.workspaceChatState)
	ws.POST("/chat-state/bind", a.workspaceChatBind)
	ws.POST("/chat-state/dispatch", a.workspaceChatDispatch)
	ws.POST("/chat-state/interrupt", a.workspaceChatInterrupt)

	sys := api.Group("/system")
	sys.GET("/startup", a.startup)
	sys.POST("/startup/prepare", a.startupPrepare)
	sys.GET("/config", a.configGet)
	sys.PUT("/config", a.configPut)
	sys.GET("/version", a.version)
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

	flow := api.Group("/workflow")
	flow.GET("", a.workflowList)
	flow.GET("/:id", a.workflowGet)
	flow.GET("/:id/summary", a.workflowSummary)
	flow.POST("", a.workflowSave)
	flow.PUT("/:id", a.workflowSave)
	flow.DELETE("/:id", a.workflowDelete)
	flow.POST("/:id/start", a.workflowStart)

	run := api.Group("/workflow-runs")
	run.GET("", a.workflowRuns)
	run.GET("/:id", a.workflowRunGet)
	run.GET("/:id/nodes", a.workflowRunNodes)
	run.GET("/:id/steps", a.workflowRunSteps)
	run.GET("/:id/waits", a.workflowRunWaits)
	run.POST("/:id/replies", a.workflowRunReply)

	r.POST("/mcp", a.mcpPost)
	r.GET("/mcp", a.mcpGet)
	r.DELETE("/mcp", a.mcpDelete)
}
