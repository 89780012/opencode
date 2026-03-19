package workspace

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func local(path string) Local {
	return Local{
		Name:     filepath.Base(path),
		Path:     path,
		Keywords: []string{},
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

	err = ensureAll(items)
	if err != nil {
		slog.Error("workspace list: ensureAll failed", "error", err)
		return ListResult{}, err
	}

	slog.Info("workspace list", "root", root, "count", len(items))
	return ListResult{
		BasePath:   root,
		Workspaces: items,
	}, nil
}

func (s *Service) Create(name string) (CreateResult, error) {
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

	err = seed(path)
	if err != nil {
		slog.Error("workspace create: seed failed", "path", path, "error", err)
		_ = os.RemoveAll(path)
		return CreateResult{}, err
	}

	err = ensure(path)
	if err != nil {
		slog.Error("workspace create: ensure failed", "path", path, "error", err)
		_ = os.RemoveAll(path)
		return CreateResult{}, err
	}

	slog.Info("workspace created", "name", name, "path", path)
	return CreateResult{
		BasePath:  root,
		Workspace: local(path),
	}, nil
}

func (s *Service) Open(path string) (OpenResult, error) {
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

	err = ensure(dir)
	if err != nil {
		slog.Error("workspace open: ensure failed", "dir", dir, "error", err)
		return OpenResult{}, err
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

	err = ensure(dir)
	if err != nil {
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

	err = ensure(dir)
	if err != nil {
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
