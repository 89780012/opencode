package runtime

type Source string

const (
	SourceConfig  Source = "config"  // 显式配置
	SourceBuiltin Source = "builtin" // 内置运行时
	SourceSystem  Source = "system"  // 系统环境
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
