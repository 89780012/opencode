package main

import (
	"log"
	"net/http"

	"strategy-service/internal/app"
)

func main() {
	cfg := app.LoadConfig()
	srv, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("strategy-service listening on http://%s", cfg.Addr())

	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		return
	}

	log.Fatal(err)
}
