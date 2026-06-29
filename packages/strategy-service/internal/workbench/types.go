package workbench

import "encoding/json"

const SessionTitle = "新建策略会话"

type SessionCreate struct {
	WorkspacePath string          `json:"workspacePath"`
	Title         string          `json:"title,omitempty"`
	Requirements  []string        `json:"requirements,omitempty"`
	Analysis      json.RawMessage `json:"analysis,omitempty"`
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
	Analysis      json.RawMessage `json:"analysis,omitempty"`
	Requirements  []string        `json:"requirements"`
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

type AnalysisReq struct {
	WorkspacePath string   `json:"workspacePath"`
	WorktreePath  string   `json:"worktreePath"`
	State         string   `json:"state,omitempty"`
	Items         []string `json:"items"`
	Text          string   `json:"text"`
}

type RefreshReq struct {
	WorkspacePath string `json:"workspacePath"`
	WorktreePath  string `json:"worktreePath"`
	Reason        string `json:"reason,omitempty"`
}

type RefreshRow struct {
	WorkspacePath string       `json:"workspacePath"`
	WorktreePath  string       `json:"worktreePath"`
	Reason        string       `json:"reason,omitempty"`
	Analysis      AnalysisRow  `json:"analysis"`
	Flowchart     FlowchartRow `json:"flowchart"`
	UpdatedAt     int64        `json:"updatedAt"`
}

type RequirementsGet struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	SessionID     string `form:"sessionId" json:"sessionId"`
}

type RequirementsRow struct {
	WorkspacePath string   `json:"workspacePath"`
	SessionID     string   `json:"sessionId"`
	Requirements  []string `json:"requirements"`
}

type AnalysisGet struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	WorktreePath  string `form:"worktreePath" json:"worktreePath"`
}

type AnalysisRow struct {
	WorkspacePath string   `json:"workspacePath"`
	WorktreePath  string   `json:"worktreePath"`
	State         string   `json:"state"`
	Items         []string `json:"items"`
	Text          string   `json:"text"`
	UpdatedAt     int64    `json:"updatedAt"`
}

type FlowchartReq struct {
	WorkspacePath string `json:"workspacePath"`
	WorktreePath  string `json:"worktreePath"`
	State         string `json:"state,omitempty"`
	Code          string `json:"code"`
	Err           string `json:"err,omitempty"`
	AnalysisHash  string `json:"analysisHash,omitempty"`
	Manual        bool   `json:"manual,omitempty"`
	Source        string `json:"source,omitempty"`
}

type FlowchartGet struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	WorktreePath  string `form:"worktreePath" json:"worktreePath"`
}

type FlowchartRow struct {
	WorkspacePath string `json:"workspacePath"`
	WorktreePath  string `json:"worktreePath"`
	State         string `json:"state"`
	Code          string `json:"code"`
	Err           string `json:"err,omitempty"`
	AnalysisHash  string `json:"analysisHash,omitempty"`
	Manual        bool   `json:"manual"`
	Source        string `json:"source"`
	UpdatedAt     int64  `json:"updatedAt"`
}

type ReviewItem struct {
	Name       string `json:"name"`
	Status     string `json:"status"`
	Detail     string `json:"detail"`
	Suggestion string `json:"suggestion,omitempty"`
}

type ReviewReq struct {
	WorkspacePath string       `json:"workspacePath"`
	WorktreePath  string       `json:"worktreePath"`
	State         string       `json:"state,omitempty"`
	Summary       string       `json:"summary"`
	Items         []ReviewItem `json:"items"`
	Suggestions   []string     `json:"suggestions"`
}

type ReviewGet struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	WorktreePath  string `form:"worktreePath" json:"worktreePath"`
}

type ReviewRow struct {
	ID            string       `json:"id"`
	WorkspacePath string       `json:"workspacePath"`
	WorktreePath  string       `json:"worktreePath"`
	State         string       `json:"state"`
	Summary       string       `json:"summary"`
	Items         []ReviewItem `json:"items"`
	Suggestions   []string     `json:"suggestions"`
	UpdatedAt     int64        `json:"updatedAt"`
}

type ProjectTask struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Status       string   `json:"status"`
	Priority     string   `json:"priority"`
	Dependencies []string `json:"dependencies"`
	Notes        string   `json:"notes,omitempty"`
}

type ProjectStateGet struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	WorktreePath  string `form:"worktreePath" json:"worktreePath"`
}

type ProjectStateInitReq struct {
	WorkspacePath string        `json:"workspacePath"`
	WorktreePath  string        `json:"worktreePath"`
	SessionID     string        `json:"sessionId,omitempty"`
	Project       string        `json:"project,omitempty"`
	Phase         string        `json:"phase,omitempty"`
	Status        string        `json:"status,omitempty"`
	Current       string        `json:"current,omitempty"`
	Summary       string        `json:"summary,omitempty"`
	Next          []string      `json:"next,omitempty"`
	Risks         []string      `json:"risks,omitempty"`
	Verified      *bool         `json:"verified,omitempty"`
	Dirty         *bool         `json:"dirty,omitempty"`
	Features      []ProjectTask `json:"features,omitempty"`
}

type ProjectStateSaveReq struct {
	WorkspacePath string        `json:"workspacePath"`
	WorktreePath  string        `json:"worktreePath"`
	SessionID     string        `json:"sessionId,omitempty"`
	Phase         string        `json:"phase,omitempty"`
	Status        string        `json:"status,omitempty"`
	Current       string        `json:"current,omitempty"`
	Summary       string        `json:"summary,omitempty"`
	Next          []string      `json:"next,omitempty"`
	Risks         []string      `json:"risks,omitempty"`
	Verified      *bool         `json:"verified,omitempty"`
	Dirty         *bool         `json:"dirty,omitempty"`
	Features      []ProjectTask `json:"features,omitempty"`
}

type ProjectStateRow struct {
	WorkspacePath string        `json:"workspacePath"`
	WorktreePath  string        `json:"worktreePath"`
	Exists        bool          `json:"exists"`
	Project       string        `json:"project"`
	Phase         string        `json:"phase"`
	Status        string        `json:"status"`
	Current       string        `json:"current"`
	Summary       string        `json:"summary"`
	Next          []string      `json:"next"`
	Risks         []string      `json:"risks"`
	Verified      bool          `json:"verified"`
	Dirty         bool          `json:"dirty"`
	SessionID     string        `json:"sessionId,omitempty"`
	Features      []ProjectTask `json:"features"`
	UpdatedAt     int64         `json:"updatedAt"`
}

type ProgressAppend struct {
	WorkspacePath string          `json:"workspacePath"`
	SessionID     string          `json:"sessionId"`
	Kind          string          `json:"kind"`
	State         string          `json:"state"`
	Title         string          `json:"title"`
	Detail        string          `json:"detail"`
	Source        string          `json:"source"`
	Payload       json.RawMessage `json:"payload,omitempty"`
}

type ProgressEvent struct {
	ID            string          `json:"id"`
	WorkspacePath string          `json:"workspacePath"`
	SessionID     string          `json:"sessionId"`
	Kind          string          `json:"kind"`
	State         string          `json:"state"`
	Title         string          `json:"title"`
	Detail        string          `json:"detail"`
	Source        string          `json:"source"`
	Payload       json.RawMessage `json:"payload,omitempty"`
	CreatedAt     int64           `json:"createdAt"`
}

type ProgressList struct {
	WorkspacePath string          `json:"workspacePath"`
	SessionID     string          `json:"sessionId"`
	Events        []ProgressEvent `json:"events"`
}
