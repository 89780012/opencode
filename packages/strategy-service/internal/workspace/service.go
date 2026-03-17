package workspace

import (
	"os"
	"path/filepath"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) List() (ListResult, error) {
	root, err := base()
	if err != nil {
		return ListResult{}, err
	}

	items, err := listDirs(root)
	if err != nil {
		return ListResult{}, err
	}

	err = ensureAll(items)
	if err != nil {
		return ListResult{}, err
	}

	return ListResult{
		BasePath:   root,
		Workspaces: items,
	}, nil
}

func (s *Service) Create(name string) (CreateResult, error) {
	root, err := base()
	if err != nil {
		return CreateResult{}, err
	}

	err = valid(name)
	if err != nil {
		return CreateResult{}, err
	}

	path := filepath.Join(root, name)
	_, err = os.Stat(path)
	if err == nil {
		return CreateResult{}, os.ErrExist
	}
	if !os.IsNotExist(err) {
		return CreateResult{}, err
	}

	err = os.MkdirAll(path, 0o755)
	if err != nil {
		return CreateResult{}, err
	}

	err = ensure(path)
	if err != nil {
		_ = os.RemoveAll(path)
		return CreateResult{}, err
	}

	return CreateResult{
		BasePath: root,
		Workspace: Local{
			Name:     name,
			Path:     path,
			Keywords: []string{},
		},
	}, nil
}

func (s *Service) Files(path string) (FilesResult, error) {
	root, err := base()
	if err != nil {
		return FilesResult{}, err
	}

	dir, err := safe(root, path)
	if err != nil {
		return FilesResult{}, err
	}

	err = ensure(dir)
	if err != nil {
		return FilesResult{}, err
	}

	files, err := listFiles(dir)
	if err != nil {
		return FilesResult{}, err
	}

	return FilesResult{
		WorkspacePath: dir,
		Files:         files,
		TotalFiles:    len(files),
	}, nil
}

func (s *Service) Content(path string, file string) (FileContentResult, error) {
	root, err := base()
	if err != nil {
		return FileContentResult{}, err
	}

	dir, err := safe(root, path)
	if err != nil {
		return FileContentResult{}, err
	}

	err = ensure(dir)
	if err != nil {
		return FileContentResult{}, err
	}

	target, err := safe(dir, filepath.Join(dir, file))
	if err != nil {
		return FileContentResult{}, err
	}

	body, err := os.ReadFile(target)
	if err != nil {
		return FileContentResult{}, err
	}

	rel, err := filepath.Rel(dir, target)
	if err != nil {
		return FileContentResult{}, err
	}

	return FileContentResult{
		WorkspacePath: dir,
		Path:          filepath.ToSlash(rel),
		Content:       string(body),
	}, nil
}
