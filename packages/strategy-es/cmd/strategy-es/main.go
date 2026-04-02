package main

import (
	"os"

	"strategy-es/internal/bootstrap"
)

func main() {
	os.Exit(bootstrap.Run())
}
