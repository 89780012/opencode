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

// path 返回工作区索引文件的绝对路径。
func (s *store) path() (string, error) {
	dir, err := cfg.Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, file), nil
}

// load 读取索引文件；首次启动时会自动构建默认内容。
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

// save 原子写回工作区索引文件。
func (s *store) save(rows []Local) error {
	path, err := s.path()
	if err != nil {
		return err
	}

	body, err := json.MarshalIndent(clean(rows), "", "  ")
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	err = os.WriteFile(tmp, append(body, '\n'), 0o644)
	if err != nil {
		return err
	}

	err = os.Rename(tmp, path)
	if err == nil {
		return nil
	}

	_ = os.Remove(tmp)
	return err
}

// seed 扫描默认插件和用户工作区，生成初始索引。
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

// clean 对工作区记录做去重、规范化和排序。
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

// kind 规范化工作区类型。
func kind(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "smartx" || value == "python" || value == "js" || value == "other" {
		return value
	}
	return ""
}

// source 规范化工作区来源。
func source(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "default_plugin" || value == "user_created" || value == "imported" || value == "external" {
		return value
	}
	return ""
}

// uniq 对关键词去重并去掉空值。
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

// next 生成一条新的工作区 ID。
func next() string {
	body := make([]byte, 8)
	_, _ = rand.Read(body)
	return "ws_" + hex.EncodeToString(body)
}
