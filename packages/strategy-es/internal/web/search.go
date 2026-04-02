package web

import (
	"net/http"
	"strings"
)

type searchReq struct {
	Title string `json:"title"`
	Size  int    `json:"size"`
}

func (a *API) search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	var req searchReq
	if err := readJSON(r, &req); err != nil {
		write(w, http.StatusBadRequest, "invalid json", nil)
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		write(w, http.StatusBadRequest, "title is required", nil)
		return
	}
	if req.Size <= 0 {
		req.Size = 5
	}
	if req.Size > 20 {
		req.Size = 20
	}

	hits, err := a.es.Search(r.Context(), req.Title, req.Size)
	if err != nil {
		write(w, http.StatusBadGateway, err.Error(), nil)
		return
	}

	write(w, http.StatusOK, "ok", map[string]any{
		"total":  len(hits),
		"title":  req.Title,
		"values": values(hits),
		"hits":   hits,
	})
}
