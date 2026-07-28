package web

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

func backtestTools() []map[string]any {
	config := map[string]any{
		"type":                 "object",
		"properties":           backtestProps(),
		"additionalProperties": false,
	}
	return []map[string]any{
		{
			"name":        "run_backtest",
			"description": "Start one asynchronous backtest for the current workbench session. Returns immediately after the local pending task is created; do not poll repeatedly.",
			"inputSchema": schema(map[string]any{
				"workspacePath": prop("string", "Current workspace path injected by the workflow."),
				"sessionId":     prop("string", "Current main workbench session id injected by the workflow."),
				"requestKey":    prop("string", "Stable tool call key injected by the workflow."),
				"workflowId":    prop("string", "Optional automatic workflow id injected by the workflow."),
				"config":        config,
			}, []string{}),
		},
		{
			"name":        "list_backtests",
			"description": "List lightweight backtest status snapshots for the current workbench session.",
			"inputSchema": schema(map[string]any{
				"workspacePath": prop("string", "Current workspace path injected by the workflow."),
				"sessionId":     prop("string", "Current main workbench session id injected by the workflow."),
				"limit":         prop("integer", "Maximum snapshots to return. Defaults to 5 and is capped at 20."),
			}, []string{}),
		},
		{
			"name":        "get_backtest",
			"description": "Read scoped backtest status, config, and the completed summary. Raw results, data files, and log paths are omitted.",
			"inputSchema": schema(map[string]any{
				"id":            prop("string", "Backtest run id."),
				"workspacePath": prop("string", "Current workspace path injected by the workflow."),
				"sessionId":     prop("string", "Current main workbench session id injected by the workflow."),
			}, []string{"id"}),
		},
		{
			"name":        "get_backtest_config",
			"description": "Read the saved default backtest config without changing it.",
			"inputSchema": schema(map[string]any{
				"workspacePath": prop("string", "Current workspace path injected by the workflow."),
				"sessionId":     prop("string", "Current main workbench session id injected by the workflow."),
			}, []string{}),
		},
	}
}

func backtestProps() map[string]any {
	return map[string]any{
		"startTime":    prop("string", "Backtest start time."),
		"endTime":      prop("string", "Backtest end time."),
		"cash":         prop("number", "Initial cash, greater than zero."),
		"shStockSx":    prop("number", "Shanghai commission per ten thousand."),
		"shStockMinSx": prop("number", "Shanghai minimum commission."),
		"szStockSx":    prop("number", "Shenzhen commission per ten thousand."),
		"szStockMinSx": prop("number", "Shenzhen minimum commission."),
		"shStockGh":    prop("number", "Shanghai transfer fee per ten thousand."),
		"szStockGh":    prop("number", "Shenzhen transfer fee per ten thousand."),
		"buyYh":        prop("number", "Buy stamp duty per ten thousand."),
		"sellYh":       prop("number", "Sell stamp duty per ten thousand."),
		"rf":           prop("number", "Risk-free rate."),
		"slippage":     prop("number", "Slippage percentage."),
		"isTickMode":   prop("boolean", "Whether to use tick snapshots."),
		"useNewPrice":  prop("boolean", "Whether to trade at the latest price. Available only in tick snapshot mode."),
		"interval": map[string]any{
			"type":        "string",
			"description": "Bar interval. Empty when tick snapshots are selected.",
			"enum":        []string{"", "1d", "1m"},
		},
		"closeLog": prop("boolean", "Whether SmartX backtest logging is disabled."),
	}
}

