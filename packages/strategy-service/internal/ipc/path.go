package ipc

import (
	"crypto/md5"
	"encoding/hex"
	"os"
	"path"
	"path/filepath"
	"runtime"
)

var safe = map[string]int{
	"linux":  107,
	"darwin": 103,
}

func userData(product string) (string, error) {
	return userDataFor(runtime.GOOS, product, os.Getenv, os.UserHomeDir)
}

func userDataFor(goos string, product string, env func(string) string, home func() (string, error)) (string, error) {
	if goos == "win32" || goos == "windows" {
		root := env("APPDATA")
		if root != "" {
			return filepath.Join(root, product), nil
		}

		root = env("USERPROFILE")
		if root == "" {
			return "", os.ErrNotExist
		}
		return filepath.Join(root, "AppData", "Roaming", product), nil
	}

	dir, err := home()
	if err != nil {
		return "", err
	}

	if goos == "darwin" {
		return path.Join(dir, "Library", "Application Support", product), nil
	}
	if goos == "linux" {
		root := env("XDG_CONFIG_HOME")
		if root == "" {
			root = path.Join(dir, ".config")
		}
		return path.Join(root, product), nil
	}

	return "", os.ErrInvalid
}

func handle(product string, kind string, version string) (string, error) {
	root, err := userData(product)
	if err != nil {
		return "", err
	}
	return handleFor(runtime.GOOS, root, kind, version), nil
}

func handleFor(goos string, root string, kind string, version string) string {
	sum := md5.Sum([]byte(root))
	scope := hex.EncodeToString(sum[:])
	if goos == "win32" || goos == "windows" {
		return `\\.\pipe\` + scope + "-" + version + "-" + kind + "-sock"
	}

	path := path.Join(root, version+"-"+kind+".sock")
	validate(goos, path)
	return path
}

func validate(goos string, path string) bool {
	limit, ok := safe[goos]
	if !ok {
		return true
	}
	return len(path) < limit
}
