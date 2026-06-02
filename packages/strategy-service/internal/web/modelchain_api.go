package web

import (
	"fmt"
	"log/slog"
	"strings"

	"strategy-service/internal/modelchain"
	"strategy-service/internal/question"
	"strategy-service/internal/utils"

	"github.com/gin-gonic/gin"
)

func (a *API) modelChainGet(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	cfg, err := a.chain.Get()
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) modelChainPut(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	var cfg modelchain.Config
	if err := c.ShouldBindJSON(&cfg); err != nil {
		bad(c, err)
		return
	}
	out, err := a.chain.Save(cfg)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, out)
}

func (a *API) modelChainPrompt(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	var req modelchain.Prompt
	req.Agent = "smartx-helper"

	if err := c.ShouldBindJSON(&req); err != nil {
		bad(c, err)
		return
	}
	if err := a.chain.Prompt(c.Request.Context(), req); err != nil {
		bad(c, err)
		return
	}
	a.recordQuestion(req)
	ok(c, true)
}

func (a *API) recordQuestion(req modelchain.Prompt) {
	if a == nil || a.question == nil {
		return
	}
	msg := body(req.Parts)
	if msg == "" {
		return
	}
	row, err := a.question.Append(question.Entry{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		MessageID:     req.MessageID,
		Body:          msg,
	})
	if err != nil {
		slog.Warn("question append failed", "workspace_path", req.WorkspacePath, "session_id", req.SessionID, "error", err)
		return
	}
	a.event.emitBroadcast("question.appended", utils.Pack(row))
}

func body(parts []map[string]any) string {
	for _, part := range parts {
		if fmt.Sprint(part["type"]) != "text" {
			continue
		}
		msg, ok := part["text"].(string)
		if ok {
			return strings.TrimSpace(msg)
		}
	}
	return ""
}
