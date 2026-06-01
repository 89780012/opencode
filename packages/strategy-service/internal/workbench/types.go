package workbench

import "encoding/json"

type SessionCreate struct {
	WorkspacePath string `json:"workspacePath"`
	Title         string `json:"title,omitempty"`
}

type SessionCreated struct {
	WorkspacePath string          `json:"workspacePath"`
	Session       json.RawMessage `json:"session"`
}
