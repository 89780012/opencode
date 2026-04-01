package workspace

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"strategy-service/internal/asset"
	"strategy-service/internal/proc"
	rt "strategy-service/internal/runtime"
)

type Service struct {
	rt *rt.Service
}

func NewService(rt *rt.Service) *Service {
	return &Service{rt: rt}
}

func local(path string) Local {
	info, err := os.Stat(path)
	if err != nil {
		return Local{
			Name:     filepath.Base(path),
			Path:     path,
			Keywords: []string{},
		}
	}

	return Local{
		Name:      filepath.Base(path),
		Path:      path,
		Keywords:  []string{},
		UpdatedAt: info.ModTime().UnixMilli(),
	}
}

func (s *Service) List() (ListResult, error) {
	root, err := base()
	if err != nil {
		slog.Error("workspace list: base path error", "error", err)
		return ListResult{}, err
	}

	items, err := listDirs(root)
	if err != nil {
		slog.Error("workspace list: listDirs failed", "root", root, "error", err)
		return ListResult{}, err
	}

	slog.Info("workspace list", "root", root, "count", len(items))
	return ListResult{
		BasePath:   root,
		Workspaces: items,
	}, nil
}

func (s *Service) initGit(ctx context.Context, dir string) error {
	bin := "git"
	src := "system"
	env := os.Environ()
	if s.rt != nil {
		row, err := s.rt.Resolve(ctx, "git")
		if err != nil {
			return err
		}
		if !row.Found {
			return os.ErrNotExist
		}
		bin = row.Path
		src = string(row.Source)
		env = gitEnv(env, row)
	}

	slog.Info("workspace git init", "bin", bin, "dir", dir, "source", src)
	cmd := exec.CommandContext(ctx, bin, "init", "--quiet")
	cmd.Dir = dir
	cmd.Env = env
	proc.Hide(cmd)
	out, err := cmd.CombinedOutput()
	text := strings.TrimSpace(string(out))
	if err == nil {
		if text != "" {
			slog.Info("workspace git init output", "dir", dir, "output", text)
		}
		return nil
	}
	if text != "" {
		slog.Error("workspace git init output", "bin", bin, "dir", dir, "source", src, "output", text)
		return errors.New(text)
	}
	return err
}

func gitEnv(env []string, row rt.Result) []string {
	if row.Source != rt.SourceBuiltin {
		return env
	}

	root := filepath.Dir(row.Path)
	if filepath.Base(root) == "cmd" || filepath.Base(root) == "bin" {
		root = filepath.Dir(root)
	}

	list := []string{
		filepath.Join(root, "cmd"),
		filepath.Join(root, "bin"),
		filepath.Join(root, "usr", "bin"),
		filepath.Join(root, "mingw64", "bin"),
		filepath.Join(root, "mingw64", "libexec", "git-core"),
	}

	path := ""
	out := make([]string, 0, len(env)+2)
	for _, item := range env {
		if strings.HasPrefix(strings.ToUpper(item), "PATH=") {
			path = strings.TrimPrefix(item, item[:5])
			continue
		}
		if strings.HasPrefix(strings.ToUpper(item), "GIT_TEMPLATE_DIR=") {
			continue
		}
		out = append(out, item)
	}

	parts := make([]string, 0, len(list)+1)
	for _, item := range list {
		if info, err := os.Stat(item); err == nil && info.IsDir() {
			parts = append(parts, item)
		}
	}
	if path != "" {
		parts = append(parts, path)
	}
	if len(parts) > 0 {
		out = append(out, "PATH="+strings.Join(parts, string(os.PathListSeparator)))
	}

	tpl := filepath.Join(root, "mingw64", "share", "git-core", "templates")
	if info, err := os.Stat(tpl); err == nil && info.IsDir() {
		out = append(out, "GIT_TEMPLATE_DIR="+tpl)
	}

	return out
}

// 创建工作空间
func (s *Service) Create(name string, git bool) (CreateResult, error) {
	slog.Info("workspace create", "name", name)
	root, err := base()
	if err != nil {
		slog.Error("workspace create: base path error", "error", err)
		return CreateResult{}, err
	}

	err = valid(name)
	if err != nil {
		slog.Warn("workspace create: invalid name", "name", name, "error", err)
		return CreateResult{}, err
	}

	path := filepath.Join(root, name)
	_, err = os.Stat(path)
	if err == nil {
		slog.Warn("workspace create: already exists", "path", path)
		return CreateResult{}, os.ErrExist
	}
	if !os.IsNotExist(err) {
		slog.Error("workspace create: stat error", "path", path, "error", err)
		return CreateResult{}, err
	}

	err = os.MkdirAll(path, 0o755)
	if err != nil {
		slog.Error("workspace create: mkdir failed", "path", path, "error", err)
		return CreateResult{}, err
	}

	// 模板文件
	err = asset.SeedWorkspace(path)
	if err != nil {
		slog.Error("workspace create: seed failed", "path", path, "error", err)
		_ = os.RemoveAll(path)
		return CreateResult{}, err
	}

	if git {
		err = s.initGit(context.Background(), path)
		if err != nil {
			slog.Error("workspace create: git init failed", "path", path, "error", err)
			_ = os.RemoveAll(path)
			return CreateResult{}, err
		}
	}

	slog.Info("workspace created", "name", name, "path", path)
	return CreateResult{
		BasePath:  root,
		Workspace: local(path),
	}, nil
}

