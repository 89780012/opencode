package logs

import (
	"bufio"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"strategy-service/internal/config"

	"gopkg.in/natefinch/lumberjack.v2"
)

const (
	ServiceKind  = "service"
	OpencodeKind = "opencode"
)

var (
	mu  sync.Mutex
	out = map[string]*lumberjack.Logger{}
)

type Log struct {
	Kind  string   `json:"kind"`
	Path  string   `json:"path"`
	Lines []string `json:"lines"`
}

// 策略服务日志路径
func ServicePath() (string, error) {
	root, err := root()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "service.log"), nil
}

// Opencode日志路径
func OpencodePath() (string, error) {
	root, err := root()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "opencode.log"), nil
}

// 模拟tail 获取日志输出
func Tail(kind string, size int) (Log, error) {
	path, err := logPath(kind)
	if err != nil {
		return Log{}, err
	}

	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return Log{
			Kind:  kind,
			Path:  path,
			Lines: []string{},
		}, nil
	}
	if err != nil {
		return Log{}, err
	}
	defer file.Close()

	size = clamp(size)
	lines := []string{}
	scan := bufio.NewScanner(file)
	buf := make([]byte, 0, 64*1024)
	scan.Buffer(buf, 1024*1024)
	for scan.Scan() {
		line := strings.TrimRight(scan.Text(), "\r")
		lines = append(lines, line)
		if len(lines) > size {
			lines = append([]string{}, lines[len(lines)-size:]...)
		}
	}
	if err := scan.Err(); err != nil {
		return Log{}, err
	}

	return Log{
		Kind:  kind,
		Path:  path,
		Lines: lines,
	}, nil
}

// 追加日志
func Append(kind string, line string) error {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}

	path, err := logPath(kind)
	if err != nil {
		return err
	}
	return appendLine(kind, path, line+"\n")
}

// 返回日志路径
func root() (string, error) {
	dir, err := config.ServerRootDir()
	if err != nil {
		return "", err
	}

	root := filepath.Join(dir, "logs")
	err = os.MkdirAll(root, 0o755)
	if err != nil {
		return "", err
	}
	return root, nil
}

// 截取日志大小
func clamp(size int) int {
	if size <= 0 {
		return 200
	}
	if size > 1000 {
		return 1000
	}
	return size
}

// 获取对应类型日志路径
func logPath(kind string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case ServiceKind:
		return ServicePath()
	case OpencodeKind:
		return OpencodePath()
	}

	return "", errors.New("invalid log kind")
}

func appendLine(kind string, path string, line string) error {
	mu.Lock()
	row := out[kind]
	if row == nil || row.Filename != path {
		row = &lumberjack.Logger{
			Filename:  path,
			MaxSize:   50,
			MaxAge:    30,
			Compress:  true,
			LocalTime: true,
		}
		out[kind] = row
	}
	mu.Unlock()

	_, err := row.Write([]byte(line))
	return err
}
