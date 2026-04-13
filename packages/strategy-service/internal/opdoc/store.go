package opdoc

import (
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// list 扫描目录并解析文档列表。
func list[T any](
	root func() (string, error),
	pick func(string, os.DirEntry) (string, bool),
	parse func(string, []byte, time.Time) (T, error),
	less func(T, T) bool,
) (string, []T, error) {
	dir, err := root()
	if err != nil {
		return "", nil, err
	}

	items, err := os.ReadDir(dir)
	if err != nil {
		return "", nil, err
	}

	out := []T{}
	for _, item := range items {
		path, ok := pick(dir, item)
		if !ok {
			continue
		}

		body, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return "", nil, err
		}

		info, err := os.Stat(path)
		if err != nil {
			return "", nil, err
		}

		doc, err := parse(path, body, info.ModTime())
		if err != nil {
			return "", nil, err
		}
		out = append(out, doc)
	}

	sort.Slice(out, func(i int, j int) bool {
		return less(out[i], out[j])
	})
	return dir, out, nil
}

// create 创建新文档，若已存在则返回 os.ErrExist。
func create[T any](path func(string) (string, error), write func(string, string) (T, error), name string, body string) (T, error) {
	file, err := path(name)
	if err != nil {
		var zero T
		return zero, err
	}

	_, err = os.Stat(file)
	if err == nil {
		var zero T
		return zero, os.ErrExist
	}
	if !os.IsNotExist(err) {
		var zero T
		return zero, err
	}

	return write(file, body)
}

// update 覆盖现有文档，若不存在则直接报错。
func update[T any](path func(string) (string, error), write func(string, string) (T, error), name string, body string) (T, error) {
	file, err := path(name)
	if err != nil {
		var zero T
		return zero, err
	}

	if _, err := os.Stat(file); err != nil {
		var zero T
		return zero, err
	}

	return write(file, body)
}

// remove 删除现有文档或目录。
func remove(path func(string) (string, error), drop func(string) error, name string) error {
	file, err := path(name)
	if err != nil {
		return err
	}

	if _, err := os.Stat(file); err != nil {
		return err
	}

	return drop(file)
}

// body 统一规范换行、裁掉首尾空白并解析 frontmatter。
func body(input string, kind string) (string, map[string]string, error) {
	text := strings.TrimSpace(strings.ReplaceAll(input, "\r\n", "\n"))
	if text == "" {
		return "", nil, errors.New(kind + " content is required")
	}
	if !strings.HasSuffix(text, "\n") {
		text += "\n"
	}
	return text, frontmatter(text), nil
}

// save 统一负责创建目录、落盘并回读解析结果。
func save[T any](
	path string,
	text string,
	meta map[string]string,
	check func(string, map[string]string) error,
	parse func(string, []byte, time.Time) (T, error),
) (T, error) {
	if err := check(path, meta); err != nil {
		var zero T
		return zero, err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		var zero T
		return zero, err
	}
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		var zero T
		return zero, err
	}

	info, err := os.Stat(path)
	if err != nil {
		var zero T
		return zero, err
	}
	return parse(path, []byte(text), info.ModTime())
}
