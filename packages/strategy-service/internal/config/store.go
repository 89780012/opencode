package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
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

// Default 返回默认用户配置。
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

// Root 返回 strategy-service 状态目录。
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

// Path 返回状态目录下的配置文件路径。
func Path() (string, error) {
	dir, err := Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// Load 读取持久化的用户配置。
func (s *Store) Load() (Config, error) {
	path, err := Path()
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

// Save 在规范化后保存用户配置。
func (s *Store) Save(cfg Config) (Config, error) {
	path, err := Path()
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
