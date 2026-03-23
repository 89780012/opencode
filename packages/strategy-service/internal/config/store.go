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

// Default returns the default user configuration.
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

// Root returns the strategy-service state directory.
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

// Path returns the config file path under the service state directory.
func Path() (string, error) {
	dir, err := Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// Load reads the persisted user configuration.
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

// Save persists the user configuration after normalization.
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
