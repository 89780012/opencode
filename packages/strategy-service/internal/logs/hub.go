package logs

import (
	"bufio"
	"context"
	"os"
	"strings"
	"time"
)

const (
	ManagedType = "managed"
	ChildType   = "child"
)

type Source struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Type      string    `json:"type"`
	Format    string    `json:"format"`
	Path      string    `json:"path"`
	Watchable bool      `json:"watchable"`
	Rotated   bool      `json:"rotated"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
	Size      int64     `json:"size,omitempty"`
}

type TailResult struct {
	Source Source   `json:"source"`
	Path   string   `json:"path"`
	Lines  []string `json:"lines"`
}

type Hub struct{}

func New() *Hub {
	return &Hub{}
}

func (h *Hub) Sources(_ context.Context, limit int) ([]Source, error) {
	out := []Source{}

	if row, err := h.source(context.Background(), ServiceKind); err == nil {
		out = append(out, row)
	}
	if row, err := h.source(context.Background(), OpencodeKind); err == nil {
		out = append(out, row)
	}
	if limit <= 0 || limit >= len(out) {
		return out, nil
	}
	return out[:limit], nil
}

func (h *Hub) Tail(ctx context.Context, id string, size int) (TailResult, error) {
	row, err := h.source(ctx, id)
	if err != nil {
		return TailResult{}, err
	}

	lines, err := tailPath(row.Path, size)
	if err != nil {
		return TailResult{}, err
	}
	return TailResult{
		Source: row,
		Path:   row.Path,
		Lines:  lines,
	}, nil
}

func (h *Hub) source(_ context.Context, id string) (Source, error) {
	switch strings.ToLower(strings.TrimSpace(id)) {
	case ServiceKind:
		row, err := fileSource(ServiceKind)
		if err != nil {
			return Source{}, err
		}
		row.Label = "Strategy Service"
		row.Type = ManagedType
		row.Format = "json"
		row.Rotated = true
		return row, nil
	case OpencodeKind:
		row, err := fileSource(OpencodeKind)
		if err != nil {
			return Source{}, err
		}
		row.Label = "OpenCode"
		row.Type = ChildType
		row.Format = "text"
		row.Rotated = true
		return row, nil
	}
	return Source{}, os.ErrNotExist
}

func fileSource(kind string) (Source, error) {
	path, err := logPath(kind)
	if err != nil {
		return Source{}, err
	}

	out := Source{
		ID:        kind,
		Label:     kind,
		Path:      path,
		Watchable: true,
	}
	info, err := os.Stat(path)
	if err == nil {
		out.UpdatedAt = info.ModTime()
		out.Size = info.Size()
	}
	if err == nil || os.IsNotExist(err) {
		return out, nil
	}
	return Source{}, err
}

func tailPath(path string, size int) ([]string, error) {
	lines, _, err := tailPathOffset(path, size)
	return lines, err
}

func tailPathOffset(path string, size int) ([]string, int64, error) {
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return []string{}, 0, nil
	}
	if err != nil {
		return nil, 0, err
	}
	defer file.Close()

	size = clamp(size)
	scan := bufio.NewScanner(file)
	scan.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	lines := []string{}
	for scan.Scan() {
		line := strings.TrimRight(scan.Text(), "\r")
		if line == "" {
			continue
		}
		lines = append(lines, line)
		lines = shrink(lines, size)
	}
	if err := scan.Err(); err != nil {
		return nil, 0, err
	}

	info, err := file.Stat()
	if err != nil {
		return nil, 0, err
	}
	return lines, info.Size(), nil
}

func shrink(lines []string, size int) []string {
	if len(lines) <= size {
		return lines
	}
	return append([]string{}, lines[len(lines)-size:]...)
}
