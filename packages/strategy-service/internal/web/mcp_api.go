package web

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"strategy-service/internal/db"
	"strategy-service/internal/smartx"
	"strategy-service/internal/utils"
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

type rpcReq struct {
	JSONRPC string         `json:"jsonrpc"`
	ID      any            `json:"id,omitempty"`
	Method  string         `json:"method"`
	Params  map[string]any `json:"params,omitempty"`
}

type rpcRes struct {
	JSONRPC string `json:"jsonrpc"`
	ID      any    `json:"id,omitempty"`
	Result  any    `json:"result,omitempty"`
	Error   any    `json:"error,omitempty"`
}

func (a *API) mcpGet(c *gin.Context) {
	c.Header("Allow", http.MethodPost)
	c.Status(http.StatusMethodNotAllowed)
}

func (a *API) mcpPost(c *gin.Context) {
	req := rpcReq{}
	if err := c.ShouldBindJSON(&req); err != nil {
		mcpError(c, nil, -32700, "Parse error")
		return
	}
	if req.JSONRPC != "" && req.JSONRPC != "2.0" {
		mcpError(c, req.ID, -32600, "Invalid Request")
		return
	}

	switch req.Method {
	case "initialize":
		mcpResult(c, req.ID, map[string]any{
			"protocolVersion": "2025-03-26",
			"capabilities": map[string]any{
				"tools": map[string]any{},
			},
			"serverInfo": map[string]any{
				"name":    "strategy-service",
				"version": "dev",
			},
			"instructions": "Use start/logs for SmartX runtime work, use init_project_state/resume_project_state/save_project_state to maintain workspace memory, get_requirements for workspace requirements, refresh_workspace to request fresh workspace analysis plus flowchart, and save_analysis/save_flowchart/save_review to persist workspace analysis results. Use run_backtest only when the user explicitly requests execution; it returns immediately, while list_backtests/get_backtest read persisted status and results. Progress events are recorded automatically for these operations.",
		})
	case "notifications/initialized":
		c.Status(202)
	case "ping":
		mcpResult(c, req.ID, map[string]any{})
	case "tools/list":
		mcpResult(c, req.ID, map[string]any{
			"tools": append([]map[string]any{
				{
					"name":        "start",
					"description": "Start a SmartX strategy extension through strategy-service.",
					"inputSchema": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"name": map[string]any{
								"type":        "string",
								"description": "Extension name.",
							},
							"workspacePath": prop("string", "Current workspace path injected by the workflow."),
							"sessionId":     prop("string", "Current main session id injected by the workflow."),
							"workflowId":    prop("string", "Automatic workflow id injected by the workflow."),
							"requestKey":    prop("string", "Stable automatic stage key injected by the workflow."),
						},
						"required":             []string{"name"},
						"additionalProperties": false,
					},
				},
				{
					"name":        "logs",
					"description": "Watch SmartX strategy logs for a short period and return recent updates.",
					"inputSchema": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"name": map[string]any{
								"type":        "string",
								"description": "Extension or strategy name used to prioritize log files.",
							},
							"seconds": map[string]any{
								"type":        "integer",
								"description": "How long to watch logs. Defaults to 10 seconds.",
							},
							"tail": map[string]any{
								"type":        "integer",
								"description": "Maximum number of lines to keep per file. Defaults to 200.",
							},
							"limit": map[string]any{
								"type":        "integer",
								"description": "Maximum number of files to inspect. Defaults to 3.",
							},
							"workspacePath": prop("string", "Current workspace path injected by the workflow."),
							"sessionId":     prop("string", "Current main session id injected by the workflow."),
							"workflowId":    prop("string", "Automatic workflow id injected by the workflow."),
							"debugId":       prop("string", "Debug run id injected by the workflow."),
							"requestKey":    prop("string", "Stable automatic stage key injected by the workflow."),
						},
						"additionalProperties": false,
					},
				},
				{
					"name":        "init_project_state",
					"description": "Initialize .project-state for a workspace before sustained SmartX work.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"sessionId":     prop("string", "Optional workbench session id."),
						"project":       prop("string", "Optional project name."),
						"phase":         prop("string", "Optional current phase."),
						"status":        prop("string", "Optional current status."),
						"current":       prop("string", "Optional current task summary."),
						"summary":       prop("string", "Optional project summary."),
						"next": map[string]any{
							"type":        "array",
							"description": "Optional next steps.",
							"items":       map[string]any{"type": "string"},
						},
						"risks": map[string]any{
							"type":        "array",
							"description": "Optional risks.",
							"items":       map[string]any{"type": "string"},
						},
						"verified": prop("boolean", "Whether the current state is verified."),
						"dirty":    prop("boolean", "Whether the initialized memory should be marked dirty."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "resume_project_state",
					"description": "Restore current project memory from .project-state.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"sessionId":     prop("string", "Workbench session id used to restore an automatic review."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "get_project_state",
					"description": "Read current project memory from .project-state without mutating it.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "save_project_state",
					"description": "Persist the latest project progress and handoff state to .project-state.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"sessionId":     prop("string", "Optional workbench session id."),
						"phase":         prop("string", "Current phase."),
						"status":        prop("string", "Current status."),
						"current":       prop("string", "Current task summary."),
						"summary":       prop("string", "Current progress summary."),
						"next": map[string]any{
							"type":        "array",
							"description": "Next steps.",
							"items":       map[string]any{"type": "string"},
						},
						"risks": map[string]any{
							"type":        "array",
							"description": "Current risks.",
							"items":       map[string]any{"type": "string"},
						},
						"verified": prop("boolean", "Whether the current state is verified."),
						"dirty":    prop("boolean", "Whether memory remains dirty after save."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "validate_project_state",
					"description": "Validate .project-state structure and repair missing template files when possible.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "save_analysis",
					"description": "Persist workspace strategy analysis results. Always provide both items and text, and write all analysis content in Chinese.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"state":         prop("string", "Analysis state: running or done."),
						"items": map[string]any{
							"type":        "array",
							"description": "Required Chinese analysis items. Use concise Chinese strings.",
							"items": map[string]any{
								"type": "string",
							},
						},
						"text": prop("string", "Required serialized analysis text in Chinese. Keep it consistent with items."),
					}, []string{"workspacePath", "items", "text"}),
				},
				{
					"name":        "get_analysis",
					"description": "Read persisted workspace strategy analysis.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "get_requirements",
					"description": "Read the requirement list identified for a SmartX workspace session.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"sessionId":     prop("string", "Workbench session id."),
					}, []string{"workspacePath", "sessionId"}),
				},
				{
					"name":        "refresh_workspace",
					"description": "Request fresh workspace strategy analysis and flowchart before continuing. Use after code changes or when current workspace understanding is stale.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"reason":        prop("string", "Why analysis and flowchart must be refreshed."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "save_flowchart",
					"description": "Persist workspace strategy flowchart Mermaid code.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"state":         prop("string", "Flowchart state: generating, done, or error."),
						"code":          prop("string", "Mermaid flowchart code."),
						"err":           prop("string", "Error text when state is error."),
						"analysisHash":  prop("string", "Optional analysis hash."),
						"manual":        prop("boolean", "Whether this flowchart was manually edited."),
						"source":        prop("string", "Flowchart source."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "get_flowchart",
					"description": "Read persisted workspace strategy flowchart.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
				{
					"name":        "save_review",
					"description": "Persist workspace strategy review results. Always write summary, items, and suggestions in Chinese.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
						"reviewId":      prop("string", "Stable review request id."),
						"sessionId":     prop("string", "Workbench session id."),
						"state":         prop("string", "Review state: running, passed, failed, or error."),
						"summary":       prop("string", "Required Chinese review summary."),
						"items": map[string]any{
							"type":        "array",
							"description": "Required Chinese review items.",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"name":       prop("string", "Chinese review item name."),
									"status":     prop("string", "Item status: passed, failed, warning, running, or error."),
									"detail":     prop("string", "Chinese review detail."),
									"suggestion": prop("string", "Chinese fix suggestion."),
								},
								"required":             []string{"name", "status", "detail"},
								"additionalProperties": false,
							},
						},
						"suggestions": map[string]any{
							"type":        "array",
							"description": "Chinese follow-up suggestions.",
							"items": map[string]any{
								"type": "string",
							},
						},
					}, []string{"workspacePath", "reviewId", "sessionId", "summary", "items", "suggestions"}),
				},
				{
					"name":        "get_review",
					"description": "Read persisted workspace strategy review.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
			}, backtestTools()...),
		})
	case "tools/call":
		call := req.Params
		name := text(call["name"])
		args, _ := call["arguments"].(map[string]any)
		slog.Info("mcp tools call",
			"id", req.ID,
			"name", name,
			"workspace_path", text(args["workspacePath"]),
			"worktree_path", text(args["worktreePath"]),
			"session_id", text(args["sessionId"]),
			"state", text(args["state"]),
		)
		switch name {
		case "start":
			name, row, err := a.mcpDebug(c.Request.Context(), args)
			if err != nil {
				mcpToolResult(c, req.ID, err.Error(), nil, true)
				return
			}
			if row.ID != "" {
				key := text(args["requestKey"])
				recovering := row.DebugID != "" && row.DebugRequestKey != ""
				if row.DebugRequestKey != "" && row.DebugRequestKey != key {
					mcpToolResult(c, req.ID, "debug request key does not belong to workflow", nil, true)
					return
				}
				if row.State == "running" && row.DebugID != "" {
					body := map[string]any{"version": 1, "accepted": true, "reason": "idempotent", "debugId": row.DebugID, "live": true, "workflowId": row.ID}
					mcpToolResult(c, req.ID, jsonText(body), body, false)
					return
				}
				if row.DebugID == "" || row.DebugRequestKey == "" {
					row, err = a.mcpClaimDebug(c.Request.Context(), row, name, key)
					if err != nil {
						mcpToolResult(c, req.ID, err.Error(), nil, true)
						return
					}
				}
				if recovering {
					a.mcpRestoreDebug(row, name)
				}
				if recovering && a.sx.Alive(c.Request.Context(), name+"-local") {
					row, err = a.mcpBindDebug(c.Request.Context(), row, smartx.Result{DebugID: row.DebugID})
					if err != nil {
						mcpToolResult(c, req.ID, err.Error(), nil, true)
						return
					}
					body := map[string]any{"version": 1, "accepted": true, "reason": "recovered", "debugId": row.DebugID, "live": true, "workflowId": row.ID}
					mcpToolResult(c, req.ID, jsonText(body), body, false)
					return
				}
			}
			out, err := a.sx.Start(c.Request.Context(), smartx.Input{
				Name:    name,
				DebugID: row.DebugID,
				Started: row.UpdatedAt,
				Cursor:  row.DebugCursor,
			})
			if err != nil {
				mcpToolResult(c, req.ID, err.Error(), nil, true)
				return
			}
			if row.ID != "" {
				row, err = a.mcpBindDebug(c.Request.Context(), row, out)
				if err != nil {
					mcpToolResult(c, req.ID, err.Error(), nil, true)
					return
				}
			}
			body := map[string]any{
				"version":    1,
				"accepted":   true,
				"reason":     "created",
				"name":       out.Name,
				"account":    out.Account,
				"window_id":  out.WindowId,
				"output":     out.Output,
				"debugId":    out.DebugID,
				"startedAt":  out.Started,
				"live":       out.Live,
				"workflowId": row.ID,
			}
			mcpToolResult(c, req.ID, jsonText(body), body, false)
		case "logs":
			name, row, check := a.mcpDebug(c.Request.Context(), args)
			if check != nil {
				mcpToolResult(c, req.ID, check.Error(), nil, true)
				return
			}
			if row.ID != "" {
				if row.DebugID == "" {
					mcpToolResult(c, req.ID, "automatic debug run has not started", nil, true)
					return
				}
				a.mcpRestoreDebug(row, name)
				out, err := a.sx.WatchDebug(c.Request.Context(), row.DebugID, number(args["tail"]), number(args["limit"]), time.Duration(number(args["seconds"]))*time.Second)
				if err != nil {
					mcpToolResult(c, req.ID, err.Error(), nil, true)
					return
				}
				mcpToolResult(c, req.ID, jsonText(out), out, false)
				return
			}
			out, err := a.sx.Watch(c.Request.Context(), text(args["name"]), number(args["tail"]), number(args["limit"]), time.Duration(number(args["seconds"]))*time.Second)
			if err != nil {
				mcpToolResult(c, req.ID, err.Error(), nil, true)
				return
			}
			body := map[string]any{
				"name":    out.Name,
				"dir":     out.Dir,
				"tail":    out.Tail,
				"limit":   out.Limit,
				"seconds": out.Seconds,
				"files":   out.Files,
				"logs":    out.Logs,
			}
			mcpToolResult(c, req.ID, jsonText(body), body, false)
		case "run_backtest", "list_backtests", "get_backtest", "get_backtest_config":
			a.mcpBacktest(c, req.ID, name, args)
		case "init_project_state":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.InitProjectState(ctx, workbench.ProjectStateInitReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					SessionID:     text(args["sessionId"]),
					Project:       text(args["project"]),
					Phase:         text(args["phase"]),
					Status:        text(args["status"]),
					Current:       text(args["current"]),
					Summary:       text(args["summary"]),
					Next:          texts(args["next"]),
					Risks:         texts(args["risks"]),
					Verified:      boolptr(args["verified"]),
					Dirty:         boolptr(args["dirty"]),
				})
			})
		case "resume_project_state":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.ResumeProjectState(ctx, workbench.ProjectStateGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
				})
			})
		case "get_project_state":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.GetProjectState(ctx, workbench.ProjectStateGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
				})
			})
		case "save_project_state":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.SaveProjectState(ctx, workbench.ProjectStateSaveReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					SessionID:     text(args["sessionId"]),
					Phase:         text(args["phase"]),
					Status:        text(args["status"]),
					Current:       text(args["current"]),
					Summary:       text(args["summary"]),
					Next:          texts(args["next"]),
					Risks:         texts(args["risks"]),
					Verified:      boolptr(args["verified"]),
					Dirty:         boolptr(args["dirty"]),
				})
			})
		case "validate_project_state":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.ValidateProjectState(ctx, workbench.ProjectStateGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
				})
			})
		case "save_analysis":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				data, err := a.bench.SaveAnalysis(ctx, workbench.AnalysisReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					State:         text(args["state"]),
					Items:         texts(args["items"]),
					Text:          text(args["text"]),
				})
				if err == nil {
					a.event.emitBroadcast("analysis.updated", utils.Pack(data))
				}
				return data, err
			})
		case "get_analysis":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.GetAnalysis(ctx, workbench.AnalysisGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
				})
			})
		case "get_requirements":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.GetRequirements(ctx, workbench.RequirementsGet{
					WorkspacePath: text(args["workspacePath"]),
					SessionID:     text(args["sessionId"]),
				})
			})
		case "refresh_workspace":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				data, err := a.bench.RefreshWorkspace(ctx, workbench.RefreshReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					Reason:        text(args["reason"]),
				})
				if err == nil {
					a.event.emitBroadcast("analysis.updated", utils.Pack(data.Analysis))
					a.event.emitBroadcast("flowchart.updated", utils.Pack(data.Flowchart))
				}
				return data, err
			})
		case "save_flowchart":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				data, err := a.bench.SaveFlowchart(ctx, workbench.FlowchartReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					State:         text(args["state"]),
					Code:          text(args["code"]),
					Err:           text(args["err"]),
					AnalysisHash:  text(args["analysisHash"]),
					Manual:        boolean(args["manual"]),
					Source:        text(args["source"]),
				})
				if err == nil {
					a.event.emitBroadcast("flowchart.updated", utils.Pack(data))
				}
				return data, err
			})
		case "get_flowchart":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.GetFlowchart(ctx, workbench.FlowchartGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
				})
			})
		case "save_review":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				data, err := a.bench.SaveReview(ctx, workbench.ReviewReq{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					ReviewID:      text(args["reviewId"]),
					SessionID:     text(args["sessionId"]),
					State:         text(args["state"]),
					Summary:       text(args["summary"]),
					Items:         reviewItems(args["items"]),
					Suggestions:   texts(args["suggestions"]),
				})
				if err == nil {
					a.event.emitBroadcast("review.updated", utils.Pack(data))
				}
				return data, err
			})
		case "get_review":
			mcpWorkbench(c.Request.Context(), req.ID, c, func(ctx context.Context) (any, error) {
				return a.bench.GetReview(ctx, workbench.ReviewGet{
					WorkspacePath: text(args["workspacePath"]),
					WorktreePath:  text(args["worktreePath"]),
					SessionID:     text(args["sessionId"]),
				})
			})
		default:
			mcpError(c, req.ID, -32601, "Method not found")
		}
	default:
		mcpError(c, req.ID, -32601, "Method not found")
	}
}

