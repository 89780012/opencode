package workbench

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"strategy-service/internal/db"
	oc "strategy-service/internal/opencode"
)

type Service struct {
	op   *oc.Service
	base string
	cli  *http.Client
}

func NewService(op *oc.Service, base string) *Service {
	return &Service{
		op:   op,
		base: strings.TrimRight(strings.TrimSpace(base), "/"),
		cli: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (s *Service) CreateSession(ctx context.Context, req SessionCreate) (json.RawMessage, error) {
	if err := s.op.Ensure(ctx); err != nil {
		return nil, err
	}
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.Title = strings.TrimSpace(req.Title)
	req.Requirements = clean(req.Requirements)
	if req.WorkspacePath == "" {
		return nil, fmt.Errorf("workspacePath is required")
	}
	if req.Title == "" {
		req.Title = SessionTitle
	}
	body, err := json.Marshal(map[string]string{"title": req.Title})
	if err != nil {
		return nil, err
	}

	call, err := http.NewRequestWithContext(ctx, http.MethodPost, s.addr("/session", req.WorkspacePath), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	call.Header.Set("Content-Type", "application/json")

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
	if err := s.put(ctx, req, data); err != nil {
		return nil, err
	}
	return data, nil
}

func (s *Service) UpdateSession(ctx context.Context, req SessionUpdate) (SessionRow, error) {
	req.ID = strings.TrimSpace(req.ID)
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		req.Title = strings.TrimSpace(req.Name)
	}
	if req.ID == "" {
		return SessionRow{}, fmt.Errorf("id is required")
	}
	if req.Title == "" {
		return SessionRow{}, fmt.Errorf("title is required")
	}
	doc, err := db.Open()
	if err != nil {
		return SessionRow{}, err
	}
	res, err := doc.ExecContext(ctx, "update sessions set title = ? where id = ?", req.Title, req.ID)
	if err != nil {
		return SessionRow{}, err
	}
	count, err := res.RowsAffected()
	if err != nil {
		return SessionRow{}, err
	}
	if count == 0 {
		return SessionRow{}, db.ErrNotFound
	}
	return loadSession(ctx, doc, req.ID)
}

func (s *Service) DeleteSession(ctx context.Context, req SessionDelete) error {
	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return fmt.Errorf("id is required")
	}
	doc, err := db.Open()
	if err != nil {
		return err
	}
	res, err := doc.ExecContext(ctx, "delete from sessions where id = ?", req.ID)
	if err != nil {
		return err
	}
	count, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return db.ErrNotFound
	}
	return nil
}

func (s *Service) ListSessions(ctx context.Context, req SessionList) (SessionListResult, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	doc, err := db.Open()
	if err != nil {
		return SessionListResult{}, err
	}

	reqs, err := loadReqs(ctx, doc, req.WorkspacePath)
	if err != nil {
		return SessionListResult{}, err
	}

	var rows *sql.Rows
	if req.WorkspacePath == "" {
		rows, err = doc.QueryContext(ctx, "select id, workspace_path, title, body, analysis, created_at, updated_at from sessions order by updated_at desc")
	} else {
		rows, err = doc.QueryContext(ctx, "select id, workspace_path, title, body, analysis, created_at, updated_at from sessions where workspace_path = ? order by updated_at desc", req.WorkspacePath)
	}
	if err != nil {
		return SessionListResult{}, err
	}
	defer rows.Close()

	out := SessionListResult{WorkspacePath: req.WorkspacePath, Requirements: reqs}
	for rows.Next() {
		row, err := scanSession(rows)
		if err != nil {
			return SessionListResult{}, err
		}
		out.Sessions = append(out.Sessions, row)
	}
	return out, rows.Err()
}

func (s *Service) DetailSession(ctx context.Context, req SessionDetail) (SessionRow, error) {
	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return SessionRow{}, fmt.Errorf("id is required")
	}
	doc, err := db.Open()
	if err != nil {
		return SessionRow{}, err
	}
	return loadSession(ctx, doc, req.ID)
}

