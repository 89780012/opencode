package app

import (
	"context"
	"net/http"
	"time"

	web "strategy-service/internal/http"
	"strategy-service/internal/opencode"
	"strategy-service/internal/tool"
)

func New(cfg Config) (*http.Server, error) {
	mux := http.NewServeMux()
	op := opencode.New(opencode.Config(cfg.Opencode))

	api := web.NewAPI(tool.NewService(), op)
	api.Register(mux)
	mux.Handle("/opencode/", web.NewOpencodeProxy(op))
	mux.Handle("/opencode", web.NewOpencodeProxy(op))
	mux.Handle("/", web.NewStatic(cfg.Dist))

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	srv.RegisterOnShutdown(func() {
		_ = op.Stop(context.Background())
	})

	if op.Enabled() && op.Startup() == "auto" {
		go func() {
			_ = op.Ensure(context.Background())
		}()
	}

	return srv, nil
}
