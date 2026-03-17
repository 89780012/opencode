package web

import "embed"

//go:embed dist/**
var asset embed.FS