func (a *API) mcpDebug(ctx context.Context, args map[string]any) (string, workbench.WorkflowRow, error) {
	id := text(args["workflowId"])
	if id == "" {
		return text(args["name"]), workbench.WorkflowRow{}, nil
	}
	row, err := a.bench.GetWorkflow(ctx, workbench.WorkflowGet{WorkspacePath: text(args["workspacePath"]), SessionID: text(args["sessionId"])})
	if err != nil {
		return "", workbench.WorkflowRow{}, err
	}
	if row.ID != id || row.Stage != "debug" || row.State == "failed" || row.State == "review_exhausted" {
		return "", workbench.WorkflowRow{}, fmt.Errorf("invalid automatic debug workflow")
	}
	if debug := text(args["debugId"]); debug != "" && row.DebugID != debug {
		return "", workbench.WorkflowRow{}, fmt.Errorf("debug run does not belong to workflow")
	}
	return filepath.Base(row.WorkspacePath), row, nil
}

func (a *API) mcpBindDebug(ctx context.Context, row workbench.WorkflowRow, out smartx.Result) (workbench.WorkflowRow, error) {
	run, ok := a.sx.Debug(out.DebugID)
	if !ok {
		return workbench.WorkflowRow{}, fmt.Errorf("debug run context not found")
	}
	return a.bench.UpdateWorkflow(ctx, workbench.WorkflowUpdate{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Stage:         "debug",
		State:         "running",
		DebugID:       out.DebugID,
		DebugCursor:   run.Cursor,
		Summary:       "策略已启动，等待增量日志检查。",
	})
}

