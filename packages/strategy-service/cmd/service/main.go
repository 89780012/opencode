package main

import (
	"os"

	"strategy-service/internal/bootstrap"
)

func main() {
	os.Exit(bootstrap.Run())
}
