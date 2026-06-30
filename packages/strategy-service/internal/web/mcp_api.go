package web

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
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
			"instructions": "Use start/logs for SmartX runtime work, use init_project_state/resume_project_state/save_project_state to maintain workspace memory, get_requirements for workspace requirements, refresh_workspace to request fresh workspace analysis plus flowchart, and save_analysis/save_flowchart/save_review to persist workspace analysis results. Progress events are recorded automatically for these operations.",
		})
	case "notifications/initialized":
		c.Status(202)
	case "ping":
		mcpResult(c, req.ID, map[string]any{})
	case "tools/list":
		mcpResult(c, req.ID, map[string]any{
			"tools": []map[string]any{
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
					}, []string{"workspacePath", "summary", "items", "suggestions"}),
				},
				{
					"name":        "get_review",
					"description": "Read persisted workspace strategy review.",
					"inputSchema": schema(map[string]any{
						"workspacePath": prop("string", "Workspace path."),
						"worktreePath":  prop("string", "Worktree path. Defaults to workspacePath."),
					}, []string{"workspacePath"}),
				},
			},
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
			out, err := a.sx.Start(c.Request.Context(), smartx.Input{
				Name: text(args["name"]),
			})
			if err != nil {
				mcpToolResult(c, req.ID, err.Error(), nil, true)
				return
			}
			body := map[string]any{
				"name":      out.Name,
				"account":   out.Account,
				"window_id": out.WindowId,
				"output":    out.Output,
			}
			mcpToolResult(c, req.ID, jsonText(body), body, false)
		case "logs":
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
				})
			})
		default:
			mcpError(c, req.ID, -32601, "Method not found")
		}
	default:
		mcpError(c, req.ID, -32601, "Method not found")
	}
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
