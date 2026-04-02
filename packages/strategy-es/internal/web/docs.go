package web

import (
	"net/http"
	"strings"

	"strategy-es/internal/es"
)

type upsertReq struct {
	Title string `json:"title"`
	Value string `json:"value"`
}

func (a *API) upsert(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	var req upsertReq
	if err := readJSON(r, &req); err != nil {
		write(w, http.StatusBadRequest, "invalid json", nil)
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Value = strings.TrimSpace(req.Value)
	if req.Title == "" || req.Value == "" {
		write(w, http.StatusBadRequest, "title and value are required", nil)
		return
	}

	if err := a.es.Upsert(r.Context(), es.Doc{
		Title: req.Title,
		Value: req.Value,
	}); err != nil {
		write(w, http.StatusBadGateway, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", map[string]any{
		"title": req.Title,
	})
}
