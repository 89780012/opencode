package group

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/workspace"
)

const file = "groups.json"

type Service struct {
	ws *workspace.Service
}

func NewService(ws *workspace.Service) *Service {
	return &Service{ws: ws}
}

func (s *Service) List() (ListResult, error) {
	rows, err := s.load()
	if err != nil {
		return ListResult{}, err
	}
	return ListResult{
		Groups: rows,
	}, nil
}

func (s *Service) Detail(id string) (DetailResult, error) {
	rows, err := s.load()
	if err != nil {
		return DetailResult{}, err
	}
	at := slices.IndexFunc(rows, func(row Row) bool {
		return row.ID == id
	})
	if at < 0 {
		return DetailResult{}, os.ErrNotExist
	}
	return DetailResult{
		Group: rows[at],
	}, nil
}

func (s *Service) Create(name string, count int, git bool, paths []string) (CreateResult, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return CreateResult{}, errors.New("group name is required")
	}

	rows, err := s.load()
	if err != nil {
		return CreateResult{}, err
	}
	if slices.ContainsFunc(rows, func(row Row) bool {
		return strings.EqualFold(strings.TrimSpace(row.Name), name)
	}) {
		return CreateResult{}, os.ErrExist
	}

	if len(paths) > 0 {
		return s.pick(rows, name, paths)
	}
	if count < 2 || count > 3 {
		return CreateResult{}, errors.New("group count must be 2 or 3")
	}

	now := time.Now().UnixMilli()
	row := Row{
		ID:        next("grp"),
		Name:      name,
		Count:     count,
		CreatedAt: now,
		UpdatedAt: now,
		Items:     make([]Item, 0, count),
	}

	done := []string{}
	for i := 0; i < count; i++ {
		itemName := name + "-" + strconv.Itoa(i+1)
		out, err := s.ws.Create(itemName, git)
		if err != nil {
			for _, path := range done {
				_ = os.RemoveAll(path)
			}
			return CreateResult{}, err
		}
		done = append(done, out.Workspace.Path)
		row.Items = append(row.Items, Item{
			ID:        next("itm"),
			Name:      out.Workspace.Name,
			Path:      out.Workspace.Path,
			Order:     i,
			Workspace: out.Workspace,
		})
	}

	rows = append(rows, row)
	err = s.save(rows)
	if err != nil {
		for _, path := range done {
			_ = os.RemoveAll(path)
		}
		return CreateResult{}, err
	}

	return CreateResult{
		Group: row,
	}, nil
}

func (s *Service) pick(rows []Row, name string, paths []string) (CreateResult, error) {
	if len(paths) < 2 || len(paths) > 3 {
		return CreateResult{}, errors.New("group count must be 2 or 3")
	}

	taken := map[string]bool{}
	for _, row := range rows {
		for _, item := range row.Items {
			taken[filepath.Clean(item.Path)] = true
		}
	}

	seen := map[string]bool{}
	items := make([]Item, 0, len(paths))
	for i, path := range paths {
		key := filepath.Clean(path)
		if seen[key] {
			return CreateResult{}, errors.New("duplicate workspace path")
		}
		seen[key] = true
		if taken[key] {
			return CreateResult{}, errors.New("workspace already belongs to another group")
		}

		out, err := s.ws.Open(path, false)
		if err != nil {
			return CreateResult{}, err
		}
		items = append(items, Item{
			ID:        next("itm"),
			Name:      out.Workspace.Name,
			Path:      out.Workspace.Path,
			Order:     i,
			Workspace: out.Workspace,
		})
	}

	now := time.Now().UnixMilli()
	row := Row{
		ID:        next("grp"),
		Name:      name,
		Count:     len(items),
		CreatedAt: now,
		UpdatedAt: now,
		Items:     items,
	}

	err := s.save(append(rows, row))
	if err != nil {
		return CreateResult{}, err
	}

	return CreateResult{
		Group: row,
	}, nil
}

func (s *Service) Delete(id string) error {
	rows, err := s.load()
	if err != nil {
		return err
	}

	at := slices.IndexFunc(rows, func(row Row) bool {
		return row.ID == id
	})
	if at < 0 {
		return os.ErrNotExist
	}

	row := rows[at]
	next := append(rows[:at], rows[at+1:]...)
	err = s.save(next)
	if err != nil {
		return err
	}

	for _, item := range row.Items {
		err = s.ws.Delete(item.Path)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *Service) Prune(path string) error {
	rows, err := s.load()
	if err != nil {
		return err
	}

	key := filepath.Clean(path)
	now := time.Now().UnixMilli()
	hit := false
	next := make([]Row, 0, len(rows))

	for _, row := range rows {
		items := make([]Item, 0, len(row.Items))
		for _, item := range row.Items {
			if filepath.Clean(item.Path) == key {
				hit = true
				continue
			}
			items = append(items, item)
		}
		if len(items) == len(row.Items) {
			next = append(next, row)
			continue
		}
		if len(items) < 2 {
			continue
		}
		row.Items = items
		row.Count = len(items)
		row.UpdatedAt = now
		next = append(next, row)
	}

	if !hit {
		return nil
	}

	return s.save(next)
}

func (s *Service) path() (string, error) {
	root, err := cfg.Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(root, file), nil
}

func (s *Service) load() ([]Row, error) {
	path, err := s.path()
	if err != nil {
		return nil, err
	}
	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Row{}, nil
	}
	if err != nil {
		return nil, err
	}

	rows := []Row{}
	err = json.Unmarshal(body, &rows)
	if err != nil {
		return nil, err
	}
	for i := range rows {
		rows[i].Count = len(rows[i].Items)
		for j := range rows[i].Items {
			if rows[i].Items[j].Workspace.Path == "" {
				rows[i].Items[j].Workspace = workspace.Local{
					Name:     rows[i].Items[j].Name,
					Path:     rows[i].Items[j].Path,
					Keywords: []string{},
				}
			}
		}
	}
	return rows, nil
}

func (s *Service) save(rows []Row) error {
	path, err := s.path()
	if err != nil {
		return err
	}
	body, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(body, '\n'), 0o644)
}

func next(prefix string) string {
	body := make([]byte, 8)
	_, _ = rand.Read(body)
	return prefix + "_" + hex.EncodeToString(body)
}
