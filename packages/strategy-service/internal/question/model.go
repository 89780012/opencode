package question

type Entry struct {
	ID            string `json:"id"`
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId"`
	MessageID     string `json:"messageId"`
	Text          string `json:"text"`
	CreatedAt     int64  `json:"createdAt"`
}

type Index struct {
	Questions []Entry `json:"questions"`
}
