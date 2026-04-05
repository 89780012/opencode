package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

func (a *API) workspaceList(c *gin.Context) {
	slog.Debug("workspace list request")
	data, err := a.ws.List()
	if err != nil {
		slog.Error("workspace list failed", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace list", "count", len(data.Workspaces))
	ok(c, data)
}

func (a *API) workspaceCreate(c *gin.Context) {
	body := struct {
		Name     string `json:"name"`
		Type     string `json:"type"`
		Template string `json:"template"`
		Git      bool   `json:"git"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		slog.Warn("workspace create bad request", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace create", "name", body.Name, "type", body.Type, "template", body.Template)
	data, err := a.ws.Create(body.Name, body.Type, body.Template, body.Git)
	if err != nil {
		slog.Error("workspace create failed", "name", body.Name, "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace created", "name", body.Name, "path", data.Workspace.Path)
	ok(c, data)
}

func (a *API) workspaceOpen(c *gin.Context) {
	body := struct {
		Path string `json:"path"`
		Git  bool   `json:"git"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		slog.Warn("workspace open bad request", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace open", "path", body.Path)
	data, err := a.ws.Open(body.Path, body.Git)
	if err != nil {
		slog.Error("workspace open failed", "path", body.Path, "error", err)
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workspaceImport(c *gin.Context) {
	body := struct {
		Path string `json:"path"`
		Type string `json:"type"`
		Git  bool   `json:"git"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		slog.Warn("workspace import bad request", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace import", "path", body.Path, "type", body.Type)
	data, err := a.ws.Import(body.Path, body.Type, body.Git)
	if err != nil {
		slog.Error("workspace import failed", "path", body.Path, "error", err)
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workspaceDelete(c *gin.Context) {
	body := struct {
		Path string `json:"path"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		slog.Warn("workspace delete bad request", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace delete", "path", body.Path)
	if err := a.ws.Delete(body.Path); err != nil {
		slog.Error("workspace delete failed", "path", body.Path, "error", err)
		bad(c, err)
		return
	}

	ok(c, nil)
}

func (a *API) workspaceFiles(c *gin.Context) {
	wsPath := c.Query("workspace_path")
	slog.Debug("workspace files request", "workspace_path", wsPath)
	data, err := a.ws.Files(wsPath)
	if err != nil {
		slog.Error("workspace files failed", "workspace_path", wsPath, "error", err)
		bad(c, err)
		return
	}

	slog.Debug("workspace files", "workspace_path", wsPath, "total", data.TotalFiles)
	ok(c, data)
}

func (a *API) workspaceFileGet(c *gin.Context) {
	wsPath := c.Query("workspace_path")
	filePath := c.Query("file_path")
	slog.Debug("workspace file-content request", "workspace_path", wsPath, "file_path", filePath)
	data, err := a.ws.Content(wsPath, filePath)
	if err != nil {
		slog.Error("workspace file-content failed", "workspace_path", wsPath, "file_path", filePath, "error", err)
		bad(c, err)
		return
	}

	slog.Debug("workspace file-content", "file_path", filePath, "size", data.Size, "binary", data.Binary)
	ok(c, data)
}

func (a *API) workspaceFilePut(c *gin.Context) {
	body := struct {
		WorkspacePath string `json:"workspace_path"`
		FilePath      string `json:"file_path"`
		Content       string `json:"content"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		slog.Warn("workspace file-content bad request", "error", err)
		bad(c, err)
		return
	}

	slog.Info("workspace file save", "workspace_path", body.WorkspacePath, "file_path", body.FilePath)
	data, err := a.ws.Write(body.WorkspacePath, body.FilePath, body.Content)
	if err != nil {
		slog.Error("workspace file save failed", "workspace_path", body.WorkspacePath, "file_path", body.FilePath, "error", err)
		bad(c, err)
		return
	}

	ok(c, data)
}
