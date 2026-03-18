package workspace

import (
	"embed"
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

//go:embed skills/** agents/** template/**
var asset embed.FS

func ensureAll(items []Local) error {
	for _, item := range items {
		err := ensure(item.Path)
		if err != nil {
			return err
		}
	}
	return nil
}

func ensure(dir string) error {
	for _, root := range []string{"skills", "agents"} {
		err := sync(filepath.Join(dir, ".opencode", filepath.FromSlash(root)), root)
		if err != nil {
			return err
		}
	}

	return nil
}

func seed(dir string) error {
	err := sync(dir, "template/plugin_python")
	if err != nil {
		return err
	}

	return patch(dir)
}

func sync(base string, root string) error {
	return fs.WalkDir(asset, root, func(src string, d fs.DirEntry, err error) error {
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

		body, err := asset.ReadFile(src)
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
