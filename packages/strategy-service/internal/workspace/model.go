package workspace

type Local struct {
	Name     string   `json:"name"`
	Path     string   `json:"path"`
	Keywords []string `json:"keywords"`
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
}
