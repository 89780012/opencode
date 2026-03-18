package main

import (
	"embed"
	"io/fs"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed boot/*
var raw embed.FS

func main() {
	ui, err := fs.Sub(raw, "boot")
	if err != nil {
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
		log.Fatal(err)
	}
}
