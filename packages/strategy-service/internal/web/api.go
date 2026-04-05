package web

import (
	"github.com/gin-gonic/gin"
	cfg "strategy-service/internal/config"
	"strategy-service/internal/logs"
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	"strategy-service/internal/workspace"
)

type API struct {
	rt  *rt.Service
	ws  *workspace.Service
	op  *oprun.Manager
	cfg *cfg.Store
	sx  *smartx.Service
	log *logs.Hub
}

type envelope struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
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
	}
}

// Register mounts all API routes onto the provided engine.
func (a *API) Register(r *gin.Engine) {
	api := r.Group("/api")
	api.GET("/health", a.health)

	op := api.Group("/opencode")
	op.GET("/agents", a.opencodeAgents)
	op.POST("/agents", a.opencodeAgents)
	op.PUT("/agents/:name", a.opencodeAgent)
	op.DELETE("/agents/:name", a.opencodeAgent)
	op.GET("/skills", a.opencodeSkills)
	op.POST("/skills", a.opencodeSkills)
	op.PUT("/skills/:name", a.opencodeSkill)
	op.DELETE("/skills/:name", a.opencodeSkill)

	ws := api.Group("/workspace")
	ws.GET("/list", a.workspaceList)
	ws.POST("/create", a.workspaceCreate)
	ws.POST("/import", a.workspaceImport)
	ws.POST("/delete", a.workspaceDelete)
	ws.POST("/open", a.workspaceOpen)
	ws.GET("/files", a.workspaceFiles)
	ws.GET("/file-content", a.workspaceFileContent)
	ws.PUT("/file-content", a.workspaceFileContent)

	sys := api.Group("/system")
	sys.GET("/startup", a.startup)
	sys.POST("/startup/prepare", a.startupPrepare)
	sys.GET("/config", a.config)
	sys.PUT("/config", a.config)
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

	r.Any("/mcp", a.smartxMCP)
}
