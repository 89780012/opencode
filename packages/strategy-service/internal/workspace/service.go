package workspace

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"

	"strategy-service/internal/asset"
	"strategy-service/internal/proc"
	rt "strategy-service/internal/runtime"
)

type Service struct {
	rt  *rt.Service
	doc *store
}

func NewService(rt *rt.Service) *Service {
	return &Service{
		rt:  rt,
		doc: &store{},
	}
}

func local(path string) Local {
	info, err := os.Stat(path)
	if err != nil {
		return Local{
			Name:     filepath.Base(path),
			Path:     path,
			Keywords: []string{},
			Missing:  true,
		}
	}

	row := Local{
		Name:      filepath.Base(path),
		Path:      path,
		Keywords:  []string{},
		UpdatedAt: info.ModTime().UnixMilli(),
	}

	meta, err := asset.ReadMeta(path)
	if err == nil {
		row.Type = meta.Type
		row.Template = meta.Template
		row.EntryFile = meta.EntryFile
		row.Keywords = meta.Keywords
		return row
	}

	body, err := os.ReadFile(filepath.Join(path, "package.json"))
	if err != nil {
		return row
	}

	pkg := map[string]any{}
	err = json.Unmarshal(body, &pkg)
	if err != nil {
		return row
	}

	tpl, _ := pkg["project_template"].(string)
	if tpl == "plugin_python" {
		row.Type = "smartx"
		row.Template = "smartx_plugin_python"
		row.EntryFile = "start.py"
		row.Keywords = []string{row.Name, "smartx", "python", "plugin"}
	}

	return row
}

func (s *Service) row(item Local) Local {
	out := local(item.Path)
	out.ID = item.ID
	out.Source = item.Source
	out.Managed = item.Managed
	if out.Name == "" {
		out.Name = item.Name
	}
	if out.Type == "" {
		out.Type = item.Type
	}
	if out.Template == "" {
		out.Template = item.Template
	}
	if out.EntryFile == "" {
		out.EntryFile = item.EntryFile
	}
	if len(out.Keywords) == 0 {
		out.Keywords = item.Keywords
	}
	if out.UpdatedAt == 0 {
		out.UpdatedAt = item.UpdatedAt
	}
	return out
}

func (s *Service) List() (ListResult, error) {
	base, err := base()
	if err != nil {
		slog.Error("workspace list: base path error", "error", err)
		return ListResult{}, err
	}

	rows, err := s.doc.load()
	if err != nil {
		slog.Error("workspace list: load failed", "error", err)
		return ListResult{}, err
	}

	out := make([]Local, 0, len(rows))
	for _, item := range rows {
		out = append(out, s.row(item))
	}

	slog.Info("workspace list", "count", len(out))
	return ListResult{
		BasePath:   base,
		Workspaces: out,
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

func workspaceRoot(kind string) (string, error) {
	if strings.EqualFold(strings.TrimSpace(kind), "smartx") {
		return base()
	}
	return root()
}

func (s *Service) put(item Local) error {
	rows, err := s.doc.load()
	if err != nil {
		return err
	}

	key := filepath.Clean(item.Path)
	at := slices.IndexFunc(rows, func(row Local) bool {
		return filepath.Clean(row.Path) == key
	})
	if at >= 0 {
		rows[at] = item
	} else {
		rows = append(rows, item)
	}
	return s.doc.save(rows)
}

func (s *Service) pick(path string) (Local, error) {
	rows, err := s.doc.load()
	if err != nil {
		return Local{}, err
	}

	key := filepath.Clean(path)
	at := slices.IndexFunc(rows, func(row Local) bool {
		return filepath.Clean(row.Path) == key
	})
	if at < 0 {
		return Local{}, os.ErrNotExist
	}
	return rows[at], nil
}

func (s *Service) dir(path string) (string, error) {
	row, err := s.pick(path)
	if err != nil {
		return "", err
	}

	dir := filepath.Clean(row.Path)
	info, err := os.Stat(dir)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", os.ErrInvalid
	}
	return dir, nil
}

func (s *Service) Create(name string, kind string, template string, git bool) (CreateResult, error) {
	slog.Info("workspace create", "name", name, "type", kind, "template", template)
	root, err := workspaceRoot(kind)
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

	item, ok := asset.TemplateByID(template)
	if !ok {
		item, ok = asset.TemplateByType(kind)
	}
	if !ok {
		slog.Warn("workspace create: invalid template", "type", kind, "template", template)
		return CreateResult{}, os.ErrInvalid
	}

	err = asset.SeedWorkspace(path, item)
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

	row := local(path)
	row.ID = next()
	row.Source = "user_created"
	row.Managed = true
	err = s.put(row)
	if err != nil {
		return CreateResult{}, err
	}

	slog.Info("workspace created", "name", name, "path", path)
	return CreateResult{
		BasePath:  root,
		Workspace: row,
	}, nil
}

func (s *Service) Open(path string, git bool) (OpenResult, error) {
	slog.Info("workspace open", "path", path)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace open: resolve path error", "path", path, "error", err)
		return OpenResult{}, err
	}

	if git {
		err = s.initGit(context.Background(), dir)
		if err != nil {
			slog.Error("workspace open: git init failed", "dir", dir, "error", err)
			return OpenResult{}, err
		}
	}

	item, err := s.pick(dir)
	if err != nil {
		return OpenResult{}, err
	}
	row := s.row(item)
	err = s.put(row)
	if err != nil {
		return OpenResult{}, err
	}

	slog.Info("workspace opened", "dir", dir)
	return OpenResult{
		BasePath:  dir,
		Workspace: row,
	}, nil
}

