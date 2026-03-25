package asset

import (
	"embed"
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// raw stores the staged frontend bundle and builtin workspace assets.
//
//go:embed frontend/** workspace/**
var raw embed.FS

// Site returns the embedded frontend bundle when a staged build is available.
func Site() fs.FS {
	site, err := fs.Sub(raw, "frontend/dist")
	if err != nil {
		return nil
	}
	return site
}

// EnsureBuiltins将内置的开源代码代理和技能植入用户配置中。
func EnsureBuiltins() error {
	root, err := configRoot()
	if err != nil {
		return err
	}

	// 将workspace下的agents 和 skills copy到用户配置中
	for _, item := range []string{"agents", "skills", "tools"} {
		err = sync(filepath.Join(root, item), "workspace/"+item)
		if err != nil {
			return err
		}
	}

	return nil
}

// SeedWorkspace copies the builtin workspace template into a new workspace.
func SeedWorkspace(dir string) error {
	err := sync(dir, "workspace/template/plugin_python")
	if err != nil {
		return err
	}

	return patch(dir)
}

func configRoot() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".config", "opencode")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}

	return dir, nil
}

func sync(base string, root string) error {
	return fs.WalkDir(raw, root, func(src string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if src == root {
			return os.MkdirAll(base, 0o755)
		}

		rel := strings.TrimPrefix(src, root+"/")
		dst := filepath.Join(base, filepath.FromSlash(rel))
		if d.IsDir() {
			return os.MkdirAll(dst, 0o755)
		}

		_, err = os.Stat(dst)
		if err == nil {
			return nil
		}
		if !os.IsNotExist(err) {
			return err
		}

		body, err := raw.ReadFile(src)
		if err != nil {
			return err
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		mode := info.Mode().Perm()
		if mode == 0 {
			mode = 0o644
		}
		if mode&0o200 == 0 {
			mode |= 0o200
		}

		return os.WriteFile(dst, body, mode)
	})
}

func patch(dir string) error {
	path := filepath.Join(dir, "package.json")
	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}

	pkg := map[string]any{}
	err = json.Unmarshal(body, &pkg)
	if err != nil {
		return err
	}

	name := filepath.Base(dir)
	pkg["name"] = name
	pkg["description"] = name
	pkg["menuText"] = name
	pkg["keywords"] = []string{name}
	pkg["project_dir"] = filepath.Clean(dir)

	body, err = json.MarshalIndent(pkg, "", "    ")
	if err != nil {
		return err
	}
	body = append(body, '\n')

	info, err := os.Stat(path)
	if err != nil {
		return err
	}

	mode := info.Mode().Perm()
	if mode == 0 {
		mode = 0o644
	}
	if mode&0o200 == 0 {
		mode |= 0o200
	}

	return os.WriteFile(path, body, mode)
}