func (s *Service) Identify(ctx context.Context, req IdentifyReq) (IdentifyRes, error) {
	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" {
		return IdentifyRes{}, fmt.Errorf("message is required")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return IdentifyRes{}, err
	}

	call, err := http.NewRequestWithContext(ctx, http.MethodPost, s.path("/ai/strategy/requirements/identify"), bytes.NewReader(body))
	if err != nil {
		return IdentifyRes{}, err
	}
	call.Header.Set("Accept", "application/json")
	call.Header.Set("Content-Type", "application/json")

	resp, err := s.cli.Do(call)
	if err != nil {
		return IdentifyRes{}, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return IdentifyRes{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return IdentifyRes{}, fmt.Errorf("identify failed: %s %s", resp.Status, strings.TrimSpace(string(data)))
	}

	out := IdentifyRes{}
	if err := json.Unmarshal(data, &out); err != nil {
		return IdentifyRes{}, err
	}

	out.Title = strings.TrimSpace(out.Title)
	out.Summary = strings.TrimSpace(out.Summary)
	out.Model = strings.TrimSpace(out.Model)
	out.Items = clean(out.Items)
	if out.Dims == nil {
		out.Dims = map[string][]Hit{}
	}
	for key, list := range out.Dims {
		out.Dims[key] = cleanHits(list)
	}
	return out, nil
}

func (s *Service) put(ctx context.Context, req SessionCreate, session json.RawMessage) error {
	meta := struct {
		ID    string `json:"id"`
		Title string `json:"title"`
	}{}
	if err := json.Unmarshal(session, &meta); err != nil {
		return err
	}
	meta.ID = strings.TrimSpace(meta.ID)
	if meta.ID == "" {
		return fmt.Errorf("session id is required")
	}
	meta.Title = req.Title
	now := time.Now().UnixMilli()
	doc, err := db.Open()
	if err != nil {
		return err
	}
	analysis := ""
	if len(req.Analysis) > 0 {
		analysis = string(req.Analysis)
	}
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)
on conflict(id) do update set workspace_path = excluded.workspace_path, title = excluded.title, body = excluded.body, analysis = excluded.analysis, updated_at = excluded.updated_at`,
		meta.ID, req.WorkspacePath, meta.Title, string(session), analysis, now, now)
	if err != nil {
		return err
	}
	if req.Requirements == nil {
		return nil
	}
	return saveReqs(ctx, doc, req.WorkspacePath, req.Requirements, now)
}

type scanner interface {
	Scan(...any) error
}

func scanSession(rows scanner) (SessionRow, error) {
	var row SessionRow
	var body string
	var analysis string
	if err := rows.Scan(&row.ID, &row.WorkspacePath, &row.Title, &body, &analysis, &row.CreatedAt, &row.UpdatedAt); err != nil {
		return SessionRow{}, err
	}
	row.Session = json.RawMessage(body)
	if strings.TrimSpace(analysis) != "" {
		row.Analysis = json.RawMessage(analysis)
	}
	return row, nil
}

func loadSession(ctx context.Context, doc *sql.DB, id string) (SessionRow, error) {
	row, err := scanSession(doc.QueryRowContext(ctx, "select id, workspace_path, title, body, analysis, created_at, updated_at from sessions where id = ?", id))
	if err == sql.ErrNoRows {
		return SessionRow{}, db.ErrNotFound
	}
	return row, err
}

func loadReqs(ctx context.Context, doc *sql.DB, workspace string) ([]string, error) {
	workspace = strings.TrimSpace(workspace)
	if workspace == "" {
		return []string{}, nil
	}
	var body string
	err := doc.QueryRowContext(ctx, "select items from workspace_requirements where workspace_path = ?", workspace).Scan(&body)
	if err == sql.ErrNoRows {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	var out []string
	if err := json.Unmarshal([]byte(body), &out); err != nil {
		return nil, err
	}
	return clean(out), nil
}

func saveReqs(ctx context.Context, doc *sql.DB, workspace string, reqs []string, now int64) error {
	body, err := json.Marshal(clean(reqs))
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_requirements(workspace_path, items, updated_at) values (?, ?, ?)
on conflict(workspace_path) do update set items = excluded.items, updated_at = excluded.updated_at`, workspace, string(body), now)
	return err
}

func clean(list []string) []string {
	out := list[:0]
	for _, item := range list {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func cleanHits(list []Hit) []Hit {
	out := list[:0]
	for _, item := range list {
		item.Source = strings.TrimSpace(item.Source)
		item.Text = strings.TrimSpace(item.Text)
		if item.Source == "" && item.Text == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Service) path(raw string) string {
	baseURL := s.base
	if baseURL == "" {
		baseURL = "https://smarttest.ztqft.com"
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	base, err := url.Parse(baseURL)
	if err != nil {
		return baseURL + raw
	}
	ref, err := url.Parse(raw)
	if err != nil {
		return baseURL + raw
	}
	return base.ResolveReference(ref).String()
}
