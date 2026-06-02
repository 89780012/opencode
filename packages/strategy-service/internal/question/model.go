package question

type Entry struct {
	ID            string `json:"id"`
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId"`
	MessageID     string `json:"messageId"`
	Body          string `json:"body"`
	CreatedAt     int64  `json:"createdAt"`
	Name          string `json:"name,omitempty"`
}

type Index struct {
	Questions []Entry `json:"questions"`
}

type List struct {
	WorkspacePath string `json:"workspacePath"`
}

type Delete struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionId"`
}

type ListResult struct {
	WorkspacePath string  `json:"workspacePath,omitempty"`
	Questions     []Entry `json:"questions"`
}
