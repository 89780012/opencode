package workspace

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"path/filepath"
	"slices"
	"strings"

	"strategy-service/internal/db"
)

type store struct{}

// load 读取索引；首次启动时会自动构建默认内容。
func (s *store) load() ([]Local, error) {
	doc, err := db.Open()
	if err != nil {
		return nil, err
	}
	rows, err := doc.Query(`select id, name, path, type, template, entry_file, keywords, source, managed, updated_at from workspaces order by name asc`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Local{}
	for rows.Next() {
		var row Local
		var keywords string
		if err := rows.Scan(&row.ID, &row.Name, &row.Path, &row.Type, &row.Template, &row.EntryFile, &keywords, &row.Source, &row.Managed, &row.UpdatedAt); err != nil {
			return nil, err
		}
		if keywords != "" {
			_ = json.Unmarshal([]byte(keywords), &row.Keywords)
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) > 0 {
		return clean(out), nil
	}
	seed, err := s.seed()
	if err != nil {
		return nil, err
	}
	return seed, s.save(seed)
}

// save 写回工作区索引。
func (s *store) save(rows []Local) error {
	doc, err := db.Open()
	if err != nil {
		return err
	}
	tx, err := doc.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec("delete from workspaces"); err != nil {
		_ = tx.Rollback()
		return err
	}
	for _, row := range clean(rows) {
		body, err := json.Marshal(uniq(row.Keywords))
		if err != nil {
			_ = tx.Rollback()
			return err
		}
		_, err = tx.Exec(`insert into workspaces(id, name, path, type, template, entry_file, keywords, source, managed, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, row.ID, row.Name, row.Path, row.Type, row.Template, row.EntryFile, string(body), row.Source, row.Managed, row.UpdatedAt)
		if err != nil {
			_ = tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

// seed 扫描默认插件和用户工作区，生成初始索引。
func (s *store) seed() ([]Local, error) {
	smartx, err := pluginDir()
	if err != nil {
		return nil, err
	}

	user, err := workspaceDir()
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