func (a *API) mcpBacktest(c *gin.Context, id any, name string, args map[string]any) {
	if a.back == nil {
		mcpBacktestError(c, id, errors.New("backtest service is unavailable"))
		return
	}
	switch name {
	case "run_backtest":
		patch, err := decodePatch(args)
		if err != nil {
			mcpBacktestError(c, id, err)
			return
		}
		req := backtest.PatchReq{
			WorkspacePath: text(args["workspacePath"]),
			SessionID:     text(args["sessionId"]),
			RequestKey:    text(args["requestKey"]),
			Config:        patch,
		}
		// 先占用 Workflow 回测阶段，再创建本地任务和启动 worker，确保暂停或越序请求不会产生真实回测副作用。
		claim, err := a.claimBacktest(c, args)
		if err != nil {
			mcpBacktestError(c, id, err)
			return
		}
		row, reason, err := a.back.RunPatch(c.Request.Context(), req)
		if err == nil {
			if err := a.bindBacktest(c, args, row.ID); err != nil {
				_ = a.back.Cancel(c.Request.Context(), row.ID)
				a.failBacktest(c, claim, err.Error())
				mcpBacktestError(c, id, err)
				return
			}
			mcpBacktestOK(c, id, map[string]any{"version": 1, "accepted": true, "reason": reason, "run": row.Brief()})
			return
		}
		var conflict *backtest.Conflict
		if !errors.As(err, &conflict) {
			a.failBacktest(c, claim, err.Error())
			mcpBacktestError(c, id, err)
			return
		}
		if conflict.Run.WorkspacePath == req.WorkspacePath && conflict.Run.SessionID == req.SessionID {
			if err := a.bindBacktest(c, args, conflict.Run.ID); err != nil {
				a.failBacktest(c, claim, err.Error())
				mcpBacktestError(c, id, err)
				return
			}
			mcpBacktestOK(c, id, map[string]any{"version": 1, "accepted": true, "reason": "active", "run": conflict.Run.Brief()})
			return
		}
		a.failBacktest(c, claim, "已有其他工作区的回测任务正在运行。")
		mcpBacktestOK(c, id, map[string]any{"version": 1, "accepted": false, "reason": "busy"})
	case "list_backtests":
		list, err := a.back.Briefs(c.Request.Context(), backtest.ListReq{
			WorkspacePath: text(args["workspacePath"]),
			SessionID:     text(args["sessionId"]),
			Limit:         number(args["limit"]),
		})
		if err != nil {
			mcpBacktestError(c, id, err)
			return
		}
		mcpBacktestOK(c, id, map[string]any{
			"version":       1,
			"workspacePath": list.WorkspacePath,
			"sessionId":     list.SessionID,
			"runs":          list.Runs,
		})
	case "get_backtest":
		detail, err := a.back.Detail(c.Request.Context(), backtest.ScopedReq{
			ID:            text(args["id"]),
			WorkspacePath: text(args["workspacePath"]),
			SessionID:     text(args["sessionId"]),
		})
		if err != nil {
			mcpBacktestError(c, id, err)
			return
		}
		mcpBacktestOK(c, id, map[string]any{"version": 1, "run": detail})
	case "get_backtest_config":
		config, err := a.back.ConfigFor(c.Request.Context(), text(args["workspacePath"]), text(args["sessionId"]))
		if err != nil {
			mcpBacktestError(c, id, err)
			return
		}
		mcpBacktestOK(c, id, map[string]any{"version": 1, "config": config})
	}
}

// claimBacktest 校验请求绑定的 Workflow，并在创建回测任务前将 backtest/requested 原子推进到 dispatching。
// 没有 workflowId 的旧手工调用保持兼容；已有 dispatching 或已绑定任务的 running 调用按幂等重试处理。
func (a *API) claimBacktest(c *gin.Context, args map[string]any) (workbench.WorkflowRow, error) {
	id := text(args["workflowId"])
	if id == "" {
		return workbench.WorkflowRow{}, nil
	}
	row, err := a.bench.GetWorkflow(c.Request.Context(), workbench.WorkflowGet{
		WorkspacePath: text(args["workspacePath"]),
		SessionID:     text(args["sessionId"]),
	})
	if err != nil {
		return workbench.WorkflowRow{}, err
	}
	if row.ID != id || row.Stage != "backtest" {
		return workbench.WorkflowRow{}, errors.New("invalid automatic backtest workflow")
	}
	// dispatching 表示本次提交已经占位；running 且已有 backtestId 表示任务已经绑定，二者都可安全重试。
	if (row.State == "running" && row.BacktestID != "") || row.State == "dispatching" {
		return row, nil
	}
	// 只有尚未绑定任务的 requested 状态可以首次 claim；paused 和所有终态都在副作用前拒绝。
	if row.State != "requested" || row.BacktestID != "" {
		return workbench.WorkflowRow{}, errors.New("invalid automatic backtest workflow")
	}
	return a.bench.UpdateWorkflow(c.Request.Context(), workbench.WorkflowUpdate{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Stage:         "backtest",
		State:         "dispatching",
		Summary:       "回测任务已声明，准备提交。",
	})
}

