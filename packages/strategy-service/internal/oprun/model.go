package oprun

import "time"

type Config struct {
	Enabled      bool
	Bin          string
	GitBin       string
	PythonLayout string
	Host         string
	Port         int
	Cwd          string
	StartTimeout time.Duration
	ServiceURL   string
}

type State struct {
	Enabled   bool       `json:"enabled"`
	Bin       string     `json:"bin"`
	URL       string     `json:"url"`
	Cwd       string     `json:"cwd,omitempty"`
	Status    string     `json:"status"`
	Ready     bool       `json:"ready"`
	Running   bool       `json:"running"`
	Message   string     `json:"message,omitempty"`
	StartedAt *time.Time `json:"started_at,omitempty"`
}
