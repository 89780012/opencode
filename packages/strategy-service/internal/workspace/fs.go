package workspace

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode/utf8"
)

const (
	limit = 256 * 1024
	peek  = 8 * 1024
)

var skip = map[string]bool{
	".git":         true,
	"build":        true,
	"coverage":     true,
	"dist":         true,
	"node_modules": true,
}

func base() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".xtp-smart", "plugins")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}
	return dir, nil
}

func safe(root string, path string) (string, error) {
	if strings.TrimSpace(path) == "" {
		return "", errors.New("path is required")
	}

	full := filepath.Clean(path)
	rel, err := filepath.Rel(root, full)
	if err != nil {
		return "", err
	}
	if rel == "." {
		return full, nil
	}
	if strings.HasPrefix(rel, "..") {
		return "", errors.New("path is outside workspace root")
	}
	return full, nil
}

func valid(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("workspace name is required")
	}
	if name == "." || name == ".." {
		return errors.New("invalid workspace name")
	}
	if strings.ContainsAny(name, `\/:*?"<>|`) {
		return errors.New("workspace name contains invalid characters")
	}
	return nil
}

func listDirs(root string) ([]Local, error) {
	items, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}

	out := make([]Local, 0, len(items))
	for _, item := range items {
		if !item.IsDir() {
			continue
		}
		out = append(out, Local{
			Name:     item.Name(),
			Path:     filepath.Join(root, item.Name()),
			Keywords: []string{},
		})
	}

	sort.Slice(out, func(i int, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	return out, nil
}

func listFiles(root string) ([]File, error) {
	files := []File{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if path != root && skip[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		files = append(files, File{
			Path: filepath.ToSlash(rel),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(files, func(i int, j int) bool {
		return files[i].Path < files[j].Path
	})

	return files, nil
}

func read(path string) ([]byte, int64, bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, 0, false, err
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, 0, false, err
	}
	defer file.Close()

	body, err := io.ReadAll(io.LimitReader(file, limit+1))
	if err != nil {
		return nil, info.Size(), false, err
	}

	if int64(len(body)) > limit {
		return body[:limit], info.Size(), true, nil
	}

	return body, info.Size(), info.Size() > limit, nil
}

func text(body []byte) bool {
	if len(body) == 0 {
		return true
	}
	if bytes.IndexByte(body, 0) >= 0 {
		return false
	}

	head := body
	if len(head) > peek {
		head = head[:peek]
	}
	if utf8.Valid(head) {
		return true
	}

	var hit int
	for _, ch := range head {
		if ch == '\n' || ch == '\r' || ch == '\t' {
			hit++
			continue
		}
		if ch >= 0x20 && ch <= 0x7e {
			hit++
		}
	}

	return float64(hit)/float64(len(head)) >= 0.9
}
