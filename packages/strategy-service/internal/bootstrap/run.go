package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"strategy-service/internal/logger"
)

// Run starts the strategy-service CLI process and returns an exit code.
func Run() int {
	if err := logger.Init(); err != nil {
		slog.Error("failed to init logger", "error", err)
	}
	defer logger.Shutdown()

	cfg := LoadConfig()
	slog.Info("config loaded", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled, "ipc_enabled", cfg.IPC.Enabled)

	srv, err := New(cfg)
	if err != nil {
		slog.Error("failed to create service", "error", err)
		return 1
	}

	slog.Info("strategy-service starting", "addr", cfg.Addr())

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	defer signal.Stop(stop)

	quit := make(chan struct{})
	done := make(chan struct{})
	go func() {
		<-stop
		close(quit)
		slog.Info("received interrupt, shutting down")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		close(done)
	}()

	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		select {
		case <-quit:
			<-done
		default:
		}
		slog.Info("strategy-service stopped")
		return 0
	}

	slog.Error("strategy-service exited with error", "error", err)
	return 1
}
