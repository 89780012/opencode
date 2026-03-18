package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"

	"strategy-service/internal/app"
)

func main() {
	cfg := app.LoadConfig()
	srv, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("strategy-service listening on http://%s", cfg.Addr())

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	go func() {
		<-stop
		_ = srv.Shutdown(context.Background())
	}()

	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		return
	}

	log.Fatal(err)
}