// failBacktest 只收敛尚未绑定任务的 claim；running 阶段由回测 worker 的持久化事件负责推进。
func (a *API) failBacktest(c *gin.Context, row workbench.WorkflowRow, msg string) {
	if row.ID == "" || row.State == "running" {
		return
	}
	_, _ = a.bench.UpdateWorkflow(c.Request.Context(), workbench.WorkflowUpdate{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Stage:         "backtest",
		State:         "failed",
		Error:         msg,
	})
}

// bindBacktest 将本地回测任务 ID 绑定到已 claim 的 Workflow，并在绑定后立即对账可能已经结束的快速任务。
func (a *API) bindBacktest(c *gin.Context, args map[string]any, id string) error {
	flow := text(args["workflowId"])
	if flow == "" {
		return nil
	}
	row, err := a.bench.GetWorkflow(c.Request.Context(), workbench.WorkflowGet{
		WorkspacePath: text(args["workspacePath"]),
		SessionID:     text(args["sessionId"]),
	})
	if err != nil {
		return err
	}
	if row.ID != flow {
		return errors.New("invalid automatic backtest workflow")
	}
	// MCP 响应丢失后的相同 ID 重试直接成功，不重复推进 revision，也不重复创建任务。
	if row.Stage == "backtest" && row.State == "running" && row.BacktestID == id {
		return nil
	}
	if row.Stage != "backtest" || row.State != "dispatching" || row.BacktestID != "" {
		return errors.New("invalid automatic backtest workflow")
	}
	_, err = a.bench.UpdateWorkflow(c.Request.Context(), workbench.WorkflowUpdate{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Stage:         "backtest",
		State:         "running",
		BacktestID:    id,
		Summary:       "自动回测已启动。",
	})
	if err != nil {
		return err
	}
	detail, load := a.back.Detail(c.Request.Context(), backtest.ScopedReq{
		ID:            id,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
	})
	if load == nil && (detail.Status == "done" || detail.Status == "failed") {
		_, err = a.bench.UpdateWorkflowBacktest(c.Request.Context(), row.WorkspacePath, row.SessionID, id, detail.Status, detail.Error)
	}
	return err
}

func decodePatch(args map[string]any) (*backtest.ConfigPatch, error) {
	value, exists := args["config"]
	if !exists {
		return &backtest.ConfigPatch{}, nil
	}
	if value == nil {
		return nil, &backtest.Invalid{Code: "invalid_config", Msg: "config must not be null"}
	}
	config, ok := value.(map[string]any)
	if !ok {
		return nil, &backtest.Invalid{Code: "invalid_config", Msg: "config must be an object"}
	}
	for _, item := range config {
		if item == nil {
			return nil, &backtest.Invalid{Code: "invalid_config", Msg: "config fields must not be null"}
		}
	}
	body, err := json.Marshal(value)
	if err != nil {
		return nil, &backtest.Invalid{Code: "invalid_config", Msg: "config is invalid"}
	}
	out := &backtest.ConfigPatch{}
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	if err := dec.Decode(out); err != nil {
		return nil, &backtest.Invalid{Code: "invalid_config", Msg: "config is invalid"}
	}
	return out, nil
}

func mcpBacktestOK(c *gin.Context, id any, body map[string]any) {
	mcpToolResult(c, id, jsonText(body), body, false)
}

func mcpBacktestError(c *gin.Context, id any, err error) {
	code := "internal_error"
	msg := "backtest request failed"
	var input *backtest.Invalid
	if errors.As(err, &input) {
		code = input.Code
		if code == "" {
			code = "invalid_input"
		}
		msg = input.Error()
	} else if errors.Is(err, db.ErrNotFound) {
		code = "not_found"
		msg = "backtest resource not found"
	} else {
		slog.Warn("mcp backtest result", "id", id, "status", "error", "error", err)
	}
	body := map[string]any{
		"version": 1,
		"error": map[string]any{
			"code":    code,
			"message": msg,
		},
	}
	mcpToolResult(c, id, jsonText(body), body, true)
}
