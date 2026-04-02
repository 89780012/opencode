package web

import (
	"context"
	"net/http"
	"time"

	"strategy-es/internal/es"
)

type API struct {
	es *es.Service
}

func NewAPI(es *es.Service) *API {
	return &API{es: es}
}

func (a *API) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/health", a.health)
	mux.HandleFunc("/api/docs/upsert", a.upsert)
	mux.HandleFunc("/api/search", a.search)
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		write(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := a.es.Ping(ctx); err != nil {
		write(w, http.StatusBadGateway, err.Error(), map[string]any{"status": "down"})
		return
	}

	write(w, http.StatusOK, "ok", map[string]any{"status": "ok"})
}
