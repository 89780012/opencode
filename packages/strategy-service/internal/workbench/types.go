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

type IdentifyReq struct {
	Message string `json:"message"`
}

type Hit struct {
	Source string  `json:"source_text"`
	Text   string  `json:"normalized_text"`
	Score  float64 `json:"confidence"`
}

type IdentifyRes struct {
	Title   string           `json:"title"`
	Summary string           `json:"summary"`
	Items   []string         `json:"requirement_items"`
	Dims    map[string][]Hit `json:"dimensions"`
	Model   string           `json:"model"`
}
