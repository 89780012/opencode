package runtime

type Source string

const (
	SourceConfig  Source = "config"
	SourceBuiltin Source = "builtin"
	SourceSystem  Source = "system"
)

type Config struct {
	Root string
	Over map[string]string
}

type Result struct {
	ID      string
	Found   bool
	Source  Source
	Path    string
	Dir     string
	Archive string
	Message string
}

type Entry struct {
	Source string `json:"source"`
	Path   string `json:"path"`
}