func (a *API) mcpClaimDebug(ctx context.Context, row workbench.WorkflowRow, name string, key string) (workbench.WorkflowRow, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return workbench.WorkflowRow{}, fmt.Errorf("automatic debug request key is required")
	}
	id := row.DebugID
	if id == "" {
		id = strings.Replace(row.ID, "workflow_", "debug_", 1)
	}
	claim, err := a.sx.Claim(name, id)
	if err != nil {
		return workbench.WorkflowRow{}, err
	}
	return a.bench.UpdateWorkflow(ctx, workbench.WorkflowUpdate{
		ID:              row.ID,
		WorkspacePath:   row.WorkspacePath,
		SessionID:       row.SessionID,
		Stage:           "debug",
		State:           "requested",
		DebugID:         claim.ID,
		DebugCursor:     claim.Cursor,
		DebugRequestKey: key,
		Summary:         "自动调试已声明，准备启动策略。",
	})
}

func (a *API) mcpRestoreDebug(row workbench.WorkflowRow, name string) {
	if _, ok := a.sx.Debug(row.DebugID); ok {
		return
	}
	a.sx.Restore(smartx.Debug{
		ID:      row.DebugID,
		Name:    strings.TrimSpace(name) + "-local",
		Filter:  strings.TrimSpace(name),
		Started: row.UpdatedAt,
		Cursor:  row.DebugCursor,
	})
}

