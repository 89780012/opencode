package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"
)

func Run() int {
	cfg := LoadConfig()

	srv, err := New(cfg)
	if err != nil {
		slog.Error("service init failed", "err", err)
		return 1
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	defer signal.Stop(stop)

	done := make(chan struct{})
	go func() {
		<-stop
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		close(done)
	}()

	slog.Info("strategy-es starting", "addr", cfg.Addr(), "index", cfg.Index, "es", cfg.ES.Addr)

	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		select {
		case <-done:
		default:
		}
		return 0
	}

	slog.Error("strategy-es exited", "err", err)
	return 1
}
