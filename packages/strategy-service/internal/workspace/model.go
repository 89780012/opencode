package workspace

type Local struct {
	ID        string   `json:"id,omitempty"`
	Name      string   `json:"name"`
	Path      string   `json:"path"`
	Type      string   `json:"type,omitempty"`
	Template  string   `json:"template,omitempty"`
	EntryFile string   `json:"entry_file,omitempty"`
	Keywords  []string `json:"keywords"`
	Source    string   `json:"source,omitempty"`
	Managed   bool     `json:"managed,omitempty"`
	Missing   bool     `json:"missing,omitempty"`
	UpdatedAt int64    `json:"updated_at"`
}

type GitState struct {
	Repo        bool `json:"repo"`
	Initialized bool `json:"initialized"`
	Available   bool `json:"available"`
}

type RuntimeState struct {
	OpencodeReady bool `json:"opencode_ready"`
}

type ListResult struct {
	BasePath   string  `json:"base_path"`
	Workspaces []Local `json:"workspaces"`
}

type CreateResult struct {
	BasePath  string `json:"base_path"`
	Workspace Local  `json:"workspace"`
}

type OpenResult struct {
	BasePath  string `json:"base_path"`
	Workspace Local  `json:"workspace"`
}

type AttachResult struct {
	Workspace Local        `json:"workspace"`
	Git       GitState     `json:"git"`
	Runtime   RuntimeState `json:"runtime"`
}

type File struct {
	Path string `json:"path"`
}

type FilesResult struct {
	WorkspacePath string `json:"workspace_path"`
	Files         []File `json:"files"`
	TotalFiles    int    `json:"total_files"`
}

type FileContentResult struct {
	WorkspacePath string `json:"workspace_path"`
	Path          string `json:"path"`
	Content       string `json:"content"`
	Size          int64  `json:"size"`
	Previewable   bool   `json:"previewable"`
	Binary        bool   `json:"binary"`
	Truncated     bool   `json:"truncated"`
	Reason        string `json:"reason,omitempty"`
}
