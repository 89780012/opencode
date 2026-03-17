package workspace

import (
	"embed"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed skills/** agents/**
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
		err := fs.WalkDir(asset, root, func(src string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if src == root {
				return os.MkdirAll(filepath.Join(dir, ".opencode", filepath.FromSlash(src)), 0o755)
			}

			dst := filepath.Join(dir, ".opencode", filepath.FromSlash(src))
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
			return os.WriteFile(dst, body, mode)
		})
		if err != nil {
			return err
		}
	}

	return nil
}
