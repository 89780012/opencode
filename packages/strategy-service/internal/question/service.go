package question

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
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

func (s *Service) ListByWorkspace(workspacePath string) ([]Entry, error) {
	s.mu.Lock()
	idx, err := s.doc.load()
	s.mu.Unlock()
	if err != nil {
		return nil, err
	}

	out := make([]Entry, 0, len(idx.Questions))
	for _, q := range idx.Questions {
		if q.WorkspacePath == workspacePath {
			out = append(out, q)
		}
	}

	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}

	return out, nil
}

func (s *Service) Append(entry Entry) (Entry, error) {
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
