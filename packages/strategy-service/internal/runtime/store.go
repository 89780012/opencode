package runtime

import (
	"encoding/json"
	"os"
	"path/filepath"
)

func (s *Service) load() (map[string]Entry, error) {
	path, err := s.store()
	if err != nil {
		return nil, err
	}

	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return map[string]Entry{}, nil
	}
	if err != nil {
		return nil, err
	}

	out := map[string]Entry{}
	err = json.Unmarshal(body, &out)
	if err != nil {
		return nil, err
	}

	return out, nil
}

func (s *Service) write(all map[string]Entry) error {
	path, err := s.store()
	if err != nil {
		return err
	}

	err = os.MkdirAll(filepath.Dir(path), 0o755)
	if err != nil {
		return err
	}

	body, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')

	tmp := path + ".tmp"
	err = os.WriteFile(tmp, body, 0o644)
	if err != nil {
		return err
	}

	return os.Rename(tmp, path)
}

func (s *Service) set(id string, item Entry) error {
	all, err := s.load()
	if err != nil {
		return err
	}

	all[id] = item
	return s.write(all)
}

func (s *Service) drop(id string) error {
	all, err := s.load()
	if err != nil {
		return err
	}

	delete(all, id)
	return s.write(all)
}
