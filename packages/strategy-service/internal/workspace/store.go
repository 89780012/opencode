package workspace

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"

	cfg "strategy-service/internal/config"
)

const file = "strategies.json"

type store struct{}

func (s *store) path() (string, error) {
	dir, err := cfg.Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, file), nil
}

func (s *store) load() ([]Local, error) {
	path, err := s.path()
	if err != nil {
		return nil, err
	}

	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		rows, err := s.seed()
		if err != nil {
			return nil, err
		}
		return rows, s.save(rows)
	}
	if err != nil {
		return nil, err
	}

	rows := []Local{}
	err = json.Unmarshal(body, &rows)
	if err != nil {
		return nil, err
	}
	return clean(rows), nil
}

func (s *store) save(rows []Local) error {
	path, err := s.path()
	if err != nil {
		return err
	}

	body, err := json.MarshalIndent(clean(rows), "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(body, '\n'), 0o644)
}

func (s *store) seed() ([]Local, error) {
	smartx, err := base()
	if err != nil {
		return nil, err
	}

	user, err := root()
	if err != nil {
		return nil, err
	}

	a, err := listDirs(smartx)
	if err != nil {
		return nil, err
	}
	b, err := listDirs(user)
	if err != nil {
		return nil, err
	}

	rows := make([]Local, 0, len(a)+len(b))
	for _, item := range a {
		item.ID = next()
		item.Source = "default_plugin"
		item.Managed = true
		rows = append(rows, item)
	}
	for _, item := range b {
		item.ID = next()
		item.Source = "user_created"
		item.Managed = true
		rows = append(rows, item)
	}
	return clean(rows), nil
}

func clean(rows []Local) []Local {
	out := make([]Local, 0, len(rows))
	seen := map[string]bool{}

	for _, item := range rows {
		key := filepath.Clean(strings.TrimSpace(item.Path))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true

		item.ID = strings.TrimSpace(item.ID)
		if item.ID == "" {
			item.ID = next()
		}
		item.Name = strings.TrimSpace(item.Name)
		if item.Name == "" {
			item.Name = filepath.Base(key)
		}
		item.Path = key
		item.Type = kind(item.Type)
		item.Template = strings.TrimSpace(item.Template)
		item.EntryFile = strings.TrimSpace(item.EntryFile)
		item.Keywords = uniq(item.Keywords)
		item.Source = source(item.Source)
		item.Missing = false
		out = append(out, item)
	}

	slices.SortFunc(out, func(a Local, b Local) int {
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})
	return out
}

func kind(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "smartx" || value == "python" || value == "js" || value == "other" {
		return value
	}
	return ""
}

func source(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "default_plugin" || value == "user_created" || value == "imported" {
		return value
	}
	return ""
}

func uniq(list []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range list {
		text := strings.TrimSpace(item)
		if text == "" || seen[text] {
			continue
		}
		seen[text] = true
		out = append(out, text)
	}
	return out
}

func next() string {
	body := make([]byte, 8)
	_, _ = rand.Read(body)
	return "ws_" + hex.EncodeToString(body)
}
