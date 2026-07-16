package workbench

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"strategy-service/internal/db"
	"strategy-service/internal/modelchain"
	oc "strategy-service/internal/opencode"
	"strategy-service/internal/question"
)

type projectStateDoc struct {
	Phase     string   `json:"phase"`
	Status    string   `json:"status"`
	Current   string   `json:"current"`
	Summary   string   `json:"summary"`
	Next      []string `json:"next"`
	Risks     []string `json:"risks"`
	Verified  bool     `json:"verified"`
	Dirty     bool     `json:"dirty"`
	SessionID string   `json:"session_id,omitempty"`
	UpdatedAt int64    `json:"updated_at"`
}

type projectFeatureDoc struct {
	Project  string        `json:"project"`
	Created  string        `json:"created"`
	Features []ProjectTask `json:"features"`
}

type projectFiles struct {
	dir      string
	state    string
	feature  string
	progress string
	log      string
}

var projectStateRequired = []string{"feature-list.json", "progress.md", "session-log.md", "state.json"}

var ErrInput = errors.New("invalid input")

const progressDedupeWindow = 2 * time.Second

type Service struct {
	op    *oc.Service
	chain *modelchain.Service
	q     *question.Service
	base  string
	cli   *http.Client
	evt   func(context.Context, string, json.RawMessage)
}

