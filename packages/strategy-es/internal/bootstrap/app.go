package bootstrap

import (
	"context"
	"net/http"
	"time"

	"strategy-es/internal/es"
	"strategy-es/internal/web"
)

type Service struct {
	cfg Config
	srv *http.Server
}

func New(cfg Config) (*Service, error) {
	es, err := es.New(
		cfg.ES.Addr,
		cfg.ES.User,
		cfg.ES.Pass,
		cfg.ES.Timeout,
		cfg.ES.Insecure,
		cfg.Index,
	)
	if err != nil {
		return nil, err
	}

	mux := http.NewServeMux()
	web.NewAPI(es).Register(mux)

	return &Service{
		cfg: cfg,
		srv: &http.Server{
			Addr:              cfg.Addr(),
			Handler:           mux,
			ReadHeaderTimeout: 5 * time.Second,
		},
	}, nil
}

func (s *Service) ListenAndServe() error {
	return s.srv.ListenAndServe()
}

func (s *Service) Shutdown(ctx context.Context) error {
	return s.srv.Shutdown(ctx)
}
