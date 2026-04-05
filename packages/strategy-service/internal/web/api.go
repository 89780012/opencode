package web

import (
	"net/http"

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

// Register mounts all API routes onto the provided mux.
func (a *API) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/opencode/agents", a.opencodeAgents)
	mux.HandleFunc("/api/opencode/agents/", a.opencodeAgent)
	mux.HandleFunc("/api/opencode/skills", a.opencodeSkills)
	mux.HandleFunc("/api/opencode/skills/", a.opencodeSkill)
	mux.HandleFunc("/api/workspace/list", a.workspaceList)
	mux.HandleFunc("/api/workspace/create", a.workspaceCreate)
	mux.HandleFunc("/api/workspace/import", a.workspaceImport)
	mux.HandleFunc("/api/workspace/delete", a.workspaceDelete)
	mux.HandleFunc("/api/workspace/open", a.workspaceOpen)
	mux.HandleFunc("/api/workspace/files", a.workspaceFiles)
	mux.HandleFunc("/api/workspace/file-content", a.workspaceFileContent)
	mux.HandleFunc("/api/system/startup", a.startup)
	mux.HandleFunc("/api/system/startup/prepare", a.startupPrepare)
	mux.HandleFunc("/api/system/config", a.config)
	mux.HandleFunc("/api/system/version", a.version)
	mux.HandleFunc("/api/logs/sources", a.logSources)
	mux.HandleFunc("/api/logs/tail", a.logTail)
	mux.HandleFunc("/mcp", a.smartxMCP)
	mux.HandleFunc("/api/system/smartx/logs/meta", a.smartxLogsMeta)
	mux.HandleFunc("/api/system/smartx/logs/watch", a.smartxLogsWatch)
	mux.HandleFunc("/api/system/smartx/startExtension", a.smartxStart)
	mux.HandleFunc("/api/system/opencode/status", a.opencodeStatus)
	mux.HandleFunc("/api/system/opencode/start", a.opencodeStart)
	mux.HandleFunc("/api/system/opencode/restart", a.opencodeRestart)
	mux.HandleFunc("/api/system/opencode/stop", a.opencodeStop)
}
