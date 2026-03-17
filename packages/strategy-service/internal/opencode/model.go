package opencode

import "time"

type Config struct {
	Enabled      bool
	Startup      string
	Bin          string
	Host         string
	Port         int
	Cwd          string
	StartTimeout time.Duration
}

type State struct {
	Enabled   bool       `json:"enabled"`
	Startup   string     `json:"startup"`
	Bin       string     `json:"bin"`
	URL       string     `json:"url"`
	Cwd       string     `json:"cwd,omitempty"`
	Status    string     `json:"status"`
	Ready     bool       `json:"ready"`
	Running   bool       `json:"running"`
	Owned     bool       `json:"owned"`
	PID       int        `json:"pid,omitempty"`
	Message   string     `json:"message,omitempty"`
	StartedAt *time.Time `json:"started_at,omitempty"`
	Log       []string   `json:"log,omitempty"`
}
