package web

import (
	"net/http"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/group"
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	"strategy-service/internal/workspace"
)

type API struct {
	rt  *rt.Service
	gs  *group.Service
	ws  *workspace.Service
	op  *oprun.Manager
	cfg *cfg.Store
	sx  *smartx.Service
}

// NewAPI wires the HTTP handlers to the runtime services.
func NewAPI(run *rt.Service, op *oprun.Manager, cfg *cfg.Store, sx *smartx.Service) *API {
	return &API{
		rt:  run,
		ws:  workspace.NewService(run),
		op:  op,
		cfg: cfg,
		sx:  sx,
	}
}

// Register mounts all API routes onto the provided mux.
func (a *API) Register(mux *http.ServeMux) {
	a.gs = group.NewService(a.ws)
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/opencode/agents", a.opencodeAgents)
	mux.HandleFunc("/api/opencode/agents/", a.opencodeAgent)
	mux.HandleFunc("/api/opencode/skills", a.opencodeSkills)
	mux.HandleFunc("/api/opencode/skills/", a.opencodeSkill)
	mux.HandleFunc("/api/group/list", a.groupList)
	mux.HandleFunc("/api/group/detail", a.groupDetail)
	mux.HandleFunc("/api/group/create", a.groupCreate)
	mux.HandleFunc("/api/workspace/list", a.workspaceList)
	mux.HandleFunc("/api/workspace/create", a.workspaceCreate)
	mux.HandleFunc("/api/workspace/open", a.workspaceOpen)
	mux.HandleFunc("/api/workspace/files", a.workspaceFiles)
	mux.HandleFunc("/api/workspace/file-content", a.workspaceFileContent)
	mux.HandleFunc("/api/system/startup", a.startup)
	mux.HandleFunc("/api/system/startup/prepare", a.startupPrepare)
	mux.HandleFunc("/api/system/config", a.config)
	mux.HandleFunc("/api/system/version", a.version)
	mux.HandleFunc("/api/system/logs", a.logs)
	mux.HandleFunc("/mcp", a.smartxMCP)
	mux.HandleFunc("/api/system/smartx/logs/meta", a.smartxLogsMeta)
	mux.HandleFunc("/api/system/smartx/logs/watch", a.smartxLogsWatch)
	mux.HandleFunc("/api/system/smartx/startExtension", a.smartxStart)
	mux.HandleFunc("/api/system/opencode/status", a.opencodeStatus)
	mux.HandleFunc("/api/system/opencode/logs", a.opencodeLogs)
	mux.HandleFunc("/api/system/opencode/start", a.opencodeStart)
	mux.HandleFunc("/api/system/opencode/restart", a.opencodeRestart)
	mux.HandleFunc("/api/system/opencode/stop", a.opencodeStop)
}
