package summary

type State string

const (
	StateEmpty   State = "empty"
	StateRunning State = "running"
	StateReady   State = "ready"
	StateError   State = "error"
)

type Entry struct {
	WorkspacePath    string `json:"workspacePath"`
	SessionID        string `json:"sessionId"`
	SummarySessionID string `json:"summarySessionId,omitempty"`
	State            State  `json:"state"`
	Text             string `json:"text,omitempty"`
	UpdatedAt        int64  `json:"updatedAt"`
	Err              string `json:"err,omitempty"`
	LastText         string `json:"lastText,omitempty"`
	LastUpdatedAt    int64  `json:"lastUpdatedAt,omitempty"`
}

type Index struct {
	Summaries []Entry `json:"summaries"`
}

type Request struct {
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId"`
}
