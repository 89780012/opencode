package tool

import "time"

const (
	StatusInstalled  = "installed"
	StatusMissing    = "missing"
	StatusInstalling = "installing"
	StatusFailed     = "failed"
)

const (
	TaskPending = "pending"
	TaskRunning = "running"
	TaskSuccess = "success"
	TaskFailed  = "failed"
)

type State struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Installed bool      `json:"installed"`
	Version   string    `json:"version,omitempty"`
	Path      string    `json:"path,omitempty"`
	Status    string    `json:"status"`
	Message   string    `json:"message,omitempty"`
	TaskID    string    `json:"task_id,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Task struct {
	ID         string     `json:"id"`
	Tool       string     `json:"tool"`
	Status     string     `json:"status"`
	Step       int        `json:"step"`
	Total      int        `json:"total"`
	Title      string     `json:"title,omitempty"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
	ExitCode   *int       `json:"exit_code,omitempty"`
	Error      string     `json:"error,omitempty"`
	Output     string     `json:"output,omitempty"`
	Log        []string   `json:"log,omitempty"`
}
