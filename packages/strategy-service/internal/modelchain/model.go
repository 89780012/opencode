package modelchain

type Model struct {
	ProviderID string `json:"providerID"`
	ModelID    string `json:"modelID"`
}

type Config struct {
	Chain     []Model `json:"chain"`
	UpdatedAt int64   `json:"updatedAt"`
}

type Prompt struct {
	WorkspacePath string           `json:"workspacePath"`
	SessionID     string           `json:"sessionId"`
	MessageID     string           `json:"messageID,omitempty"`
	Agent         string           `json:"agent,omitempty"`
	Model         Model            `json:"model"`
	Variant       string           `json:"variant,omitempty"`
	Parts         []map[string]any `json:"parts"`
}

type event struct {
	Type       string         `json:"type"`
	Properties map[string]any `json:"properties"`
}