func NewService(op *oc.Service, chain *modelchain.Service, q *question.Service, base string) *Service {
	if chain == nil {
		chain = modelchain.NewService(op)
	}
	return &Service{
		op:    op,
		chain: chain,
		q:     q,
		base:  strings.TrimRight(strings.TrimSpace(base), "/"),
		cli: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (s *Service) SetEvent(fn func(context.Context, string, json.RawMessage)) {
	s.evt = fn
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

func (s *Service) GetRequirements(ctx context.Context, req RequirementsGet) (RequirementsRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" {
		return RequirementsRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.SessionID == "" {
		return RequirementsRow{}, fmt.Errorf("sessionId is required")
	}
	doc, err := db.Open()
	if err != nil {
		return RequirementsRow{}, err
	}
	reqs, err := loadReqs(ctx, doc, req.WorkspacePath, req.SessionID)
	if err != nil {
		return RequirementsRow{}, err
	}
	return RequirementsRow{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		Requirements:  reqs,
	}, nil
}

func (s *Service) SaveRequirements(ctx context.Context, req RequirementsSave) (RequirementsRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" {
		return RequirementsRow{}, fmt.Errorf("%w: workspacePath is required", ErrInput)
	}
	if req.SessionID == "" {
		return RequirementsRow{}, fmt.Errorf("%w: sessionId is required", ErrInput)
	}
	if req.Requirements == nil {
		return RequirementsRow{}, fmt.Errorf("%w: requirements is required", ErrInput)
	}
	items := make([]string, len(req.Requirements))
	for idx, item := range req.Requirements {
		items[idx] = strings.TrimSpace(item)
		if items[idx] == "" {
			return RequirementsRow{}, fmt.Errorf("%w: requirements[%d] is required", ErrInput, idx)
		}
	}

	doc, err := db.Open()
	if err != nil {
		return RequirementsRow{}, err
	}
	tx, err := doc.BeginTx(ctx, nil)
	if err != nil {
		return RequirementsRow{}, err
	}
	defer tx.Rollback()

	var workspace string
	err = tx.QueryRowContext(ctx, "select workspace_path from sessions where id = ?", req.SessionID).Scan(&workspace)
	if err == sql.ErrNoRows {
		return RequirementsRow{}, db.ErrNotFound
	}
	if err != nil {
		return RequirementsRow{}, err
	}
	if workspace != req.WorkspacePath {
		return RequirementsRow{}, db.ErrNotFound
	}
	if err := saveReqs(ctx, tx, req.WorkspacePath, req.SessionID, items, time.Now().UnixMilli()); err != nil {
		return RequirementsRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return RequirementsRow{}, err
	}
	return RequirementsRow{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		Requirements:  items,
	}, nil
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
	req.Items = logic(req.Items)
	if len(req.Items) > 0 {
		req.Text = serial(req.Items)
	}
	slog.Info("workbench save analysis",
		"workspace_path", req.WorkspacePath,
		"worktree_path", req.WorktreePath,
		"state", req.State,
		"items", len(req.Items),
		"text_hash", hash(req.Text),
	)

	body, err := json.Marshal(req.Items)
	if err != nil {
		return AnalysisRow{}, err
	}
	now := time.Now().UnixMilli()
	doc, err := db.Open()
	if err != nil {
		return AnalysisRow{}, err
	}
	prev, err := s.GetAnalysis(ctx, AnalysisGet{WorkspacePath: req.WorkspacePath, WorktreePath: req.WorktreePath})
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return AnalysisRow{}, err
	}
	same := err == nil && prev.State == req.State && prev.Text == req.Text && strings.Join(prev.Items, "\x00") == strings.Join(req.Items, "\x00")
	if same {
		return AnalysisRow{
			WorkspacePath: req.WorkspacePath,
			WorktreePath:  req.WorktreePath,
			State:         req.State,
			Items:         req.Items,
			Text:          req.Text,
			UpdatedAt:     prev.UpdatedAt,
		}, nil
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_analysis(workspace_path, worktree_path, state, items, text, updated_at) values (?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set state = excluded.state, items = excluded.items, text = excluded.text, updated_at = excluded.updated_at`,
		req.WorkspacePath, req.WorktreePath, req.State, string(body), req.Text, now)
	if err != nil {
		return AnalysisRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		kind:   progressKindAnalysis(req.State),
		state:  progressState(req.State),
		title:  "工作区分析",
		detail: pickSummary(req.Text, req.Items),
		source: "service",
	}); err != nil {
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

func (s *Service) RefreshWorkspace(ctx context.Context, req RefreshReq) (RefreshRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.Reason = strings.TrimSpace(req.Reason)
	if req.WorkspacePath == "" {
		return RefreshRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	now := time.Now().UnixMilli()
	doc, err := db.Open()
	if err != nil {
		return RefreshRow{}, err
	}
	tx, err := doc.Begin()
	if err != nil {
		return RefreshRow{}, err
	}
	defer tx.Rollback()
	body := "[]"
	_, err = tx.ExecContext(ctx, `insert into workspace_analysis(workspace_path, worktree_path, state, items, text, updated_at) values (?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set state = excluded.state, items = excluded.items, text = excluded.text, updated_at = excluded.updated_at`,
		req.WorkspacePath, req.WorktreePath, "requested", body, body, now)
	if err != nil {
		return RefreshRow{}, err
	}
	_, err = tx.ExecContext(ctx, `insert into workspace_flowcharts(workspace_path, worktree_path, analysis_hash, state, code, err, manual, source, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set analysis_hash = excluded.analysis_hash, state = excluded.state, code = excluded.code, err = excluded.err, manual = excluded.manual, source = excluded.source, updated_at = excluded.updated_at`,
		req.WorkspacePath, req.WorktreePath, "", "requested", "", "", 0, "ai", now)
	if err != nil {
		return RefreshRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return RefreshRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		kind:   "workspace.refresh",
		state:  "done",
		title:  "刷新工作区",
		detail: pick(req.Reason, "请求刷新工作区分析和流程图"),
		source: "service",
	}); err != nil {
		return RefreshRow{}, err
	}
	return RefreshRow{
		WorkspacePath: req.WorkspacePath,
		WorktreePath:  req.WorktreePath,
		Reason:        req.Reason,
		UpdatedAt:     now,
		Analysis: AnalysisRow{
			WorkspacePath: req.WorkspacePath,
			WorktreePath:  req.WorktreePath,
			State:         "requested",
			Items:         []string{},
			Text:          body,
			UpdatedAt:     now,
		},
		Flowchart: FlowchartRow{
			WorkspacePath: req.WorkspacePath,
			WorktreePath:  req.WorktreePath,
			State:         "requested",
			Code:          "",
			Err:           "",
			AnalysisHash:  "",
			Manual:        false,
			Source:        "ai",
			UpdatedAt:     now,
		},
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
	var manual int
	err = doc.QueryRowContext(ctx, `select workspace_path, worktree_path, analysis_hash, state, code, err, manual, source, updated_at from workspace_flowcharts where workspace_path = ? and worktree_path = ?`,
		req.WorkspacePath, req.WorktreePath).Scan(&row.WorkspacePath, &row.WorktreePath, &row.AnalysisHash, &row.State, &row.Code, &row.Err, &manual, &row.Source, &row.UpdatedAt)
	if err == sql.ErrNoRows {
		return FlowchartRow{}, db.ErrNotFound
	}
	row.Manual = manual != 0
	if row.Source == "" {
		row.Source = "ai"
	}
	return row, err
}

func (s *Service) SaveFlowchart(ctx context.Context, req FlowchartReq) (FlowchartRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.State = strings.TrimSpace(req.State)
	req.Code = mermaid(req.Code)
	req.Err = strings.TrimSpace(req.Err)
	req.Source = strings.TrimSpace(req.Source)
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
	slog.Info("workbench save flowchart",
		"workspace_path", req.WorkspacePath,
		"worktree_path", req.WorktreePath,
		"state", req.State,
		"code_hash", hash(req.Code),
		"code_len", len(req.Code),
		"err", req.Err,
	)
	manual := req.Manual || req.Source == "manual"
	source := "ai"
	if manual {
		source = "manual"
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
		Manual:        manual,
		Source:        source,
		UpdatedAt:     time.Now().UnixMilli(),
	}
	prev, err := s.GetFlowchart(ctx, FlowchartGet{WorkspacePath: req.WorkspacePath, WorktreePath: req.WorktreePath})
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return FlowchartRow{}, err
	}
	same := err == nil && prev.State == row.State && prev.Code == row.Code && prev.Err == row.Err && prev.AnalysisHash == row.AnalysisHash && prev.Manual == row.Manual && prev.Source == row.Source
	if same {
		row.UpdatedAt = prev.UpdatedAt
		return row, nil
	}
	if err := s.saveFlow(ctx, row); err != nil {
		return FlowchartRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		kind:   progressKindFlowchart(req.State),
		state:  progressState(req.State),
		title:  flowTitle(row),
		source: "service",
	}); err != nil {
		return FlowchartRow{}, err
	}
	return row, nil
}

func (s *Service) GetReview(ctx context.Context, req ReviewGet) (ReviewRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return ReviewRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	doc, err := db.Open()
	if err != nil {
		return ReviewRow{}, err
	}
	row, err := scanReview(doc.QueryRowContext(ctx, `select id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at from workspace_reviews where workspace_path = ? and worktree_path = ? order by updated_at desc limit 1`,
		req.WorkspacePath, req.WorktreePath))
	if err == sql.ErrNoRows {
		return ReviewRow{}, db.ErrNotFound
	}
	if err != nil {
		return ReviewRow{}, err
	}
	return row, nil
}

func (s *Service) ListReviews(ctx context.Context, req ReviewGet) ([]ReviewRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return nil, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	doc, err := db.Open()
	if err != nil {
		return nil, err
	}
	// rows, err := doc.QueryContext(ctx, `select id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at from workspace_reviews where workspace_path = ? and worktree_path = ? order by updated_at desc`,
	// 	req.WorkspacePath, req.WorktreePath)
	//TODO 先不按照worktree_path查询
	rows, err := doc.QueryContext(ctx, `select id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at from workspace_reviews where workspace_path = ? order by updated_at desc`,
		req.WorkspacePath, req.WorktreePath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []ReviewRow{}
	for rows.Next() {
		row, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, rows.Close()
}

func running(ctx context.Context, doc queryer, workspace string, worktree string) (ReviewRow, error) {
	row, err := scanReview(doc.QueryRowContext(ctx, `select id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at from workspace_reviews where workspace_path = ? and worktree_path = ? and state = 'running' order by updated_at desc limit 1`,
		workspace, worktree))
	if err == sql.ErrNoRows {
		return ReviewRow{}, nil
	}
	return row, err
}

func (s *Service) SaveReview(ctx context.Context, req ReviewReq) (ReviewRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.ReviewID = strings.TrimSpace(req.ReviewID)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.State = strings.TrimSpace(req.State)
	req.Summary = strings.TrimSpace(req.Summary)
	req.Items = reviewItems(req.Items)
	req.Suggestions = clean(req.Suggestions)
	if req.WorkspacePath == "" {
		return ReviewRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	if req.Summary == "" {
		return ReviewRow{}, fmt.Errorf("%w: summary is required", ErrInput)
	}
	if len(req.Items) == 0 {
		return ReviewRow{}, fmt.Errorf("%w: items is required", ErrInput)
	}
	for _, item := range req.Items {
		if item.Name == "" {
			return ReviewRow{}, fmt.Errorf("%w: review item name is required", ErrInput)
		}
		if item.Detail == "" {
			return ReviewRow{}, fmt.Errorf("%w: review item detail is required", ErrInput)
		}
		if !reviewStatus(item.Status) {
			return ReviewRow{}, fmt.Errorf("%w: invalid review item status", ErrInput)
		}
	}
	state := reviewState(req.Items)
	if req.State == "" {
		req.State = state
	}
	if !reviewStatus(req.State) || req.State == "warning" {
		return ReviewRow{}, fmt.Errorf("%w: invalid review state", ErrInput)
	}
	if req.State != state {
		return ReviewRow{}, fmt.Errorf("%w: review state does not match items", ErrInput)
	}
	body, err := json.Marshal(req.Items)
	if err != nil {
		return ReviewRow{}, err
	}
	tips, err := json.Marshal(req.Suggestions)
	if err != nil {
		return ReviewRow{}, err
	}
	explicit := req.SessionID != ""
	if !explicit {
		var err error
		req.SessionID, err = s.progressSession(ctx, req.WorkspacePath)
		if err != nil {
			return ReviewRow{}, err
		}
	}
	now := time.Now().UnixMilli()
	doc, err := db.Open()
	if err != nil {
		return ReviewRow{}, err
	}
	tx, err := doc.BeginTx(ctx, nil)
	if err != nil {
		return ReviewRow{}, err
	}
	defer tx.Rollback()
	if explicit {
		var workspace string
		err := tx.QueryRowContext(ctx, "select workspace_path from sessions where id = ?", req.SessionID).Scan(&workspace)
		if err == sql.ErrNoRows {
			return ReviewRow{}, fmt.Errorf("%w: session does not belong to workspace", ErrInput)
		}
		if err != nil {
			return ReviewRow{}, err
		}
		if workspace != req.WorkspacePath {
			return ReviewRow{}, fmt.Errorf("%w: session does not belong to workspace", ErrInput)
		}
	}

	id := "review_" + hash(fmt.Sprintf("%s\x00%s\x00%s", req.WorkspacePath, req.WorktreePath, req.ReviewID))
	if req.ReviewID == "" {
		id = "review_" + hash(fmt.Sprintf("%s\x00%s\x00%d\x00%s", req.WorkspacePath, req.WorktreePath, time.Now().UnixNano(), req.Summary))
	}
	if req.ReviewID == "" && req.State != "running" {
		prev, err := running(ctx, tx, req.WorkspacePath, req.WorktreePath)
		if err != nil {
			return ReviewRow{}, err
		}
		if prev.ID != "" {
			id = prev.ID
			req.ReviewID = prev.ReviewID
			if req.SessionID == "" {
				req.SessionID = prev.SessionID
			}
		}
	}
	prev, err := getReview(ctx, tx, id)
	if err != nil {
		return ReviewRow{}, err
	}
	if prev.ID != "" && prev.SessionID != "" && req.SessionID != "" && prev.SessionID != req.SessionID {
		return ReviewRow{}, fmt.Errorf("%w: review session does not match", ErrInput)
	}
	if prev.ID != "" && req.SessionID == "" {
		req.SessionID = prev.SessionID
	}
	row := ReviewRow{
		ID:            id,
		WorkspacePath: req.WorkspacePath,
		WorktreePath:  req.WorktreePath,
		ReviewID:      req.ReviewID,
		SessionID:     req.SessionID,
		State:         req.State,
		Summary:       req.Summary,
		Items:         req.Items,
		Suggestions:   req.Suggestions,
		UpdatedAt:     now,
	}
	if sameReview(prev, row) {
		return prev, nil
	}
	if prev.ID != "" && prev.State != "running" {
		return ReviewRow{}, fmt.Errorf("%w: terminal review cannot be changed", ErrInput)
	}
	if prev.ID != "" && req.State == "running" {
		return ReviewRow{}, fmt.Errorf("%w: running review cannot be changed", ErrInput)
	}
	_, err = tx.ExecContext(ctx, `insert into workspace_reviews(id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(id) do update set review_id = excluded.review_id, session_id = excluded.session_id, state = excluded.state, summary = excluded.summary, items = excluded.items, suggestions = excluded.suggestions, updated_at = excluded.updated_at`,
		row.ID, row.WorkspacePath, row.WorktreePath, row.ReviewID, row.SessionID, row.State, row.Summary, string(body), string(tips), row.UpdatedAt)
	if err != nil {
		return ReviewRow{}, err
	}
	var event *ProgressEvent
	if row.SessionID != "" {
		round, err := reviewRound(ctx, tx, row.WorkspacePath, row.SessionID, row.State)
		if err != nil {
			return ReviewRow{}, err
		}
		if row.State != "running" && prev.ID != "" {
			value, err := savedRound(ctx, tx, row.ID)
			if err != nil {
				return ReviewRow{}, err
			}
			if value > 0 {
				round = value
			}
		}
		payload, err := json.Marshal(map[string]any{"reviewId": row.ReviewID, "round": round})
		if err != nil {
			return ReviewRow{}, err
		}
		item := ProgressEvent{
			ID:            "progress_" + hash(row.ID+"\x00"+row.State),
			WorkspacePath: row.WorkspacePath,
			SessionID:     row.SessionID,
			Kind:          progressKindReview(row.State),
			State:         progressState(row.State),
			Title:         reviewTitle(round, row.State),
			Detail:        row.Summary,
			Source:        "service",
			Payload:       payload,
			CreatedAt:     now,
		}
		if err := putProgress(ctx, tx, item); err != nil {
			return ReviewRow{}, err
		}
		event = &item
	}
	if err := tx.Commit(); err != nil {
		return ReviewRow{}, err
	}
	if event != nil && s.evt != nil {
		if msg, err := json.Marshal(event); err == nil {
			s.evt(ctx, "progress.updated", msg)
		}
	}
	return row, nil
}

func (s *Service) AppendProgress(ctx context.Context, req ProgressAppend) (ProgressEvent, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.Kind = strings.TrimSpace(req.Kind)
	req.State = strings.TrimSpace(req.State)
	req.Title = strings.TrimSpace(req.Title)
	req.Detail = strings.TrimSpace(req.Detail)
	req.Source = strings.TrimSpace(req.Source)
	if req.WorkspacePath == "" {
		return ProgressEvent{}, fmt.Errorf("workspacePath is required")
	}
	if req.Kind == "" {
		return ProgressEvent{}, fmt.Errorf("kind is required")
	}
	if req.State == "" {
		req.State = "done"
	}
	if req.Title == "" {
		req.Title = req.Kind
	}
	if req.Source == "" {
		req.Source = "service"
	}
	if req.SessionID == "" {
		id, err := s.progressSession(ctx, req.WorkspacePath)
		if err != nil {
			return ProgressEvent{}, err
		}
		req.SessionID = id
	}
	if req.SessionID == "" {
		return ProgressEvent{}, fmt.Errorf("sessionId is required")
	}
	now := time.Now().UnixMilli()
	row := ProgressEvent{
		ID:            "progress_" + hash(fmt.Sprintf("%s\x00%s\x00%s\x00%d", req.WorkspacePath, req.SessionID, req.Kind, now)),
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		Kind:          req.Kind,
		State:         req.State,
		Title:         req.Title,
		Detail:        req.Detail,
		Source:        req.Source,
		Payload:       req.Payload,
		CreatedAt:     now,
	}
	doc, err := db.Open()
	if err != nil {
		return ProgressEvent{}, err
	}
	tx, err := doc.BeginTx(ctx, nil)
	if err != nil {
		return ProgressEvent{}, err
	}
	defer tx.Rollback()

	// 做时间上的幂等处理 2秒内
	prev, ok, err := s.lastProgress(ctx, tx, row)
	if err != nil {
		return ProgressEvent{}, err
	}
	if ok && time.Duration(row.CreatedAt-prev.CreatedAt)*time.Millisecond <= progressDedupeWindow {
		slog.Info("workbench progress duplicate ignored",
			"workspace_path", row.WorkspacePath,
			"session_id", row.SessionID,
			"kind", row.Kind,
			"state", row.State,
			"title", row.Title,
			"source", row.Source,
			"prev_id", prev.ID,
		)
		if err := tx.Commit(); err != nil {
			return ProgressEvent{}, err
		}
		return prev, nil
	}
	if err := s.writeProgress(ctx, tx, row); err != nil {
		return ProgressEvent{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProgressEvent{}, err
	}
	if s.evt != nil {
		msg, err := json.Marshal(row)
		if err == nil {
			s.evt(ctx, "progress.updated", msg)
		}
	}
	return row, nil
}

func (s *Service) lastProgress(ctx context.Context, doc *sql.Tx, row ProgressEvent) (ProgressEvent, bool, error) {
	prev, err := scanProgress(doc.QueryRowContext(ctx, `select id, workspace_path, session_id, kind, state, title, detail, source, payload, created_at from session_progress_events where workspace_path = ? and session_id = ? and kind = ? and state = ? and title = ? and detail = ? and source = ? order by created_at desc limit 1`,
		row.WorkspacePath, row.SessionID, row.Kind, row.State, row.Title, row.Detail, row.Source))
	if err == sql.ErrNoRows {
		return ProgressEvent{}, false, nil
	}
	if err != nil {
		return ProgressEvent{}, false, err
	}
	return prev, true, nil
}

func (s *Service) ListProgress(ctx context.Context, req ProgressList) (ProgressList, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" {
		return ProgressList{}, fmt.Errorf("workspacePath is required")
	}
	if req.SessionID == "" {
		id, err := s.progressSession(ctx, req.WorkspacePath)
		if err != nil {
			return ProgressList{}, err
		}
		req.SessionID = id
	}
	if req.SessionID == "" {
		return ProgressList{WorkspacePath: req.WorkspacePath}, nil
	}
	doc, err := db.Open()
	if err != nil {
		return ProgressList{}, err
	}
	rows, err := doc.QueryContext(ctx, `select id, workspace_path, session_id, kind, state, title, detail, source, payload, created_at from session_progress_events where workspace_path = ? and session_id = ? order by created_at asc`,
		req.WorkspacePath, req.SessionID)
	if err != nil {
		return ProgressList{}, err
	}
	defer rows.Close()

	out := ProgressList{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
	}
	for rows.Next() {
		row, err := scanProgress(rows)
		if err != nil {
			return ProgressList{}, err
		}
		out.Events = append(out.Events, row)
	}
	if err := rows.Err(); err != nil {
		return ProgressList{}, err
	}
	return out, nil
}

func (s *Service) writeProgress(ctx context.Context, doc *sql.Tx, row ProgressEvent) error {
	body, err := json.Marshal(row.Payload)
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into session_progress_events(id, workspace_path, session_id, kind, state, title, detail, source, payload, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ID, row.WorkspacePath, row.SessionID, row.Kind, row.State, row.Title, row.Detail, row.Source, string(body), row.CreatedAt)
	return err
}

func putProgress(ctx context.Context, doc *sql.Tx, row ProgressEvent) error {
	body, err := json.Marshal(row.Payload)
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into session_progress_events(id, workspace_path, session_id, kind, state, title, detail, source, payload, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(id) do update set workspace_path = excluded.workspace_path, session_id = excluded.session_id, kind = excluded.kind, state = excluded.state, title = excluded.title, detail = excluded.detail, source = excluded.source, payload = excluded.payload, created_at = excluded.created_at`,
		row.ID, row.WorkspacePath, row.SessionID, row.Kind, row.State, row.Title, row.Detail, row.Source, string(body), row.CreatedAt)
	return err
}

func (s *Service) InitProjectState(ctx context.Context, req ProjectStateInitReq) (ProjectStateRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.Project = strings.TrimSpace(req.Project)
	req.Phase = strings.TrimSpace(req.Phase)
	req.Status = strings.TrimSpace(req.Status)
	req.Current = strings.TrimSpace(req.Current)
	req.Summary = strings.TrimSpace(req.Summary)
	req.Next = clean(req.Next)
	req.Risks = clean(req.Risks)
	req.Features = cleanTasks(req.Features)
	if req.WorkspacePath == "" {
		return ProjectStateRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	files := projectFilesFor(req.WorkspacePath)
	if _, err := os.Stat(files.dir); err == nil {
		return ProjectStateRow{}, fmt.Errorf(".project-state already exists")
	}
	if err := os.MkdirAll(files.dir, 0o755); err != nil {
		return ProjectStateRow{}, err
	}
	row := seedProjectState(req.WorkspacePath, req.WorktreePath, req.Project, req.Phase, req.Status, req.Current, req.Summary, req.Next, req.Risks, req.SessionID, req.Verified, req.Dirty, req.Features)
	if err := writeProjectState(files, row, true); err != nil {
		return ProjectStateRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		session: row.SessionID,
		kind:    "workspace.state.init",
		state:   "done",
		title:   "初始化工作区状态",
		detail:  row.Current,
		source:  "service",
	}); err != nil {
		return ProjectStateRow{}, err
	}
	return row, nil
}

func (s *Service) ResumeProjectState(ctx context.Context, req ProjectStateGet) (ProjectStateRow, error) {
	_ = ctx
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return ProjectStateRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	row, err := loadProjectState(req.WorkspacePath, req.WorktreePath, true)
	if err != nil {
		return ProjectStateRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		session: row.SessionID,
		kind:    "workspace.state.resume",
		state:   "done",
		title:   "恢复工作区状态",
		detail:  row.Current,
		source:  "service",
	}); err != nil {
		return ProjectStateRow{}, err
	}
	return row, nil
}

func (s *Service) GetProjectState(ctx context.Context, req ProjectStateGet) (ProjectStateRow, error) {
	_ = ctx
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return ProjectStateRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	return loadProjectState(req.WorkspacePath, req.WorktreePath, false)
}

func (s *Service) SaveProjectState(ctx context.Context, req ProjectStateSaveReq) (ProjectStateRow, error) {
	_ = ctx
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.Phase = strings.TrimSpace(req.Phase)
	req.Status = strings.TrimSpace(req.Status)
	req.Current = strings.TrimSpace(req.Current)
	req.Summary = strings.TrimSpace(req.Summary)
	req.Next = clean(req.Next)
	req.Risks = clean(req.Risks)
	req.Features = cleanTasks(req.Features)
	if req.WorkspacePath == "" {
		return ProjectStateRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	row, err := loadProjectState(req.WorkspacePath, req.WorktreePath, true)
	if err != nil {
		return ProjectStateRow{}, err
	}
	row.Phase = pick(req.Phase, row.Phase, "implementation")
	row.Status = projectStatus(pick(req.Status, row.Status, "in-progress"))
	row.Current = pick(req.Current, row.Current)
	row.Summary = pick(req.Summary, row.Summary)
	row.Next = pickList(req.Next, row.Next)
	row.Risks = pickList(req.Risks, row.Risks)
	row.SessionID = pick(req.SessionID, row.SessionID)
	row.Verified = pickBool(req.Verified, row.Verified)
	row.Dirty = pickBool(req.Dirty, false)
	row.UpdatedAt = time.Now().UnixMilli()
	if len(req.Features) > 0 {
		row.Features = req.Features
	}
	slog.Info("workbench save project state",
		"workspace_path", req.WorkspacePath,
		"worktree_path", req.WorktreePath,
		"session_id", row.SessionID,
		"phase", row.Phase,
		"status", row.Status,
		"current_hash", hash(row.Current),
		"summary_hash", hash(row.Summary),
	)
	if err := writeProjectState(projectFilesFor(req.WorkspacePath), row, false); err != nil {
		return ProjectStateRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		session: row.SessionID,
		kind:    "workspace.state.save",
		state:   "done",
		title:   "保存工作区状态",
		detail:  row.Summary,
		source:  "service",
	}); err != nil {
		return ProjectStateRow{}, err
	}
	return row, nil
}

func (s *Service) ValidateProjectState(ctx context.Context, req ProjectStateGet) (ProjectStateRow, error) {
	_ = ctx
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.WorktreePath = strings.TrimSpace(req.WorktreePath)
	if req.WorkspacePath == "" {
		return ProjectStateRow{}, fmt.Errorf("workspacePath is required")
	}
	if req.WorktreePath == "" {
		req.WorktreePath = req.WorkspacePath
	}
	row, err := loadProjectState(req.WorkspacePath, req.WorktreePath, true)
	if err != nil {
		return ProjectStateRow{}, err
	}
	if err := s.pushProgress(ctx, req.WorkspacePath, progressInput{
		session: row.SessionID,
		kind:    "workspace.state.validate",
		state:   "done",
		title:   "校验工作区状态",
		detail:  row.Project,
		source:  "service",
	}); err != nil {
		return ProjectStateRow{}, err
	}
	return row, nil
}

func (s *Service) saveFlow(ctx context.Context, row FlowchartRow) error {
	doc, err := db.Open()
	if err != nil {
		return err
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_flowcharts(workspace_path, worktree_path, analysis_hash, state, code, err, manual, source, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set analysis_hash = excluded.analysis_hash, state = excluded.state, code = excluded.code, err = excluded.err, manual = excluded.manual, source = excluded.source, updated_at = excluded.updated_at`,
		row.WorkspacePath, row.WorktreePath, row.AnalysisHash, row.State, row.Code, row.Err, row.Manual, row.Source, row.UpdatedAt)
	return err
}

type progressInput struct {
	session string
	kind    string
	state   string
	title   string
	detail  string
	source  string
}

func progressKindAnalysis(state string) string {
	if state == "running" {
		return "analysis.start"
	}
	return "analysis.done"
}

func progressKindFlowchart(state string) string {
	if state == "generating" {
		return "flowchart.start"
	}
	if state == "error" {
		return "flowchart.error"
	}
	return "flowchart.done"
}

func progressKindReview(state string) string {
	if state == "running" {
		return "review.start"
	}
	if state == "error" {
		return "review.error"
	}
	return "review.done"
}

func progressState(state string) string {
	if state == "running" || state == "generating" {
		return "running"
	}
	if state == "error" || state == "failed" {
		return "error"
	}
	return "done"
}

func reviewTitle(round int, state string) string {
	if state == "running" {
		return fmt.Sprintf("开始第%d轮审查", round)
	}
	if state == "error" {
		return fmt.Sprintf("第%d轮审查异常", round)
	}
	return fmt.Sprintf("第%d轮审查结束", round)
}

func reviewRound(ctx context.Context, doc queryer, workspace string, session string, state string) (int, error) {
	if session == "" {
		return 1, nil
	}
	var count int
	err := doc.QueryRowContext(ctx, `select count(*) from session_progress_events where workspace_path = ? and session_id = ? and kind = ?`,
		workspace, session, "review.start").Scan(&count)
	if err != nil {
		return 0, err
	}
	if state == "running" {
		return count + 1, nil
	}
	if count > 0 {
		return count, nil
	}
	err = doc.QueryRowContext(ctx, `select count(*) from session_progress_events where workspace_path = ? and session_id = ? and kind in ('review.done', 'review.error')`,
		workspace, session).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count + 1, nil
}

func savedRound(ctx context.Context, doc queryer, id string) (int, error) {
	var body string
	err := doc.QueryRowContext(ctx, "select payload from session_progress_events where id = ?", "progress_"+hash(id+"\x00running")).Scan(&body)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	data := struct {
		Round int `json:"round"`
	}{}
	if err := json.Unmarshal([]byte(body), &data); err != nil {
		return 0, nil
	}
	return data.Round, nil
}

func pickSummary(text string, list []string) string {
	if strings.TrimSpace(text) != "" {
		return strings.TrimSpace(text)
	}
	return strings.Join(clean(list), "; ")
}

func flowTitle(row FlowchartRow) string {
	if row.State == "generating" {
		return "开始生成流程图"
	}
	if row.State == "error" {
		return "流程图生成失败"
	}
	if row.Manual || row.Source == "manual" {
		return "手动保存流程图"
	}
	return "保存 AI 流程图"
}

func (s *Service) pushProgress(ctx context.Context, workspace string, input progressInput) error {
	session := strings.TrimSpace(input.session)
	if session == "" {
		var err error
		session, err = s.progressSession(ctx, workspace)
		if err != nil {
			return err
		}
	}
	if session == "" {
		return nil
	}
	slog.Info("workbench push progress",
		"workspace_path", workspace,
		"session_id", session,
		"kind", input.kind,
		"state", input.state,
		"title", input.title,
		"source", input.source,
		"detail_hash", hash(input.detail),
	)
	_, err := s.AppendProgress(ctx, ProgressAppend{
		WorkspacePath: workspace,
		SessionID:     session,
		Kind:          input.kind,
		State:         input.state,
		Title:         input.title,
		Detail:        input.detail,
		Source:        input.source,
	})
	return err
}

func (s *Service) progressSession(ctx context.Context, workspace string) (string, error) {
	row, err := loadProjectState(workspace, workspace, false)
	if err == nil {
		session := strings.TrimSpace(row.SessionID)
		if session != "" {
			return session, nil
		}
	}
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		return "", err
	}
	return s.currentSession(ctx, workspace)
}

func (s *Service) currentSession(ctx context.Context, workspace string) (string, error) {
	doc, err := db.Open()
	if err != nil {
		return "", err
	}
	var id string
	err = doc.QueryRowContext(ctx, `select id from sessions where workspace_path = ? order by updated_at desc limit 1`, strings.TrimSpace(workspace)).Scan(&id)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(id), nil
}

func scanProgress(rows scanner) (ProgressEvent, error) {
	var row ProgressEvent
	var body string
	if err := rows.Scan(&row.ID, &row.WorkspacePath, &row.SessionID, &row.Kind, &row.State, &row.Title, &row.Detail, &row.Source, &body, &row.CreatedAt); err != nil {
		return ProgressEvent{}, err
	}
	if strings.TrimSpace(body) != "" {
		_ = json.Unmarshal([]byte(body), &row.Payload)
	}
	return row, nil
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
	if _, err := s.AppendProgress(ctx, ProgressAppend{
		WorkspacePath: req.WorkspacePath,
		SessionID:     meta.ID,
		Kind:          "session.created",
		State:         "done",
		Title:         "创建会话",
		Detail:        req.Title,
		Source:        "service",
	}); err != nil {
		return err
	}
	if len(req.Requirements) > 0 || len(req.Analysis) > 0 {
		detail := strings.Join(clean(req.Requirements), "; ")
		if detail == "" {
			detail = "session created with analysis"
		}
		if _, err := s.AppendProgress(ctx, ProgressAppend{
			WorkspacePath: req.WorkspacePath,
			SessionID:     meta.ID,
			Kind:          "requirements.identified",
			State:         "done",
			Title:         "需求分析",
			Detail:        detail,
			Source:        "service",
		}); err != nil {
			return err
		}
	}
	if req.Requirements == nil {
		return nil
	}
	return saveReqs(ctx, doc, req.WorkspacePath, meta.ID, req.Requirements, now)
}

func (s *Service) submit(ctx context.Context, req SessionCreate, session json.RawMessage) error {
	if len(req.Requirements) == 0 || s.chain == nil {
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
	msg := brief(req.Requirements)
	prompt := modelchain.Prompt{
		WorkspacePath: req.WorkspacePath,
		SessionID:     meta.ID,
		Agent:         "smartx-helper",
		Parts: []map[string]any{{
			"type": "text",
			"text": msg,
		}},
	}
	if err := s.chain.Prompt(ctx, prompt); err != nil {
		return err
	}
	if s.q != nil {
		_, _ = s.q.Append(question.Entry{
			WorkspacePath: req.WorkspacePath,
			SessionID:     meta.ID,
			MessageID:     prompt.MessageID,
			Body:          msg,
		})
	}
	return nil
}

type scanner interface {
	Scan(...any) error
}

type queryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type execer interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
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

func scanReview(rows scanner) (ReviewRow, error) {
	var row ReviewRow
	var items string
	var tips string
	if err := rows.Scan(&row.ID, &row.WorkspacePath, &row.WorktreePath, &row.ReviewID, &row.SessionID, &row.State, &row.Summary, &items, &tips, &row.UpdatedAt); err != nil {
		return ReviewRow{}, err
	}
	if err := json.Unmarshal([]byte(items), &row.Items); err != nil {
		return ReviewRow{}, err
	}
	if err := json.Unmarshal([]byte(tips), &row.Suggestions); err != nil {
		return ReviewRow{}, err
	}
	row.Items = reviewItems(row.Items)
	row.Suggestions = clean(row.Suggestions)
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

func saveReqs(ctx context.Context, doc execer, workspace string, id string, reqs []string, now int64) error {
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

func reviewItems(list []ReviewItem) []ReviewItem {
	out := make([]ReviewItem, 0, len(list))
	for _, item := range list {
		item.Name = strings.TrimSpace(item.Name)
		item.Status = strings.TrimSpace(item.Status)
		item.Detail = strings.TrimSpace(item.Detail)
		item.Suggestion = strings.TrimSpace(item.Suggestion)
		out = append(out, item)
	}
	return out
}

func reviewState(list []ReviewItem) string {
	state := "passed"
	for _, item := range list {
		if item.Status == "error" {
			return "error"
		}
		if item.Status == "failed" || item.Status == "warning" {
			state = "failed"
			continue
		}
		if item.Status == "running" && state == "passed" {
			state = "running"
		}
	}
	return state
}

func reviewStatus(state string) bool {
	return state == "running" || state == "passed" || state == "failed" || state == "warning" || state == "error"
}

func getReview(ctx context.Context, doc queryer, id string) (ReviewRow, error) {
	row, err := scanReview(doc.QueryRowContext(ctx, `select id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at from workspace_reviews where id = ?`, id))
	if err == sql.ErrNoRows {
		return ReviewRow{}, nil
	}
	return row, err
}

func sameReview(a ReviewRow, b ReviewRow) bool {
	return a.ID != "" &&
		a.ID == b.ID &&
		a.WorkspacePath == b.WorkspacePath &&
		a.WorktreePath == b.WorktreePath &&
		a.ReviewID == b.ReviewID &&
		a.SessionID == b.SessionID &&
		a.State == b.State &&
		a.Summary == b.Summary &&
		slices.Equal(a.Items, b.Items) &&
		slices.Equal(a.Suggestions, b.Suggestions)
}

func items(text string) []string {
	var arr []string
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)
	if err := json.Unmarshal([]byte(text), &arr); err == nil {
		return logic(arr)
	}
	return []string{}
}

func logic(list []string) []string {
	out := list[:0]
	for _, item := range list {
		item = plain(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func plain(text string) string {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "- ")
	text = strings.TrimPrefix(text, "* ")
	text = strings.NewReplacer("`", "", "*", "", "_", "", "#", "", ">", "", "|", "", "[", "", "]", "").Replace(text)
	return strings.TrimSpace(text)
}

func numbered(list []string) string {
	out := []string{}
	for i, item := range clean(list) {
		out = append(out, fmt.Sprintf("%d. %s", i+1, item))
	}
	return strings.Join(out, "\n")
}

func serial(list []string) string {
	body, err := json.MarshalIndent(logic(list), "", "  ")
	if err != nil {
		return "[]"
	}
	return string(body)
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

func projectFilesFor(workspace string) projectFiles {
	dir := filepath.Join(workspace, ".project-state")
	return projectFiles{
		dir:      dir,
		state:    filepath.Join(dir, "state.json"),
		feature:  filepath.Join(dir, "feature-list.json"),
		progress: filepath.Join(dir, "progress.md"),
		log:      filepath.Join(dir, "session-log.md"),
	}
}

func loadProjectState(workspace string, worktree string, repair bool) (ProjectStateRow, error) {
	files := projectFilesFor(workspace)
	if _, err := os.Stat(files.dir); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ProjectStateRow{}, db.ErrNotFound
		}
		return ProjectStateRow{}, err
	}
	if repair {
		if err := repairProjectFiles(files); err != nil {
			return ProjectStateRow{}, err
		}
	}
	doc, err := readStateDoc(files.state)
	if err != nil {
		return ProjectStateRow{}, err
	}
	feature, err := readFeatureDoc(files.feature)
	if err != nil {
		return ProjectStateRow{}, err
	}
	return ProjectStateRow{
		WorkspacePath: workspace,
		WorktreePath:  worktree,
		Exists:        true,
		Project:       feature.Project,
		Phase:         doc.Phase,
		Status:        projectStatus(doc.Status),
		Current:       doc.Current,
		Summary:       doc.Summary,
		Next:          clean(doc.Next),
		Risks:         clean(doc.Risks),
		Verified:      doc.Verified,
		Dirty:         doc.Dirty,
		SessionID:     doc.SessionID,
		Features:      cleanTasks(feature.Features),
		UpdatedAt:     doc.UpdatedAt,
	}, nil
}

func writeProjectState(files projectFiles, row ProjectStateRow, fresh bool) error {
	if err := os.MkdirAll(files.dir, 0o755); err != nil {
		return err
	}
	created := date(row.UpdatedAt)
	if doc, err := readFeatureDoc(files.feature); err == nil && strings.TrimSpace(doc.Created) != "" {
		created = doc.Created
	}
	feature := projectFeatureDoc{
		Project:  pick(row.Project, filepath.Base(row.WorkspacePath)),
		Created:  created,
		Features: cleanTasks(row.Features),
	}
	if len(feature.Features) == 0 {
		feature.Features = []ProjectTask{{
			ID:           "1",
			Name:         pick(row.Current, "Initial task"),
			Description:  pick(row.Summary, "Initialize project memory"),
			Status:       "in-progress",
			Priority:     "high",
			Dependencies: []string{},
		}}
	}
	state := projectStateDoc{
		Phase:     pick(row.Phase, "implementation"),
		Status:    projectStatus(row.Status),
		Current:   row.Current,
		Summary:   row.Summary,
		Next:      clean(row.Next),
		Risks:     clean(row.Risks),
		Verified:  row.Verified,
		Dirty:     row.Dirty,
		SessionID: row.SessionID,
		UpdatedAt: row.UpdatedAt,
	}
	if err := writeJSON(files.feature, feature); err != nil {
		return err
	}
	if err := writeJSON(files.state, state); err != nil {
		return err
	}
	if err := os.WriteFile(files.progress, []byte(renderProgress(feature.Project, state, feature.Features)), 0o644); err != nil {
		return err
	}
	body := renderLog(feature.Project, state, fresh)
	if fresh {
		return os.WriteFile(files.log, []byte(body), 0o644)
	}
	prev, err := os.ReadFile(files.log)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if len(prev) == 0 {
		return os.WriteFile(files.log, []byte(body), 0o644)
	}
	next := strings.TrimRight(string(prev), "\r\n") + "\n\n" + body
	return os.WriteFile(files.log, []byte(next), 0o644)
}

func repairProjectFiles(files projectFiles) error {
	if err := os.MkdirAll(files.dir, 0o755); err != nil {
		return err
	}
	miss := []string{}
	for _, item := range projectStateRequired {
		if _, err := os.Stat(filepath.Join(files.dir, item)); errors.Is(err, os.ErrNotExist) {
			miss = append(miss, item)
		}
	}
	if len(miss) == 0 {
		return nil
	}
	row := seedProjectState(filepath.Dir(files.dir), filepath.Dir(files.dir), filepath.Base(filepath.Dir(files.dir)), "", "", "", "", nil, nil, "", nil, nil, nil)
	if _, err := os.Stat(files.state); err == nil {
		doc, err := readStateDoc(files.state)
		if err == nil {
			row.Phase = doc.Phase
			row.Status = doc.Status
			row.Current = doc.Current
			row.Summary = doc.Summary
			row.Next = doc.Next
			row.Risks = doc.Risks
			row.Verified = doc.Verified
			row.Dirty = doc.Dirty
			row.SessionID = doc.SessionID
			row.UpdatedAt = doc.UpdatedAt
		}
	}
	if _, err := os.Stat(files.feature); err == nil {
		doc, err := readFeatureDoc(files.feature)
		if err == nil {
			row.Project = doc.Project
			row.Features = doc.Features
		}
	}
	feature := projectFeatureDoc{
		Project:  pick(row.Project, filepath.Base(row.WorkspacePath)),
		Created:  date(row.UpdatedAt),
		Features: cleanTasks(row.Features),
	}
	if len(feature.Features) == 0 {
		feature.Features = []ProjectTask{{
			ID:           "1",
			Name:         pick(row.Current, "Initial task"),
			Description:  pick(row.Summary, "Initialize project memory"),
			Status:       "in-progress",
			Priority:     "high",
			Dependencies: []string{},
		}}
	}
	state := projectStateDoc{
		Phase:     pick(row.Phase, "implementation"),
		Status:    projectStatus(row.Status),
		Current:   row.Current,
		Summary:   row.Summary,
		Next:      clean(row.Next),
		Risks:     clean(row.Risks),
		Verified:  row.Verified,
		Dirty:     row.Dirty,
		SessionID: row.SessionID,
		UpdatedAt: row.UpdatedAt,
	}
	for _, item := range miss {
		switch item {
		case "feature-list.json":
			if err := writeJSON(files.feature, feature); err != nil {
				return err
			}
		case "state.json":
			if err := writeJSON(files.state, state); err != nil {
				return err
			}
		case "progress.md":
			if err := os.WriteFile(files.progress, []byte(renderProgress(feature.Project, state, feature.Features)), 0o644); err != nil {
				return err
			}
		case "session-log.md":
			if err := os.WriteFile(files.log, []byte(renderLog(feature.Project, state, true)), 0o644); err != nil {
				return err
			}
		}
	}
	return nil
}

func seedProjectState(workspace string, worktree string, project string, phase string, status string, current string, summary string, next []string, risks []string, session string, verified *bool, dirty *bool, features []ProjectTask) ProjectStateRow {
	return ProjectStateRow{
		WorkspacePath: workspace,
		WorktreePath:  worktree,
		Exists:        true,
		Project:       pick(project, filepath.Base(workspace)),
		Phase:         pick(phase, "implementation"),
		Status:        projectStatus(pick(status, "in-progress")),
		Current:       pick(current, "Initialize project memory"),
		Summary:       pick(summary, "Project state initialized"),
		Next:          pickList(next, []string{"Continue current SmartX task"}),
		Risks:         clean(risks),
		Verified:      pickBool(verified, false),
		Dirty:         pickBool(dirty, false),
		SessionID:     session,
		Features:      cleanTasks(features),
		UpdatedAt:     time.Now().UnixMilli(),
	}
}

func readStateDoc(file string) (projectStateDoc, error) {
	body, err := os.ReadFile(file)
	if err != nil {
		return projectStateDoc{}, err
	}
	out := projectStateDoc{}
	if err := json.Unmarshal(body, &out); err != nil {
		return projectStateDoc{}, err
	}
	out.Phase = pick(out.Phase, "implementation")
	out.Status = projectStatus(out.Status)
	out.Next = clean(out.Next)
	out.Risks = clean(out.Risks)
	return out, nil
}

func readFeatureDoc(file string) (projectFeatureDoc, error) {
	body, err := os.ReadFile(file)
	if err != nil {
		return projectFeatureDoc{}, err
	}
	out := projectFeatureDoc{}
	if err := json.Unmarshal(body, &out); err != nil {
		return projectFeatureDoc{}, err
	}
	out.Project = strings.TrimSpace(out.Project)
	out.Features = cleanTasks(out.Features)
	return out, nil
}

func writeJSON(file string, input any) error {
	body, err := json.MarshalIndent(input, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(file, append(body, '\n'), 0o644)
}

func renderProgress(project string, state projectStateDoc, features []ProjectTask) string {
	done := 0
	for _, item := range features {
		if item.Status == "done" {
			done++
		}
	}
	return strings.TrimSpace(fmt.Sprintf(`# 项目进度记录 - %s
## 最新状态
- 更新时间: %s
- 当前阶段: %s
- 完成进度: %d/%d 个任务
- 当前任务: %s
- 下一步: %s
- 风险: %s
- 验证状态: %s

## 注意事项

- 项目状态由 .project-state/ 维护
- 结束前需要同步最新交接信息
`, pick(project, "Unnamed Project"), stamp(state.UpdatedAt), pick(state.Phase, "implementation"), done, max(len(features), 1), pick(state.Current, "N/A"), join(state.Next), join(state.Risks), yes(state.Verified)))
}

func renderLog(project string, state projectStateDoc, fresh bool) string {
	title := "更新项目状态"
	if fresh {
		title = "初始化项目状态"
	}
	return strings.TrimSpace(fmt.Sprintf(`## %s

- 会话目标: %s
- 执行动作: %s
- 当前结果: %s
- 下一步: %s
- 风险或提醒: %s
`, stamp(state.UpdatedAt), title, title, pick(state.Summary, state.Current, "Project state updated"), join(state.Next), join(state.Risks)))
}

func cleanTasks(list []ProjectTask) []ProjectTask {
	out := list[:0]
	for i, item := range list {
		item.ID = pick(strings.TrimSpace(item.ID), fmt.Sprintf("%d", i+1))
		item.Name = strings.TrimSpace(item.Name)
		item.Description = strings.TrimSpace(item.Description)
		item.Status = taskStatus(item.Status)
		item.Priority = pick(strings.TrimSpace(item.Priority), "medium")
		item.Dependencies = clean(item.Dependencies)
		item.Notes = strings.TrimSpace(item.Notes)
		if item.Name == "" && item.Description == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func projectStatus(input string) string {
	switch strings.TrimSpace(input) {
	case "pending", "in-progress", "done", "blocked", "running", "ready":
		return strings.TrimSpace(input)
	default:
		return "in-progress"
	}
}

func taskStatus(input string) string {
	switch strings.TrimSpace(input) {
	case "pending", "in-progress", "done", "blocked":
		return strings.TrimSpace(input)
	default:
		return "in-progress"
	}
}

func pick(list ...string) string {
	for _, item := range list {
		item = strings.TrimSpace(item)
		if item != "" {
			return item
		}
	}
	return ""
}

func pickList(list []string, fallback []string) []string {
	if len(clean(list)) > 0 {
		return clean(list)
	}
	return clean(fallback)
}

func pickBool(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func date(ts int64) string {
	return time.UnixMilli(ts).Format("2006-01-02")
}

func stamp(ts int64) string {
	return time.UnixMilli(ts).Format("2006-01-02 15:04")
}

func yes(input bool) string {
	if input {
		return "已验证"
	}
	return "未验证"
}

func join(list []string) string {
	if len(list) == 0 {
		return "无"
	}
	return strings.Join(list, "; ")
}

func max(a int, b int) int {
	if a > b {
		return a
	}
	return b
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