func (s *Service) Import(path string, typ string, git bool) (OpenResult, error) {
	slog.Info("workspace import", "path", path, "type", typ)
	dir := filepath.Clean(strings.TrimSpace(path))
	if dir == "" {
		return OpenResult{}, errors.New("path is required")
	}

	info, err := os.Stat(dir)
	if err != nil {
		return OpenResult{}, err
	}
	if !info.IsDir() {
		return OpenResult{}, os.ErrInvalid
	}

	if git {
		err = s.initGit(context.Background(), dir)
		if err != nil {
			return OpenResult{}, err
		}
	}

	row := local(dir)
	if row.Type == "" {
		row.Type = kind(typ)
	}
	if row.Type == "" {
		row.Type = "other"
	}
	if len(row.Keywords) == 0 {
		row.Keywords = uniq([]string{row.Name, row.Type})
	}

	old, err := s.pick(dir)
	if err == nil {
		row.ID = old.ID
		row.Source = old.Source
		row.Managed = old.Managed
	} else {
		row.ID = next()
		row.Source = "imported"
		row.Managed = false
	}

	err = s.put(row)
	if err != nil {
		return OpenResult{}, err
	}

	return OpenResult{
		BasePath:  dir,
		Workspace: row,
	}, nil
}

func (s *Service) Files(path string) (FilesResult, error) {
	slog.Debug("workspace files", "path", path)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace files: resolve path error", "path", path, "error", err)
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
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace content: resolve path error", "path", path, "error", err)
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

func (s *Service) Write(path string, file string, body string) (FileContentResult, error) {
	slog.Info("workspace write", "path", path, "file", file)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace write: resolve path error", "path", path, "error", err)
		return FileContentResult{}, err
	}

	target, err := safe(dir, filepath.Join(dir, file))
	if err != nil {
		slog.Error("workspace write: safe file error", "file", file, "error", err)
		return FileContentResult{}, err
	}

	info, err := os.Stat(target)
	if err != nil && !os.IsNotExist(err) {
		slog.Error("workspace write: stat failed", "target", target, "error", err)
		return FileContentResult{}, err
	}
	if err == nil && info.IsDir() {
		return FileContentResult{}, os.ErrInvalid
	}

	mode := os.FileMode(0o644)
	if info != nil {
		mode = info.Mode().Perm()
	}

	err = os.WriteFile(target, []byte(body), mode)
	if err != nil {
		slog.Error("workspace write: save failed", "target", target, "error", err)
		return FileContentResult{}, err
	}

	return s.Content(path, file)
}

func (s *Service) Delete(path string) error {
	slog.Info("workspace delete", "path", path)
	rows, err := s.doc.load()
	if err != nil {
		slog.Error("workspace delete: load failed", "error", err)
		return err
	}

	key := filepath.Clean(path)
	next := make([]Local, 0, len(rows))
	hit := false
	for _, item := range rows {
		if filepath.Clean(item.Path) == key {
			hit = true
			continue
		}
		next = append(next, item)
	}
	if !hit {
		return nil
	}

	err = s.doc.save(next)
	if err != nil {
		return err
	}

	slog.Info("workspace removed", "path", key)
	return nil
}
