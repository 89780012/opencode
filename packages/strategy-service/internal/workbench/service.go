package workbench

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	oc "strategy-service/internal/opencode"
)

type Service struct {
	op *oc.Service
}

func NewService(op *oc.Service) *Service {
	return &Service{op: op}
}

func (s *Service) CreateSession(ctx context.Context, req SessionCreate) (json.RawMessage, error) {
	if err := s.op.Ensure(ctx); err != nil {
		return nil, err
	}

	body := io.Reader(nil)
	if req.Title != "" {
		data, err := json.Marshal(map[string]string{"title": req.Title})
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(data)
	}

	call, err := http.NewRequestWithContext(ctx, http.MethodPost, s.addr("/session", req.WorkspacePath), body)
	if err != nil {
		return nil, err
	}
	if body != nil {
		call.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(call)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("opencode session create failed: %s %s", resp.Status, strings.TrimSpace(string(data)))
	}
	return data, nil
}
