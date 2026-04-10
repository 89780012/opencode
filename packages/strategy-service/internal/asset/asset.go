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
//go:embed frontend/** all:workspace/**
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
	for _, item := range []string{"agents", "skills"} {
		err = sync(filepath.Join(root, item), "workspace/"+item, true)
		if err != nil {
			return err
		}
	}

	return nil
}

func EnsureWorkspace(dir string) error {
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return nil
	}
	return sync(filepath.Join(dir, ".opencode"), "workspace/.opencode", false)
}

// EnsureMCP writes the strategy-service remote MCP entry into the user's global opencode config.
func EnsureMCP(url string) error {
	root, err := configRoot()
	if err != nil {
		return err
	}

	path := filepath.Join(root, "opencode.json")
	cfg := map[string]any{}
	body, err := os.ReadFile(path)
	if err == nil {
		_ = json.Unmarshal(body, &cfg)
	}
	if cfg["mcp"] == nil {
		cfg["mcp"] = map[string]any{}
	}

	mcp, ok := cfg["mcp"].(map[string]any)
	if !ok {
		next := map[string]any{}
		cfg["mcp"] = next
		mcp = next
	}

	mcp["smartx"] = map[string]any{
		"type":    "remote",
		"url":     strings.TrimRight(url, "/") + "/mcp",
		"enabled": true,
		"oauth":   false,
		"timeout": 30000,
	}

	body, err = json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')
	return os.WriteFile(path, body, 0o644)
}

// SeedWorkspace copies the builtin workspace template into a new workspace.
func SeedWorkspace(dir string, item Template) error {
	err := sync(dir, item.Root, false)
	if err != nil {
		return err
	}

	err = patch(dir, item)
	if err != nil {
		return err
	}

	return WriteMeta(dir, item, filepath.Base(dir))
}

// 创建opencode目录
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

func sync(base string, root string, force bool) error {
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
		if err == nil && !force {
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

func patch(dir string, item Template) error {
	if !item.Package {
		return nil
	}

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
	pkg["keywords"] = append([]string{name, item.Type}, item.Keywords...)
	pkg["project_dir"] = filepath.Clean(dir)
	pkg["project_template"] = item.ID

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
