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
	"sync"

	"strategy-service/internal/asset"
	"strategy-service/internal/gitenv"
	"strategy-service/internal/proc"
	rt "strategy-service/internal/runtime"
)

type Service struct {
	rt  *rt.Service
	doc *store
	mu  sync.Mutex
}

// NewService 创建工作区服务，并复用运行时解析能力。
func NewService(rt *rt.Service) *Service {
	return &Service{
		rt:  rt,
		doc: &store{},
	}
}

// local 从目录读取工作区元数据，并尽量推断模板信息。
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

// row 用持久化记录补全本地扫描结果，避免丢失来源和管理状态。
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

// draft 按目录和类型提示生成一条可保存的工作区记录。
func draft(path string, typ string) Local {
	row := local(path)
	if row.Type == "" {
		row.Type = kind(typ)
	}
	if row.Type == "" {
		row.Type = "other"
	}
	if len(row.Keywords) == 0 {
		row.Keywords = uniq([]string{row.Name, row.Type})
	}
	return row
}

// remember 保留已有记录的身份信息，否则补一条新的来源信息。
func (s *Service) remember(row Local, src string, managed bool) Local {
	old, err := s.pick(row.Path)
	if err == nil {
		row.ID = old.ID
		row.Source = old.Source
		row.Managed = old.Managed
		return row
	}

	row.ID = next()
	row.Source = src
	row.Managed = managed
	return row
}

// List 返回当前已登记的工作区列表。
func (s *Service) List() (ListResult, error) {
	base, err := pluginDir()
	if err != nil {
		slog.Error("workspace list: base path error", "error", err)
		return ListResult{}, err
	}

	s.mu.Lock()
	rows, err := s.doc.load()
	s.mu.Unlock()
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

// initGit 在目标目录中执行一次 git init。
func (s *Service) initGit(ctx context.Context, dir string) error {
	row, err := s.resolveGit(ctx)
	if err != nil {
		return err
	}
	if !row.Found {
		return os.ErrNotExist
	}
	env := gitenv.Apply(os.Environ(), row.Path, false)

	slog.Info("workspace git init", "bin", row.Path, "dir", dir)
	cmd := exec.CommandContext(ctx, row.Path, "init", "--quiet")
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
		slog.Error("workspace git init output", "bin", row.Path, "dir", dir, "output", text)
		return errors.New(text)
	}
	return err
}

// git 判断目录当前是否已经是 Git 仓库。
func git(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, ".git"))
	return err == nil
}

// resolveGit 统一解析当前环境中的 Git 可执行文件。
func (s *Service) resolveGit(ctx context.Context) (rt.Result, error) {
	if s.rt != nil {
		return s.rt.Resolve(ctx, "git")
	}
	return rt.Result{
		ID:      "git",
		Message: "command not found",
	}, nil
}

// ensureGit 确保目标目录具备可用的 Git 仓库状态。
func (s *Service) ensureGit(ctx context.Context, dir string) (GitState, error) {
	out, err := s.probeGit(ctx, dir)
	if err != nil {
		return GitState{}, err
	}
	if out.Repo {
		return out, nil
	}
	if !out.Available {
		return out, os.ErrNotExist
	}

	if err := s.initGit(ctx, dir); err != nil {
		return out, err
	}

	out.Repo = true
	out.Initialized = true
	return out, nil
}

func (s *Service) probeGit(ctx context.Context, dir string) (GitState, error) {
	row, err := s.resolveGit(ctx)
	if err != nil {
		return GitState{}, err
	}

	return GitState{
		Repo:      git(dir),
		Available: row.Found,
	}, nil
}

// workspaceRoot 根据类型选择默认落盘目录。
func workspaceRoot(kind string) (string, error) {
	if strings.EqualFold(strings.TrimSpace(kind), "smartx") {
		return pluginDir()
	}
	return workspaceDir()
}

