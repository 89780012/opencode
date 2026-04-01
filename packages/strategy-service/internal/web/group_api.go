package web

import (
	"log/slog"
	"net/http"

	"strategy-service/internal/workspace"
)

func (a *API) groupList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	data, err := a.gs.List()
	if err != nil {
		slog.Error("group list failed", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	for i := range data.Groups {
		rows := make([]workspace.Local, 0, len(data.Groups[i].Items))
		for _, item := range data.Groups[i].Items {
			rows = append(rows, item.Workspace)
		}
		rows = workspace.Enrich(r.Context(), rows, a.op)
		for j := range data.Groups[i].Items {
			data.Groups[i].Items[j].Workspace = rows[j]
		}
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) groupDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	id := r.URL.Query().Get("id")
	data, err := a.gs.Detail(id)
	if err != nil {
		slog.Error("group detail failed", "id", id, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	rows := make([]workspace.Local, 0, len(data.Group.Items))
	for _, item := range data.Group.Items {
		rows = append(rows, item.Workspace)
	}
	rows = workspace.Enrich(r.Context(), rows, a.op)
	for i := range data.Group.Items {
		data.Group.Items[i].Workspace = rows[i]
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) groupCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		Name  string   `json:"name"`
		Count int      `json:"count"`
		Git   bool     `json:"git"`
		Paths []string `json:"paths"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("group create bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	data, err := a.gs.Create(body.Name, body.Count, body.Git, body.Paths)
	if err != nil {
		slog.Error("group create failed", "name", body.Name, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	rows := make([]workspace.Local, 0, len(data.Group.Items))
	for _, item := range data.Group.Items {
		rows = append(rows, item.Workspace)
	}
	rows = workspace.Enrich(r.Context(), rows, a.op)
	for i := range data.Group.Items {
		data.Group.Items[i].Workspace = rows[i]
	}

	write(w, http.StatusOK, "ok", data)
}

func (a *API) groupDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	body := struct {
		ID string `json:"id"`
	}{}
	err := readJSON(r, &body)
	if err != nil {
		slog.Warn("group delete bad request", "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	slog.Info("group delete", "id", body.ID)
	err = a.gs.Delete(body.ID)
	if err != nil {
		slog.Error("group delete failed", "id", body.ID, "error", err)
		write(w, http.StatusBadRequest, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", nil)
}