// 打开工作空间
func (s *Service) Open(path string, git bool) (OpenResult, error) {
	slog.Info("workspace open", "path", path)
	root, err := base()
	if err != nil {
		slog.Error("workspace open: base path error", "error", err)
		return OpenResult{}, err
	}

	dir, err := safe(root, path)
	if err != nil {
		slog.Error("workspace open: safe path error", "path", path, "error", err)
		return OpenResult{}, err
	}
	if filepath.Clean(dir) == filepath.Clean(root) {
		slog.Warn("workspace open: cannot open root", "path", path)
		return OpenResult{}, os.ErrNotExist
	}

	info, err := os.Stat(dir)
	if err != nil {
		slog.Error("workspace open: stat error", "dir", dir, "error", err)
		return OpenResult{}, err
	}
	if !info.IsDir() {
		slog.Warn("workspace open: not a directory", "dir", dir)
		return OpenResult{}, os.ErrInvalid
	}

	if git {
		err = s.initGit(context.Background(), dir)
		if err != nil {
			slog.Error("workspace open: git init failed", "dir", dir, "error", err)
			return OpenResult{}, err
		}
	}

	slog.Info("workspace opened", "dir", dir)
	return OpenResult{
		BasePath:  root,
		Workspace: local(dir),
	}, nil
}

func (s *Service) Files(path string) (FilesResult, error) {
	slog.Debug("workspace files", "path", path)
	root, err := base()
	if err != nil {
		return FilesResult{}, err
	}

	dir, err := safe(root, path)
	if err != nil {
		slog.Error("workspace files: safe path error", "path", path, "error", err)
		return FilesResult{}, err
	}

	files, err := listFiles(dir)
	if err != nil {
		slog.Error("workspace files: listFiles failed", "dir", dir, "error", err)
		return FilesResult{}, err
	}

	slog.Debug("workspace files listed", "dir", dir, "total", len(files))
	return FilesResult{
		WorkspacePath: dir,
		Files:         files,
		TotalFiles:    len(files),
	}, nil
}

func (s *Service) Content(path string, file string) (FileContentResult, error) {
	slog.Debug("workspace content", "path", path, "file", file)
	root, err := base()
	if err != nil {
		return FileContentResult{}, err
	}

	dir, err := safe(root, path)
	if err != nil {
		slog.Error("workspace content: safe path error", "path", path, "error", err)
		return FileContentResult{}, err
	}

	target, err := safe(dir, filepath.Join(dir, file))
	if err != nil {
		slog.Error("workspace content: safe file error", "file", file, "error", err)
		return FileContentResult{}, err
	}

	body, size, cut, err := read(target)
	if err != nil {
		slog.Error("workspace content: read failed", "target", target, "error", err)
		return FileContentResult{}, err
	}

	rel, err := filepath.Rel(dir, target)
	if err != nil {
		return FileContentResult{}, err
	}

	if !text(body) {
		slog.Debug("workspace content: binary file", "file", rel, "size", size)
		return FileContentResult{
			WorkspacePath: dir,
			Path:          filepath.ToSlash(rel),
			Size:          size,
			Previewable:   false,
			Binary:        true,
			Reason:        "binary",
		}, nil
	}

	slog.Debug("workspace content: text file", "file", rel, "size", size, "truncated", cut)
	return FileContentResult{
		WorkspacePath: dir,
		Path:          filepath.ToSlash(rel),
		Content:       strings.ToValidUTF8(string(body), ""),
		Size:          size,
		Previewable:   true,
		Truncated:     cut,
	}, nil
}

func (s *Service) Delete(path string) error {
	slog.Info("workspace delete", "path", path)
	root, err := base()
	if err != nil {
		slog.Error("workspace delete: base path error", "error", err)
		return err
	}

	dir, err := safe(root, path)
	if err != nil {
		slog.Error("workspace delete: safe path error", "path", path, "error", err)
		return err
	}
	if filepath.Clean(dir) == filepath.Clean(root) {
		slog.Warn("workspace delete: cannot delete root", "path", path)
		return os.ErrInvalid
	}

	info, err := os.Stat(dir)
	if os.IsNotExist(err) {
		slog.Warn("workspace delete: path missing", "dir", dir)
		return nil
	}
	if err != nil {
		slog.Error("workspace delete: stat error", "dir", dir, "error", err)
		return err
	}
	if !info.IsDir() {
		slog.Warn("workspace delete: not a directory", "dir", dir)
		return os.ErrInvalid
	}

	err = os.RemoveAll(dir)
	if err != nil {
		slog.Error("workspace delete: remove failed", "dir", dir, "error", err)
		return err
	}

	slog.Info("workspace deleted", "dir", dir)
	return nil
}
