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

func (s *Service) Create(name string, count int, git bool) (CreateResult, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return CreateResult{}, errors.New("group name is required")
	}
	if count < 2 || count > 3 {
		return CreateResult{}, errors.New("group count must be 2 or 3")
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
