package runtime

import (
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type Service struct {
	root string
	over map[string]string
}

func New(cfg Config) *Service {
	over := map[string]string{}
	for key, value := range cfg.Over {
		over[key] = strings.TrimSpace(value)
	}

	return &Service{
		root: strings.TrimSpace(cfg.Root),
		over: over,
	}
}

func (s *Service) Resolve(_ context.Context, id string) (Result, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Result{}, errors.New("tool id is required")
	}

	if out, ok := s.config(id); ok {
		return out, nil
	}

	if out, ok := s.entry(id); ok {
		return out, nil
	}

	if out, ok := s.local(id); ok {
		return out, nil
	}

	if out, ok := s.system(id); ok {
		return out, nil
	}

	return Result{
		ID:      id,
		Message: "command not found",
	}, nil
}

func (s *Service) Ensure(_ context.Context, id string) (Result, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Result{}, errors.New("tool id is required")
	}

	if out, ok := s.local(id); ok {
		return out, nil
	}

	row, err := s.pkg(id)
	if err != nil {
		return Result{}, err
	}

	base, err := s.base()
	if err != nil {
		return Result{}, err
	}

	dst := filepath.Join(base, id)
	tmp := dst + ".tmp"
	_ = os.RemoveAll(tmp)
	_ = os.RemoveAll(dst)

	if row.Archive != "" {
		err = unzip(row.Archive, tmp)
		if err != nil {
			return Result{}, err
		}
	} else {
		err = copydir(row.Dir, tmp)
		if err != nil {
			return Result{}, err
		}
	}

	err = os.Rename(tmp, dst)
	if err != nil {
		_ = os.RemoveAll(tmp)
		return Result{}, err
	}

	out, ok := s.local(id)
	if !ok {
		return Result{}, errors.New("builtin tool activation failed")
	}

	err = s.set(id, Entry{
		Source: string(SourceBuiltin),
		Path:   out.Path,
	})
	if err != nil {
		return Result{}, err
	}

	return out, nil
}

func (s *Service) Remove(id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("tool id is required")
	}

	base, err := s.base()
	if err != nil {
		return err
	}

	err = os.RemoveAll(filepath.Join(base, id))
	if err != nil {
		return err
	}

	return s.drop(id)
}

func (s *Service) Has(id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return false
	}

	_, err := s.pkg(id)
	return err == nil
}

func (s *Service) Own(id string, path string) bool {
	id = strings.TrimSpace(id)
	path = strings.TrimSpace(path)
	if id == "" || path == "" {
		return false
	}

	base, err := s.base()
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

func (s *Service) config(id string) (Result, bool) {
	id = strings.TrimSpace(id)
	path := strings.TrimSpace(s.over[id])
	if path == "" || path == id {
		return Result{}, false
	}

	file, err := exec.LookPath(path)
	if err != nil {
		return Result{}, false
	}

	return Result{
		ID:     id,
		Found:  true,
		Source: SourceConfig,
		Path:   file,
		Dir:    filepath.Dir(file),
	}, true
}

func (s *Service) entry(id string) (Result, bool) {
	id = strings.TrimSpace(id)
	all, err := s.load()
	if err != nil {
		return Result{}, false
	}

	item, ok := all[id]
	if !ok {
		return Result{}, false
	}

	if strings.TrimSpace(item.Path) == "" {
		return Result{}, false
	}

	_, err = os.Stat(item.Path)
	if err != nil {
		return Result{}, false
	}

	return Result{
		ID:     id,
		Found:  true,
		Source: Source(item.Source),
		Path:   item.Path,
		Dir:    filepath.Dir(item.Path),
	}, true
}

func (s *Service) local(id string) (Result, bool) {
	id = strings.TrimSpace(id)
	base, err := s.base()
	if err != nil {
		return Result{}, false
	}

	for _, item := range bins(id) {
		path := filepath.Join(base, id, item)
		_, err = os.Stat(path)
		if err != nil {
			continue
		}

		return Result{
			ID:     id,
			Found:  true,
			Source: SourceBuiltin,
			Path:   path,
			Dir:    filepath.Dir(path),
		}, true
	}

	return Result{}, false
}

func (s *Service) system(id string) (Result, bool) {
	id = strings.TrimSpace(id)
	path, err := exec.LookPath(id)
	if err != nil {
		return Result{}, false
	}

	return Result{
		ID:     id,
		Found:  true,
		Source: SourceSystem,
		Path:   path,
		Dir:    filepath.Dir(path),
	}, true
}

func (s *Service) pkg(id string) (Result, error) {
	id = strings.TrimSpace(id)
	for _, root := range s.candidates() {
		arc := filepath.Join(root, id+".zip")
		_, err := os.Stat(arc)
		if err == nil {
			return Result{
				ID:      id,
				Found:   true,
				Source:  SourceBuiltin,
				Archive: arc,
			}, nil
		}

		dir := filepath.Join(root, id)
		for _, item := range bins(id) {
			path := filepath.Join(dir, item)
			_, err := os.Stat(path)
			if err == nil {
				return Result{
					ID:     id,
					Found:  true,
					Source: SourceBuiltin,
					Path:   path,
					Dir:    dir,
				}, nil
			}
		}
	}

	return Result{}, errors.New("builtin runtime not found")
}

func (s *Service) candidates() []string {
	list := []string{}
	if s.root != "" {
		list = append(list, s.target(s.root), s.root)
	}

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

func (s *Service) target(root string) string {
	if strings.HasSuffix(filepath.Clean(root), target()) {
		return filepath.Clean(root)
	}
	return filepath.Join(root, target())
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

		err = os.MkdirAll(filepath.Dir(out), 0o755)
		if err != nil {
			return err
		}

		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()

		outFile, err := os.OpenFile(out, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode(info.Mode()))
		if err != nil {
			return err
		}

		_, err = io.Copy(outFile, in)
		closeErr := outFile.Close()
		if err != nil {
			return err
		}
		return closeErr
	})
}

func (s *Service) base() (string, error) {
	dir, err := os.UserCacheDir()
	if err != nil {
		dir = "."
	}

	out := filepath.Join(dir, "strategy-service", "runtime")
	err = os.MkdirAll(out, 0o755)
	if err != nil {
		return "", err
	}
	return out, nil
}

func (s *Service) store() (string, error) {
	base, err := s.base()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "tools.json"), nil
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
