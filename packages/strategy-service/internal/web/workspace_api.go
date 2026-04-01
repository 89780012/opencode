package web

import (
	"log/slog"
	"net/http"

	"strategy-service/internal/workspace"
)

func (a *API) workspaceList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	slog.Debug("workspace list request")
	data, err := a.ws.List()
	if err != nil {
		slog.Error("workspace list failed", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspaces = workspace.Enrich(r.Context(), data.Workspaces, a.op)
	slog.Info("workspace list", "count", len(data.Workspaces))
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Name string `json:"name"`
		Git  bool   `json:"git"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("workspace create bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("workspace create", "name", body.Name)
	data, err := a.ws.Create(body.Name, body.Git)
	if err != nil {
		slog.Error("workspace create failed", "name", body.Name, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspace = workspace.Enrich(r.Context(), []workspace.Local{data.Workspace}, a.op)[0]
	slog.Info("workspace created", "name", body.Name, "path", data.Workspace.Path)
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceOpen(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Path string `json:"path"`
		Git  bool   `json:"git"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("workspace open bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("workspace open", "path", body.Path)
	data, err := a.ws.Open(body.Path, body.Git)
	if err != nil {
		slog.Error("workspace open failed", "path", body.Path, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data.Workspace = workspace.Enrich(r.Context(), []workspace.Local{data.Workspace}, a.op)[0]
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Path string `json:"path"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("workspace delete bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("workspace delete", "path", body.Path)
	err = a.ws.Delete(body.Path)
	if err != nil {
		slog.Error("workspace delete failed", "path", body.Path, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	err = a.gs.Prune(body.Path)
	if err != nil {
		slog.Error("workspace delete prune failed", "path", body.Path, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", nil)
}

func (a *API) workspaceFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	wsPath := r.URL.Query().Get("workspace_path")
	slog.Debug("workspace files request", "workspace_path", wsPath)
	data, err := a.ws.Files(wsPath)
	if err != nil {
		slog.Error("workspace files failed", "workspace_path", wsPath, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Debug("workspace files", "workspace_path", wsPath, "total", data.TotalFiles)
	write(w, http.StatusOK, "ok", data)
}

func (a *API) workspaceFileContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	wsPath := r.URL.Query().Get("workspace_path")
	filePath := r.URL.Query().Get("file_path")
	slog.Debug("workspace file-content request", "workspace_path", wsPath, "file_path", filePath)
	data, err := a.ws.Content(wsPath, filePath)
	if err != nil {
		slog.Error("workspace file-content failed", "workspace_path", wsPath, "file_path", filePath, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Debug("workspace file-content", "file_path", filePath, "size", data.Size, "binary", data.Binary)
	write(w, http.StatusOK, "ok", data)
}
