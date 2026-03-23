package system

import (
	"bufio"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

const (
	ServiceLog  = "service"
	OpencodeLog = "opencode"
)

type Config struct {
	Theme Theme `json:"theme"`
	Logs  Logs  `json:"logs"`
}

type Theme struct {
	Mode   string `json:"mode"`
	Accent string `json:"accent"`
}

type Logs struct {
	Tail int `json:"tail"`
}

type Store struct{}

type Log struct {
	Kind  string   `json:"kind"`
	Path  string   `json:"path"`
	Lines []string `json:"lines"`
}

func Default() Config {
	return Config{
		Theme: Theme{
			Mode:   "system",
			Accent: "ocean",
		},
		Logs: Logs{
			Tail: 200,
		},
	}
}

func Root() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".strategy-service")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}
	return dir, nil
}

func ConfigPath() (string, error) {
	dir, err := Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

func LogRoot() (string, error) {
	dir, err := Root()
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

func ServicePath() (string, error) {
	root, err := LogRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "strategy-service.log"), nil
}

func OpencodePath() (string, error) {
	root, err := LogRoot()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, "opencode-startup.log"), nil
}

func (s *Store) Load() (Config, error) {
	path, err := ConfigPath()
	if err != nil {
		return Default(), err
	}

	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return Default(), nil
	}
	if err != nil {
		return Default(), err
	}

	cfg := Default()
	err = json.Unmarshal(body, &cfg)
	if err != nil {
		return Default(), err
	}
	return clean(cfg), nil
}

func (s *Store) Save(cfg Config) (Config, error) {
	path, err := ConfigPath()
	if err != nil {
		return Default(), err
	}

	cfg = clean(cfg)
	body, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return Default(), err
	}

	err = os.WriteFile(path, append(body, '\n'), 0o644)
	if err != nil {
		return Default(), err
	}
	return cfg, nil
}

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

func Append(kind string, line string) error {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}

	path, err := logPath(kind)
	if err != nil {
		return err
	}

	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(line + "\n")
	return err
}

func clean(cfg Config) Config {
	out := Default()

	mode := strings.ToLower(strings.TrimSpace(cfg.Theme.Mode))
	if mode == "system" || mode == "light" || mode == "dark" {
		out.Theme.Mode = mode
	}

	accent := strings.ToLower(strings.TrimSpace(cfg.Theme.Accent))
	if accent == "ocean" || accent == "forest" || accent == "ember" || accent == "rose" || accent == "graphite" {
		out.Theme.Accent = accent
	}

	if cfg.Logs.Tail > 0 {
		out.Logs.Tail = clamp(cfg.Logs.Tail)
	}
	return out
}

func clamp(size int) int {
	if size <= 0 {
		return 200
	}
	if size > 1000 {
		return 1000
	}
	return size
}

func logPath(kind string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case ServiceLog:
		return ServicePath()
	case OpencodeLog:
		return OpencodePath()
	}

	return "", errors.New("invalid log kind")
}