func mcpWorkbench(ctx context.Context, id any, c *gin.Context, run func(context.Context) (any, error)) {
	body, err := run(ctx)
	if errors.Is(err, db.ErrNotFound) {
		slog.Info("mcp workbench result", "id", id, "status", "not_found")
		mcpToolResult(c, id, "null", map[string]any{}, false)
		return
	}
	if err != nil {
		slog.Warn("mcp workbench result", "id", id, "status", "error", "error", err)
		mcpToolResult(c, id, err.Error(), map[string]any{"error": err.Error()}, true)
		return
	}
	slog.Info("mcp workbench result", "id", id, "status", "ok")
	mcpToolResult(c, id, jsonText(body), body, false)
}

func schema(props map[string]any, required []string) map[string]any {
	return map[string]any{
		"type":                 "object",
		"properties":           props,
		"required":             required,
		"additionalProperties": false,
	}
}

func prop(kind string, desc string) map[string]any {
	return map[string]any{
		"type":        kind,
		"description": desc,
	}
}

func mcpResult(c *gin.Context, id any, body any) {
	c.JSON(200, rpcRes{
		JSONRPC: "2.0",
		ID:      id,
		Result:  body,
	})
}

func mcpError(c *gin.Context, id any, code int, msg string) {
	c.JSON(200, rpcRes{
		JSONRPC: "2.0",
		ID:      id,
		Error: map[string]any{
			"code":    code,
			"message": msg,
		},
	})
}

