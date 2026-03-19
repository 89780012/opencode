package main

import (
	"embed"
	"io/fs"
	"log"
	"log/slog"

	"strategy-service/internal/logger"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed boot/*
var raw embed.FS

func main() {
	if err := logger.Init(); err != nil {
		log.Fatal(err)
	}
	defer logger.Shutdown()

	slog.Info("desktop app starting")

	ui, err := fs.Sub(raw, "boot")
	if err != nil {
		slog.Error("failed to load boot assets", "error", err)
		log.Fatal(err)
	}

	app := newshell()
	err = wails.Run(&options.App{
		Title:       "Strategy Service",
		Width:       1440,
		Height:      900,
		MinWidth:    1080,
		MinHeight:   720,
		AssetServer: &assetserver.Options{Assets: ui},
		OnStartup:   app.startup,
		OnDomReady:  app.ready,
		OnShutdown:  app.shutdown,
	})
	if err != nil {
		slog.Error("wails app exited with error", "error", err)
		log.Fatal(err)
	}
	slog.Info("desktop app stopped")
}
