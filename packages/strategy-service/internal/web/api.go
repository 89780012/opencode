package web

import (
	"context"
	"encoding/json"
	"net/http"

	"strategy-service/internal/backtest"
	cfg "strategy-service/internal/config"
	"strategy-service/internal/logs"
	"strategy-service/internal/modelchain"
	oc "strategy-service/internal/opencode"
	"strategy-service/internal/question"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	"strategy-service/internal/summary"
	"strategy-service/internal/workbench"
	"strategy-service/internal/workspace"

	"github.com/gin-gonic/gin"
)

type API struct {
	ws       *workspace.Service
	op       *oc.Service
	cfg      *cfg.Store
	sx       *smartx.Service
	log      *logs.Hub
	event    *socketHub
	question *question.Service
	summary  *summary.Service
	chain    *modelchain.Service
	bench    *workbench.Service
	back     *backtest.Service

	socketHandlers map[string]socketHandlerFunc
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

func backFail(c *gin.Context, code int, msg string, data any) {
	c.JSON(http.StatusOK, envelope{
		Code: code,
		Msg:  msg,
		Data: data,
	})
}

// NewAPI 组装 API 所需的各类底层服务。
func NewAPI(run *rt.Service, op *oc.Service, cfg *cfg.Store, sx *smartx.Service, question *question.Service, summary *summary.Service, chain *modelchain.Service, smartURL string) *API {
	if chain == nil {
		chain = modelchain.NewService(op)
	}
	api := &API{
		ws:       workspace.NewService(run),
		op:       op,
		cfg:      cfg,
		sx:       sx,
		log:      logs.New(),
		event:    newSocketHub(),
		question: question,
		summary:  summary,
		chain:    chain,
		bench:    workbench.NewService(op, chain, question, smartURL),
		back:     backtest.NewService(sx),
	}
	api.bench.SetEvent(func(ctx context.Context, kind string, payload json.RawMessage) {
		_ = ctx
		api.event.emitBroadcast(kind, payload)
	})
	api.back.SetEvent(func(ctx context.Context, kind string, payload json.RawMessage) {
		api.event.emitBroadcast(kind, payload)
		if kind != "backtest.updated" {
			return
		}
		row := backtest.Update{}
		if json.Unmarshal(payload, &row) != nil {
			return
		}
		_, _ = api.bench.UpdateWorkflowBacktest(ctx, row.WorkspacePath, row.SessionID, row.ID, row.Status, row.Error)
	})
	api.socketHandlers = map[string]socketHandlerFunc{
		"analysis.get":    api.handleAnalysisGet,
		"flowchart.get":   api.handleFlowchartGet,
		"progress.append": api.handleProgressAppend,
		"progress.get":    api.handleProgressGet,
		"review.get":      api.handleReviewGet,
		"workflow.get":    api.handleWorkflowGet,
		"question.append": api.handleQuestionAppend,
		"question.delete": api.handleQuestionDelete,
		"question.list":   api.handleQuestionList,
		"session.create":  api.handleSessionCreate,
		"session.delete":  api.handleSessionDelete,
		"session.detail":  api.handleSessionDetail,
		"session.list":    api.handleSessionList,
		"session.update":  api.handleSessionUpdate,
	}
	api.event.handle = api.socket
	return api
}

func (a *API) Start() error {
	return a.back.Start()
}

func (a *API) Close(ctx context.Context) error {
	return a.back.Close(ctx)
}

// Register 将所有 HTTP 路由挂载到 gin 引擎上。
func (a *API) Register(r *gin.Engine) {
	api := r.Group("/api")
	api.GET("/health", a.health)
	api.GET("/events/ws", a.event.serve)

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

	bench := api.Group("/workbench")
	bench.POST("/requirements/identify", a.workbenchIdentify)
	bench.PUT("/requirements", a.workbenchRequirementsPut)
	bench.GET("/analysis", a.workbenchAnalysisGet)
	bench.POST("/analysis", a.workbenchAnalysisPut)
	bench.GET("/flowchart", a.workbenchFlowchartGet)
	bench.POST("/flowchart", a.workbenchFlowchartPut)
	bench.GET("/progress", a.workbenchProgressGet)
	bench.POST("/progress", a.workbenchProgressPost)
	bench.GET("/review", a.workbenchReviewGet)
	bench.POST("/review", a.workbenchReviewPut)
	bench.GET("/workflow", a.workbenchWorkflowGet)
	bench.POST("/workflow", a.workbenchWorkflowPost)
	bench.PUT("/workflow", a.workbenchWorkflowPut)
	bench.PUT("/workflow/cancel", a.workbenchWorkflowCancel)
	bench.GET("/project-state", a.workbenchProjectStateGet)
	bench.POST("/project-state/init", a.workbenchProjectStateInit)
	bench.POST("/project-state/resume", a.workbenchProjectStateResume)
	bench.POST("/project-state/save", a.workbenchProjectStateSave)
	bench.POST("/project-state/validate", a.workbenchProjectStateValidate)

	back := api.Group("/backtest")
	back.GET("/config", a.backtestConfigGet)
	back.PUT("/config", a.backtestConfigPut)
	back.POST("/run", a.backtestRun)
	back.GET("/runs", a.backtestRuns)
	back.GET("/runs/:id", a.backtestRunGet)
	back.POST("/runs/:id/refresh", a.backtestRunRefresh)

	sum := api.Group("/summary")
	sum.GET("/session", a.summaryGet)
	sum.POST("/session", a.summaryRun)
	sum.POST("/session/stop", a.summaryStop)

	chain := api.Group("/model-chain")
	chain.GET("", a.modelChainGet)
	chain.PUT("", a.modelChainPut)
	chain.POST("/session/:sessionId/prompt", a.modelChainPrompt)

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
