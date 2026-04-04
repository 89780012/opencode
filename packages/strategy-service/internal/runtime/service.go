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

// New 根据配置创建运行时服务，并预处理自定义覆盖路径。
func New(cfg Config) *Service {
	over := map[string]string{}
	for key, value := range cfg.Over {
		over[key] = strings.TrimSpace(value)
	}

	return &Service{
		root: strings.TrimSpace(cfg.Root),  // opencode或者git放的根目录
		over: over,	 	// 映射工具
	}
}

// Resolve 按配置、本地注册、内置运行时和系统 PATH 的顺序解析工具。
func (s *Service) Resolve(_ context.Context, id string) (Result, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Result{}, errors.New("tool id is required")
	}

	if out, ok := s.config(id); ok {
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

// Ensure 确保指定内置工具已安装到本地缓存目录并返回解析结果。
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

	return out, nil
}

// Remove 删除本地缓存中的内置工具，并移除对应的注册记录。
func (s *Service) Remove(id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("tool id is required")
	}

	base, err := s.base()
	if err != nil {
		return err
	}

	return os.RemoveAll(filepath.Join(base, id))
}

// Has 判断给定工具是否存在可用的内置运行时包。
func (s *Service) Has(id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return false
	}

	_, err := s.pkg(id)
	return err == nil
}

// Own 判断某个路径是否属于当前服务安装的指定内置工具。
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

// config 从显式配置的覆盖路径中解析工具可执行文件。
func (s *Service) config(id string) (Result, bool) {
	id = strings.TrimSpace(id)
	path := strings.TrimSpace(s.over[id])
	if path == "" || path == id {
		return Result{}, false
	}

	//在系统的 $PATH 环境变量中查找指定的可执行文件 path，并返回其绝对路径
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

// system 在系统 PATH 中查找同名可执行文件。
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

// pkg 在候选运行时目录中定位内置工具的压缩包或解压目录。
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

// candidates 汇总并去重所有可能存放内置运行时资源的目录。
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

// target 确保根目录最终指向当前平台对应的运行时子目录。
func (s *Service) target(root string) string {
	if strings.HasSuffix(filepath.Clean(root), target()) {
		return filepath.Clean(root)
	}
	return filepath.Join(root, target())
}

// copydir 递归复制目录内容并尽量保留文件权限。
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

// base 返回本地运行时缓存根目录，并确保目录已创建。
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

func target() string {
	return runtime.GOOS + "-" + arch()
}

// arch 将 Go 架构名称转换为运行时目录约定使用的名称。
func arch() string {
	if runtime.GOARCH == "amd64" {
		return "x64"
	}
	if runtime.GOARCH == "arm64" {
		return "arm64"
	}
	return runtime.GOARCH
}

// bins 返回指定工具在当前平台下可能的可执行文件相对路径列表。
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
