package runtime

type Source string

const (
	SourceBuiltin Source = "builtin"
)

type Result struct {
	ID      string
	Found   bool
	Source  Source
	Path    string
	Dir     string
	Archive string
	Message string
}
