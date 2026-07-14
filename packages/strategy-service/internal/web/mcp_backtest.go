package web

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"

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
		row, reason, err := a.back.RunPatch(c.Request.Context(), req)
		if err == nil {
			mcpBacktestOK(c, id, map[string]any{"version": 1, "accepted": true, "reason": reason, "run": row.Brief()})
			return
		}
		var conflict *backtest.Conflict
		if !errors.As(err, &conflict) {
			mcpBacktestError(c, id, err)
			return
		}
		if conflict.Run.WorkspacePath == req.WorkspacePath && conflict.Run.SessionID == req.SessionID {
			mcpBacktestOK(c, id, map[string]any{"version": 1, "accepted": true, "reason": "active", "run": conflict.Run.Brief()})
			return
		}
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
