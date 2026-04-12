package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

func (a *API) workspaceChatState(c *gin.Context) {
	path := c.Query("workspace_path")
	data, err := a.wf.WorkspaceState(path)
	if err != nil {
		slog.Error("workspace chat state failed", "workspace_path", path, "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workspaceChatBind(c *gin.Context) {
	body := struct {
		WorkspacePath          string `json:"workspace_path"`
		WorkflowID             string `json:"workflow_id"`
		DefaultModelProviderID string `json:"default_model_provider_id"`
		DefaultModelID         string `json:"default_model_id"`
		DefaultVariant         string `json:"default_variant"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.wf.BindWorkspace(
		body.WorkspacePath,
		body.WorkflowID,
		body.DefaultModelProviderID,
		body.DefaultModelID,
		body.DefaultVariant,
	)
	if err != nil {
		slog.Error("workspace chat bind failed", "workspace_path", body.WorkspacePath, "workflow_id", body.WorkflowID, "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workspaceChatDispatch(c *gin.Context) {
	body := struct {
		WorkspacePath string `json:"workspace_path"`
		Input         string `json:"input"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.wf.DispatchWorkspace(body.WorkspacePath, body.Input)
	if err != nil {
		slog.Error("workspace chat dispatch failed", "workspace_path", body.WorkspacePath, "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workspaceChatInterrupt(c *gin.Context) {
	body := struct {
		WorkspacePath string `json:"workspace_path"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.wf.InterruptWorkspace(body.WorkspacePath)
	if err != nil {
		slog.Error("workspace chat interrupt failed", "workspace_path", body.WorkspacePath, "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}
