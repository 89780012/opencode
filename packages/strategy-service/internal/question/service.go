package question

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/db"
)

type Service struct {
	doc *store
	mu  sync.Mutex
}

func NewService() *Service {
	return &Service{
		doc: &store{},
	}
}

func (s *Service) List(req List) (ListResult, error) {
	if req.WorkspacePath == "" {
		return ListResult{}, fmt.Errorf("workspacePath is required")
	}
	s.mu.Lock()
	idx, err := s.doc.load()
	s.mu.Unlock()
	if err != nil {
		return ListResult{}, err
	}

	doc, err := db.Open()
	if err != nil {
		return ListResult{}, err
	}
	names, err := names(doc, req.WorkspacePath)
	if err != nil {
		return ListResult{}, err
	}

	out := ListResult{WorkspacePath: req.WorkspacePath}
	for i := len(idx.Questions) - 1; i >= 0; i-- {
		q := idx.Questions[i]
		if q.WorkspacePath != req.WorkspacePath {
			continue
		}
		q.Name = names[q.SessionID]
		out.Questions = append(out.Questions, q)
	}
	return out, nil
}

func (s *Service) Delete(req Delete) (Delete, error) {
	req.ID = strings.TrimSpace(req.ID)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.ID == "" {
		return Delete{}, fmt.Errorf("id is required")
	}
	if req.SessionID == "" {
		return Delete{}, fmt.Errorf("sessionId is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	idx, err := s.doc.load()
	if err != nil {
		return Delete{}, err
	}

	next := Index{Questions: make([]Entry, 0, len(idx.Questions))}
	var hit Entry
	for _, q := range idx.Questions {
		if q.ID == req.ID && q.SessionID == req.SessionID {
			hit = q
			continue
		}
		next.Questions = append(next.Questions, q)
	}
	if hit.ID == "" {
		return Delete{}, db.ErrNotFound
	}
	if err := s.doc.save(next); err != nil {
		return Delete{}, err
	}
	return Delete{ID: hit.ID, SessionID: hit.SessionID}, nil
}

func (s *Service) Append(entry Entry) (Entry, error) {
	entry.WorkspacePath = strings.TrimSpace(entry.WorkspacePath)
	entry.SessionID = strings.TrimSpace(entry.SessionID)
	entry.MessageID = strings.TrimSpace(entry.MessageID)
	entry.Body = strings.TrimSpace(entry.Body)
	if entry.WorkspacePath == "" {
		return Entry{}, fmt.Errorf("workspacePath is required")
	}
	if entry.SessionID == "" {
		return Entry{}, fmt.Errorf("sessionId is required")
	}
	if entry.Body == "" {
		return Entry{}, fmt.Errorf("body is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	idx, err := s.doc.load()
	if err != nil {
		return Entry{}, err
	}

	entry.ID = next()
	if entry.CreatedAt == 0 {
		entry.CreatedAt = time.Now().UnixMilli()
	}
	idx.Questions = append(idx.Questions, entry)

	err = s.doc.save(idx)
	if err != nil {
		return Entry{}, err
	}

	return entry, nil
}

func next() string {
	body := make([]byte, 8)
	_, _ = rand.Read(body)
	return "q_" + hex.EncodeToString(body)
}

func names(doc *sql.DB, workspace string) (map[string]string, error) {
	rows, err := doc.Query("select id, title from sessions where workspace_path = ?", workspace)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var id string
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		out[id] = name
	}
	return out, rows.Err()
}
