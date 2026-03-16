package app

import (
	"net/http"
	"time"

	web "strategy-service/internal/http"
	"strategy-service/internal/tool"
)

func New(cfg Config) (*http.Server, error) {
	mux := http.NewServeMux()

	api := web.NewAPI(tool.NewService())
	api.Register(mux)
	mux.Handle("/", web.NewStatic(cfg.Dist))

	return &http.Server{
		Addr:              cfg.Addr(),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}, nil
}
