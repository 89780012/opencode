package question

import (
	"encoding/json"
	"os"
	"path/filepath"

	cfg "strategy-service/internal/config"
)

const file = "questions.json"

type store struct{}

func (s *store) path() (string, error) {
	dir, err := cfg.ServerRootDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, file), nil
}

func (s *store) load() (Index, error) {
	path, err := s.path()
	if err != nil {
		return Index{}, err
	}
	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return Index{}, nil
	}
	if err != nil {
		return Index{}, err
	}
	var idx Index
	err = json.Unmarshal(body, &idx)
	if err != nil {
		return Index{}, nil
	}
	return idx, nil
}

func (s *store) save(idx Index) error {
	path, err := s.path()
	if err != nil {
		return err
	}
	body, err := json.MarshalIndent(idx, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	err = os.WriteFile(tmp, append(body, '\n'), 0o644)
	if err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
