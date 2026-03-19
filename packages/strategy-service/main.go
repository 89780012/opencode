package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"

	"strategy-service/internal/app"
	"strategy-service/internal/logger"
)

func main() {
	if err := logger.Init(); err != nil {
		slog.Error("failed to init logger", "error", err)
	}
	defer logger.Shutdown()

	cfg := app.LoadConfig()
	slog.Info("config loaded", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled, "ipc_enabled", cfg.IPC.Enabled)

	srv, err := app.New(cfg)
	if err != nil {
		slog.Error("failed to create service", "error", err)
		os.Exit(1)
	}

	slog.Info("strategy-service starting", "addr", cfg.Addr())

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	go func() {
		<-stop
		slog.Info("received interrupt, shutting down")
		_ = srv.Shutdown(context.Background())
	}()

	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		slog.Info("strategy-service stopped")
		return
	}

	slog.Error("strategy-service exited with error", "error", err)
	os.Exit(1)
}