func mcpToolResult(c *gin.Context, id any, text string, body any, bad bool) {
	if body == nil {
		body = map[string]any{}
	}
	mcpResult(c, id, map[string]any{
		"content": []map[string]any{
			{
				"type": "text",
				"text": strings.TrimSpace(text),
			},
		},
		"structuredContent": body,
		"isError":           bad,
	})
}

func jsonText(v any) string {
	body, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return "{}"
	}
	return string(body)
}

func text(v any) string {
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	default:
		return ""
	}
}

func texts(v any) []string {
	list, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(list))
	for _, item := range list {
		out = append(out, text(item))
	}
	return out
}

func reviewItems(v any) []workbench.ReviewItem {
	list, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]workbench.ReviewItem, 0, len(list))
	for _, item := range list {
		row, ok := item.(map[string]any)
		if !ok {
			continue
		}
		out = append(out, workbench.ReviewItem{
			Name:       text(row["name"]),
			Status:     text(row["status"]),
			Detail:     text(row["detail"]),
			Suggestion: text(row["suggestion"]),
		})
	}
	return out
}

func boolean(v any) bool {
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return strings.EqualFold(strings.TrimSpace(x), "true")
	default:
		return false
	}
}

func boolptr(v any) *bool {
	switch x := v.(type) {
	case bool:
		return &x
	case string:
		text := strings.TrimSpace(x)
		if text == "" {
			return nil
		}
		next := strings.EqualFold(text, "true")
		return &next
	default:
		return nil
	}
}

func number(v any) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case int:
		return x
	case string:
		out, err := strconv.Atoi(strings.TrimSpace(x))
		if err == nil {
			return out
		}
	}
	return 0
}
