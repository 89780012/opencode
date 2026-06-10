package workbench

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
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
	if err := s.submit(ctx, req, data); err != nil {
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
	_, err = doc.ExecContext(ctx, "delete from workspace_requirements where session_id = ?", req.ID)
	return err
}

func (s *Service) ListSessions(ctx context.Context, req SessionList) (SessionListResult, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	doc, err := db.Open()
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

	out := SessionListResult{WorkspacePath: req.WorkspacePath}
	for rows.Next() {
		row, err := scanSession(rows)
		if err != nil {
			return SessionListResult{}, err
		}
		out.Sessions = append(out.Sessions, row)
	}
	if err := rows.Err(); err != nil {
		return SessionListResult{}, err
	}
	if err := rows.Close(); err != nil {
		return SessionListResult{}, err
	}
	for idx := range out.Sessions {
		reqs, err := loadReqs(ctx, doc, out.Sessions[idx].WorkspacePath, out.Sessions[idx].ID)
		if err != nil {
			return SessionListResult{}, err
		}
		out.Sessions[idx].Requirements = reqs
	}
	return out, nil
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

func (s *Service) SaveAnalysis(ctx context.Context, req AnalysisReq) (AnalysisRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.State = strings.TrimSpace(req.State)
	req.Text = strings.TrimSpace(req.Text)
	req.Items = clean(req.Items)
	if req.WorkspacePath == "" {
		return AnalysisRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	if req.State == "" {
		req.State = "done"
	}
	if req.State != "running" && req.State != "done" {
		return AnalysisRow{}, fmt.Errorf("invalid analysis state")
	}
	if len(req.Items) == 0 {
		req.Items = items(req.Text)
	}
	if req.Text == "" {
		req.Text = numbered(req.Items)
	}

	body, err := json.Marshal(req.Items)
	if err != nil {
		return AnalysisRow{}, err
	}
	now := time.Now().UnixMilli()
	doc, err := db.Open()
	if err != nil {
		return AnalysisRow{}, err
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_analysis(workspace_path, worktree_path, state, items, text, updated_at) values (?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set state = excluded.state, items = excluded.items, text = excluded.text, updated_at = excluded.updated_at`,
		req.WorkspacePath, req.WorktreePath, req.State, string(body), req.Text, now)
	if err != nil {
		return AnalysisRow{}, err
	}
	return AnalysisRow{
		WorkspacePath: req.WorkspacePath,
		WorktreePath:  req.WorktreePath,
		State:         req.State,
		Items:         req.Items,
		Text:          req.Text,
		UpdatedAt:     now,
	}, nil
}

func (s *Service) GetAnalysis(ctx context.Context, req AnalysisGet) (AnalysisRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return AnalysisRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	doc, err := db.Open()
	if err != nil {
		return AnalysisRow{}, err
	}
	var row AnalysisRow
	var body string
	err = doc.QueryRowContext(ctx, `select workspace_path, worktree_path, state, items, text, updated_at from workspace_analysis where workspace_path = ? and worktree_path = ?`,
		req.WorkspacePath, req.WorktreePath).Scan(&row.WorkspacePath, &row.WorktreePath, &row.State, &body, &row.Text, &row.UpdatedAt)
	if err == sql.ErrNoRows {
		return AnalysisRow{}, db.ErrNotFound
	}
	if err != nil {
		return AnalysisRow{}, err
	}
	if err := json.Unmarshal([]byte(body), &row.Items); err != nil {
		return AnalysisRow{}, err
	}
	row.Items = clean(row.Items)
	return row, nil
}

func (s *Service) GetFlowchart(ctx context.Context, req FlowchartGet) (FlowchartRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return FlowchartRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	doc, err := db.Open()
	if err != nil {
		return FlowchartRow{}, err
	}
	var row FlowchartRow
	err = doc.QueryRowContext(ctx, `select workspace_path, worktree_path, analysis_hash, state, code, err, updated_at from workspace_flowcharts where workspace_path = ? and worktree_path = ?`,
		req.WorkspacePath, req.WorktreePath).Scan(&row.WorkspacePath, &row.WorktreePath, &row.AnalysisHash, &row.State, &row.Code, &row.Err, &row.UpdatedAt)
	if err == sql.ErrNoRows {
		return FlowchartRow{}, db.ErrNotFound
	}
	return row, err
}

func (s *Service) SaveFlowchart(ctx context.Context, req FlowchartReq) (FlowchartRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.State = strings.TrimSpace(req.State)
	req.Code = mermaid(req.Code)
	req.Err = strings.TrimSpace(req.Err)
	if req.WorkspacePath == "" {
		return FlowchartRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	if req.State == "" {
		req.State = "done"
	}
	if req.State == "done" && req.Code == "" {
		return FlowchartRow{}, fmt.Errorf("code is required")
	}
	if req.State != "generating" && req.State != "done" && req.State != "error" {
		return FlowchartRow{}, fmt.Errorf("invalid flowchart state")
	}
	sum := strings.TrimSpace(req.AnalysisHash)
	if sum == "" {
		analysis, err := s.GetAnalysis(ctx, AnalysisGet{WorkspacePath: req.WorkspacePath, WorktreePath: req.WorktreePath})
		if err == nil {
			sum = hash(analysis.Text)
		}
	}
	row := FlowchartRow{
		WorkspacePath: req.WorkspacePath,
		WorktreePath:  req.WorktreePath,
		State:         req.State,
		Code:          req.Code,
		Err:           req.Err,
		AnalysisHash:  sum,
		UpdatedAt:     time.Now().UnixMilli(),
	}
	if err := s.saveFlow(ctx, row); err != nil {
		return FlowchartRow{}, err
	}
	return row, nil
}

func (s *Service) saveFlow(ctx context.Context, row FlowchartRow) error {
	doc, err := db.Open()
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_flowcharts(workspace_path, worktree_path, analysis_hash, state, code, err, updated_at) values (?, ?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set analysis_hash = excluded.analysis_hash, state = excluded.state, code = excluded.code, err = excluded.err, updated_at = excluded.updated_at`,
		row.WorkspacePath, row.WorktreePath, row.AnalysisHash, row.State, row.Code, row.Err, row.UpdatedAt)
	return err
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
	return saveReqs(ctx, doc, req.WorkspacePath, meta.ID, req.Requirements, now)
}

func (s *Service) submit(ctx context.Context, req SessionCreate, session json.RawMessage) error {
	if len(req.Requirements) == 0 {
		return nil
	}
	meta := struct {
		ID string `json:"id"`
	}{}
	if err := json.Unmarshal(session, &meta); err != nil {
		return err
	}
	meta.ID = strings.TrimSpace(meta.ID)
	if meta.ID == "" {
		return fmt.Errorf("session id is required")
	}
	body, err := json.Marshal(map[string]any{
		"parts": []map[string]string{{
			"type": "text",
			"text": brief(req.Requirements),
		}},
	})
	if err != nil {
		return err
	}
	call, err := http.NewRequestWithContext(ctx, http.MethodPost, s.addr("/session/"+url.PathEscape(meta.ID)+"/prompt_async", req.WorkspacePath), bytes.NewReader(body))
	if err != nil {
		return err
	}
	call.Header.Set("Content-Type", "application/json")
	resp, err := s.cli.Do(call)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("opencode requirements submit failed: %s %s", resp.Status, strings.TrimSpace(string(data)))
	}
	return nil
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
	if err != nil {
		return SessionRow{}, err
	}
	row.Requirements, err = loadReqs(ctx, doc, row.WorkspacePath, row.ID)
	return row, err
}

func loadReqs(ctx context.Context, doc *sql.DB, workspace string, id string) ([]string, error) {
	workspace = strings.TrimSpace(workspace)
	id = strings.TrimSpace(id)
	if workspace == "" || id == "" {
		return []string{}, nil
	}
	var body string
	err := doc.QueryRowContext(ctx, "select items from workspace_requirements where workspace_path = ? and session_id = ?", workspace, id).Scan(&body)
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

func saveReqs(ctx context.Context, doc *sql.DB, workspace string, id string, reqs []string, now int64) error {
	body, err := json.Marshal(clean(reqs))
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_requirements(workspace_path, session_id, items, updated_at) values (?, ?, ?, ?)
on conflict(workspace_path, session_id) do update set items = excluded.items, updated_at = excluded.updated_at`, workspace, id, string(body), now)
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

func items(text string) []string {
	out := []string{}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if idx := strings.Index(line, "."); idx > 0 {
			head := strings.TrimSpace(line[:idx])
			ok := true
			for _, char := range head {
				if char < '0' || char > '9' {
					ok = false
					break
				}
			}
			if ok {
				line = strings.TrimSpace(line[idx+1:])
			}
		}
		if line != "" {
			out = append(out, line)
		}
	}
	return clean(out)
}

func numbered(list []string) string {
	out := []string{}
	for i, item := range clean(list) {
		out = append(out, fmt.Sprintf("%d.\n%s", i+1, item))
	}
	return strings.Join(out, "\n\n")
}

func brief(list []string) string {
	return strings.TrimSpace(`请根据以下策略需求开始工作：

` + numbered(list))
}

func mermaid(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```mermaid")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	idx := strings.Index(text, "flowchart")
	if idx > 0 {
		text = strings.TrimSpace(text[idx:])
	}
	if !strings.HasPrefix(text, "flowchart") {
		return ""
	}
	return text
}

func hash(text string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(text)))
	return hex.EncodeToString(sum[:])
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
