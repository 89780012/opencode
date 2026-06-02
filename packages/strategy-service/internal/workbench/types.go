package workbench

import "encoding/json"

const SessionTitle = "新建策略会话"

type SessionCreate struct {
	WorkspacePath string `json:"workspacePath"`
	Title         string `json:"title,omitempty"`
}

type SessionCreated struct {
	WorkspacePath string          `json:"workspacePath"`
	Session       json.RawMessage `json:"session"`
}

type SessionRow struct {
	ID            string          `json:"id"`
	WorkspacePath string          `json:"workspacePath"`
	Title         string          `json:"title"`
	Session       json.RawMessage `json:"session"`
	CreatedAt     int64           `json:"createdAt"`
	UpdatedAt     int64           `json:"updatedAt"`
}

type SessionUpdate struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Title string `json:"title"`
}

type SessionDelete struct {
	ID string `json:"id"`
}

type SessionList struct {
	WorkspacePath string `json:"workspacePath"`
}

type SessionDetail struct {
	ID string `json:"id"`
}

type SessionListResult struct {
	WorkspacePath string       `json:"workspacePath,omitempty"`
	Sessions      []SessionRow `json:"sessions"`
}

type SessionResult struct {
	Session SessionRow `json:"session"`
}
