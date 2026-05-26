package modelchain

import (
	"encoding/json"
	"os"
	"path/filepath"

	cfg "strategy-service/internal/config"
)

const file = "model-chain.json"

type store struct{}

func (s *store) path() (string, error) {
	dir, err := cfg.ServerRootDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, file), nil
}

func (s *store) load() (Config, error) {
	path, err := s.path()
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
	var cfg Config
	err = json.Unmarshal(body, &cfg)
	if err != nil {
		return Default(), nil
	}
	return clean(cfg), nil
}

func (s *store) save(cfg Config) (Config, error) {
	path, err := s.path()
	if err != nil {
		return Default(), err
	}
	cfg = clean(cfg)
	body, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return Default(), err
	}
	tmp := path + ".tmp"
	err = os.WriteFile(tmp, append(body, '\n'), 0o644)
	if err != nil {
		return Default(), err
	}
	err = os.Rename(tmp, path)
	if err == nil {
		return cfg, nil
	}
	_ = os.Remove(path)
	err = os.Rename(tmp, path)
	if err != nil {
		_ = os.Remove(tmp)
		return Default(), err
	}
	return cfg, nil
}