// put 将工作区记录按路径写回索引文件。
func (s *Service) put(item Local) error {
	s.mu.Lock()
	defer s.mu.Unlock()

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

// pick 根据路径读取一条现有工作区记录。
func (s *Service) pick(path string) (Local, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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

// dir 校验给定路径是否指向已登记的工作区目录。
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

// Create 创建并登记一个新的工作区。
func (s *Service) Create(name string, kind string, template string, git bool) (CreateResult, error) {
	slog.Info("workspace create", "name", name, "type", kind, "template", template)
	root, err := workspaceRoot(kind)
	if err != nil {
		slog.Error("workspace create: base path error", "error", err)
		return CreateResult{}, err
	}

	err = validPath(name)
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
		_, err = s.ensureGit(context.Background(), path)
		if err != nil {
			slog.Error("workspace create: git init failed", "path", path, "error", err)
			_ = os.RemoveAll(path)
			return CreateResult{}, err
		}
	}

	row := s.remember(local(path), "user_created", true)
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

// Open 重新打开一个已登记的工作区，并按需初始化 Git。
func (s *Service) Open(path string, git bool) (OpenResult, error) {
	slog.Info("workspace open", "path", path)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace open: resolve path error", "path", path, "error", err)
		return OpenResult{}, err
	}

	if git {
		_, err = s.ensureGit(context.Background(), dir)
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

// Import 将本地目录导入到工作区索引中。
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
		_, err = s.ensureGit(context.Background(), dir)
		if err != nil {
			return OpenResult{}, err
		}
	}

	row := s.remember(draft(dir, typ), "imported", false)

	err = s.put(row)
	if err != nil {
		return OpenResult{}, err
	}

	return OpenResult{
		BasePath:  dir,
		Workspace: row,
	}, nil
}

// Attach 在 opencode 就绪后把现有目录接入工作区。
func (s *Service) Attach(ctx context.Context, path string, typ string, git bool) (AttachResult, error) {
	slog.Info("workspace attach", "path", path, "type", typ)
	dir := filepath.Clean(strings.TrimSpace(path))
	if dir == "" {
		return AttachResult{}, errors.New("path is required")
	}

	info, err := os.Stat(dir)
	if err != nil {
		return AttachResult{}, err
	}
	if !info.IsDir() {
		return AttachResult{}, os.ErrInvalid
	}

	state, err := s.probeGit(ctx, dir)
	if err != nil {
		return AttachResult{}, err
	}
	if git && !state.Repo {
		state, err = s.ensureGit(ctx, dir)
		if err != nil {
			return AttachResult{}, err
		}
	}

	row := s.remember(draft(dir, typ), "external", false)

	if err := s.put(row); err != nil {
		return AttachResult{}, err
	}

	return AttachResult{
		Workspace: row,
		Git:       state,
	}, nil
}

// Files 列出工作区内可浏览的文件。
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

// Content 读取工作区中的单个文件内容，并判断是否可预览。
func (s *Service) Content(path string, file string) (FileContentResult, error) {
	slog.Debug("workspace content", "path", path, "file", file)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace content: resolve path error", "path", path, "error", err)
		return FileContentResult{}, err
	}

	target, err := fullPath(dir, filepath.Join(dir, file))
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

// Write 将文本内容写回工作区中的目标文件。
func (s *Service) Write(path string, file string, body string) (FileContentResult, error) {
	slog.Info("workspace write", "path", path, "file", file)
	dir, err := s.dir(path)
	if err != nil {
		slog.Error("workspace write: resolve path error", "path", path, "error", err)
		return FileContentResult{}, err
	}

	target, err := fullPath(dir, filepath.Join(dir, file))
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

// Delete 只从工作区索引中移除记录，不删除真实目录。
func (s *Service) Delete(path string) error {
	slog.Info("workspace delete", "path", path)
	s.mu.Lock()
	defer s.mu.Unlock()

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
