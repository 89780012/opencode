package runtime

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

type Service struct{}

func New() *Service { return &Service{} }

// 获取opencode、git路径
func (s *Service) Resolve(_ context.Context, id string) (Result, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Result{}, errors.New("tool id is required")
	}

	if out, ok := s.local(id); ok {
		return out, nil
	}

	return Result{
		ID:      id,
		Message: "command not found",
	}, nil
}

// 找到对应的目录
func (s *Service) Ensure(_ context.Context, id string) (Result, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Result{}, errors.New("tool id is required")
	}

	//查找内置工具
	if out, ok := s.local(id); ok {
		return out, nil
	}

	row, err := s.pkg(id)
	if err != nil {
		return Result{}, err
	}

	base, err := s.runtimeDir()
	if err != nil {
		return Result{}, err
	}

	dst := filepath.Join(base, id)
	tmp := dst + ".tmp"
	_ = os.RemoveAll(tmp)
	_ = os.RemoveAll(dst)

	if row.Archive != "" {
		err = unzip(row.Archive, tmp)
	} else {
		err = copydir(row.Dir, tmp)
	}
	if err != nil {
		return Result{}, err
	}

	if err := os.Rename(tmp, dst); err != nil {
		_ = os.RemoveAll(tmp)
		return Result{}, err
	}

	out, ok := s.local(id)
	if !ok {
		return Result{}, errors.New("builtin tool activation failed")
	}
	return out, nil
}

func (s *Service) Remove(id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("tool id is required")
	}

	base, err := s.runtimeDir()
	if err != nil {
		return err
	}
	return os.RemoveAll(filepath.Join(base, id))
}

func (s *Service) Has(id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return false
	}

	_, err := s.pkg(id)
	return err == nil
}

// 检查是否是内置工具
func (s *Service) Own(id string, path string) bool {
	id = strings.TrimSpace(id)
	path = strings.TrimSpace(path)
	if id == "" || path == "" {
		return false
	}

	base, err := s.runtimeDir()
	if err != nil {
		return false
	}

	for _, item := range bins(id) {
		want := filepath.Clean(filepath.Join(base, id, item))
		if strings.EqualFold(filepath.Clean(path), want) {
			return true
		}
	}
	return false
}

func found(id string, path string) Result {
	return Result{
		ID:    id,
		Found: true,
		Path:  path,
		Dir:   filepath.Dir(path),
	}
}

// 查找本地bin
func (s *Service) local(id string) (Result, bool) {
	base, err := s.runtimeDir()
	if err != nil {
		return Result{}, false
	}

	for _, item := range bins(id) {
		path := filepath.Join(base, id, item)
		if _, err := os.Stat(path); err == nil {
			return found(id, path), true
		}
	}
	return Result{}, false
}

func (s *Service) pkg(id string) (Result, error) {
	for _, root := range s.candidates() {
		arc := filepath.Join(root, id+".zip")
		if _, err := os.Stat(arc); err == nil {
			return Result{
				ID:      id,
				Found:   true,
				Archive: arc,
			}, nil
		}

		dir := filepath.Join(root, id)
		for _, item := range bins(id) {
			path := filepath.Join(dir, item)
			if _, err := os.Stat(path); err == nil {
				out := found(id, path)
				out.Dir = dir
				return out, nil
			}
		}
	}

	return Result{}, errors.New("builtin runtime not found")
}

// 获取所有候选目录
func (s *Service) candidates() []string {
	list := []string{}

	if cwd, err := os.Getwd(); err == nil {
		list = append(list,
			filepath.Join(cwd, "runtime", target()),
			filepath.Join(cwd, "packages", "strategy-service", "runtime", target()),
		)
	}

	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		list = append(list,
			filepath.Join(dir, "runtime"),
			filepath.Join(dir, "runtime", target()),
			filepath.Join(dir, "..", "runtime"),
			filepath.Join(dir, "..", "runtime", target()),
		)
	}

	out := []string{}
	seen := map[string]bool{}
	for _, item := range list {
		item = filepath.Clean(item)
		if seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}

func copydir(src string, dst string) error {
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		out := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(out, 0o755)
		}

		info, err := d.Info()
		if err != nil {
			return err
		}

		if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
			return err
		}

		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()

		file, err := os.OpenFile(out, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode(info.Mode()))
		if err != nil {
			return err
		}

		_, err = io.Copy(file, in)
		closeErr := file.Close()
		if err != nil {
			return err
		}
		return closeErr
	})
}

func (s *Service) runtimeDir() (string, error) {
	dir, err := os.UserCacheDir()
	if err != nil {
		dir = "."
	}

	out := filepath.Join(dir, "strategy-service", "runtime")
	if err := os.MkdirAll(out, 0o755); err != nil {
		return "", err
	}
	return out, nil
}

func target() string {
	return runtime.GOOS + "-" + arch()
}

func arch() string {
	if runtime.GOARCH == "amd64" {
		return "x64"
	}
	if runtime.GOARCH == "arm64" {
		return "arm64"
	}
	return runtime.GOARCH
}

// 返回可执行bin的可能path路径
func bins(id string) []string {
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}

	if id == "git" {
		return []string{
			"git" + ext,
			filepath.Join("cmd", "git"+ext),
			filepath.Join("bin", "git"+ext),
		}
	}
	return []string{id + ext}
}
