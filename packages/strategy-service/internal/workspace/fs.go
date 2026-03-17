package workspace

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

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
