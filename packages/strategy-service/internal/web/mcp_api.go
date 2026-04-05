package web

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/meta"
	"strategy-service/internal/smartx"
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

func (a *API) smartxMCP(c *gin.Context) {
	if c.Request.Method == "GET" || c.Request.Method == "DELETE" {
		c.Header("Allow", "POST")
		c.JSON(405, rpcRes{
			JSONRPC: "2.0",
			Error: map[string]any{
				"code":    -32000,
				"message": "Method not allowed",
			},
		})
		return
	}
	if c.Request.Method != "POST" {
		c.JSON(405, envelope{Code: 405, Msg: "method not allowed", Data: nil})
		return
	}

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
				"version": meta.Current().Current.Version,
			},
			"instructions": "Use start to launch SmartX strategies and logs to inspect recent strategy logs.",
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
			},
		})
	case "tools/call":
		call := req.Params
		name := text(call["name"])
		args, _ := call["arguments"].(map[string]any)
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
		default:
			mcpError(c, req.ID, -32601, "Method not found")
		}
	default:
		mcpError(c, req.ID, -32601, "Method not found")
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
