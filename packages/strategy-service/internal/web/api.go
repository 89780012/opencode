package web

import (
	"net/http"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/ipc"
	"strategy-service/internal/oprun"
	"strategy-service/internal/smartx"
	"strategy-service/internal/tool"
	"strategy-service/internal/workspace"
)

type API struct {
	svc *tool.Service
	ws  *workspace.Service
	op  *oprun.Manager
	ip  *ipc.Manager
	cfg *cfg.Store
	sx  *smartx.Service
}

// NewAPI wires the HTTP handlers to the runtime services.
func NewAPI(svc *tool.Service, op *oprun.Manager, ip *ipc.Manager, cfg *cfg.Store, sx *smartx.Service) *API {
	return &API{
		svc: svc,
		ws:  workspace.NewService(),
		op:  op,
		ip:  ip,
		cfg: cfg,
		sx:  sx,
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
	mux.HandleFunc("/api/workspace/open", a.workspaceOpen)
	mux.HandleFunc("/api/workspace/files", a.workspaceFiles)
	mux.HandleFunc("/api/workspace/file-content", a.workspaceFileContent)
	mux.HandleFunc("/api/system/tools", a.tools)
	mux.HandleFunc("/api/system/tools/", a.install)
	mux.HandleFunc("/api/system/tasks/", a.task)
	mux.HandleFunc("/api/system/config", a.config)
	mux.HandleFunc("/api/system/version", a.version)
	mux.HandleFunc("/api/system/logs", a.logs)
	mux.HandleFunc("/api/system/smartx/startExtension", a.smartxStart)
	mux.HandleFunc("/api/system/opencode/status", a.opencodeStatus)
	mux.HandleFunc("/api/system/opencode/logs", a.opencodeLogs)
	mux.HandleFunc("/api/system/opencode/start", a.opencodeStart)
	mux.HandleFunc("/api/system/opencode/restart", a.opencodeRestart)
	mux.HandleFunc("/api/system/opencode/stop", a.opencodeStop)
	mux.HandleFunc("/api/system/ipc/status", a.ipcStatus)
}
