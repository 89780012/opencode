package workbench

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"strategy-service/internal/db"
)

func (s *Service) StartWorkflow(ctx context.Context, req WorkflowStart) (WorkflowRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.CodeRevision = strings.TrimSpace(req.CodeRevision)
	if req.WorkspacePath == "" || req.SessionID == "" || req.CodeRevision == "" {
		return WorkflowRow{}, fmt.Errorf("%w: workflow scope and code revision are required", ErrInput)
	}
	if !req.Review && !req.Debug && !req.Backtest {
		return WorkflowRow{}, fmt.Errorf("%w: workflow has no enabled stage", ErrInput)
	}
	doc, err := db.Open()
	if err != nil {
		return WorkflowRow{}, err
	}
	if err := workflowSession(ctx, doc, req.WorkspacePath, req.SessionID); err != nil {
		return WorkflowRow{}, err
	}
	row, err := scanWorkflow(doc.QueryRowContext(ctx, workflowSelect+" where workspace_path = ? and session_id = ? and code_revision = ?", req.WorkspacePath, req.SessionID, req.CodeRevision))
	if err == nil {
		return row, nil
	}
	if err != sql.ErrNoRows {
		return WorkflowRow{}, err
	}
	now := time.Now().UnixMilli()
	row = WorkflowRow{
		ID:              "workflow_" + hash(req.WorkspacePath+"\x00"+req.SessionID+"\x00"+req.CodeRevision),
		WorkspacePath:   req.WorkspacePath,
		SessionID:       req.SessionID,
		CodeRevision:    req.CodeRevision,
		Stage:           workflowStage(req),
		State:           "requested",
		ReviewEnabled:   req.Review,
		DebugEnabled:    req.Debug,
		BacktestEnabled: req.Backtest,
		Revision:        1,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	_, err = doc.ExecContext(ctx, `insert into workflow_runs(id, workspace_path, session_id, code_revision, stage, state, review_round, debug_id, debug_cursor, debug_request_key, backtest_id, review_enabled, debug_enabled, backtest_enabled, summary, error, revision, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ID, row.WorkspacePath, row.SessionID, row.CodeRevision, row.Stage, row.State, row.ReviewRound, row.DebugID, workflowCursor(row.DebugCursor), row.DebugRequestKey, row.BacktestID, row.ReviewEnabled, row.DebugEnabled, row.BacktestEnabled, row.Summary, row.Error, row.Revision, row.CreatedAt, row.UpdatedAt)
	if err != nil {
		existing, load := scanWorkflow(doc.QueryRowContext(ctx, workflowSelect+" where workspace_path = ? and session_id = ? and code_revision = ?", req.WorkspacePath, req.SessionID, req.CodeRevision))
		if load == nil {
			return existing, nil
		}
		return WorkflowRow{}, err
	}
	s.emitWorkflow(ctx, row)
	return row, nil
}

func (s *Service) GetWorkflow(ctx context.Context, req WorkflowGet) (WorkflowRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" || req.SessionID == "" {
		return WorkflowRow{}, fmt.Errorf("%w: workflow scope is required", ErrInput)
	}
	doc, err := db.Open()
	if err != nil {
		return WorkflowRow{}, err
	}
	row, err := scanWorkflow(doc.QueryRowContext(ctx, workflowSelect+" where workspace_path = ? and session_id = ? order by updated_at desc limit 1", req.WorkspacePath, req.SessionID))
	if err == sql.ErrNoRows {
		return WorkflowRow{}, db.ErrNotFound
	}
	return row, err
}

// CancelWorkflow 按当前持久化阶段原子取消最新流程，避免客户端读写之间的阶段竞态。
func (s *Service) CancelWorkflow(ctx context.Context, req WorkflowGet) (WorkflowRow, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" || req.SessionID == "" {
		return WorkflowRow{}, fmt.Errorf("%w: workflow scope is required", ErrInput)
	}
	doc, err := db.Open()
	if err != nil {
		return WorkflowRow{}, err
	}
	row, err := scanWorkflow(doc.QueryRowContext(ctx, `update workflow_runs
set state = 'cancelled', error = ?, revision = revision + 1, updated_at = ?
where id = (
	select id from workflow_runs
	where workspace_path = ? and session_id = ?
	order by updated_at desc, created_at desc
	limit 1
)
and stage <> 'done'
and state not in ('failed', 'review_exhausted', 'cancelled')
returning `+fields, "用户已停止自动工作流。", time.Now().UnixMilli(), req.WorkspacePath, req.SessionID))
	if err == sql.ErrNoRows {
		return s.GetWorkflow(ctx, req)
	}
	if err != nil {
		return WorkflowRow{}, err
	}
	s.emitWorkflow(ctx, row)
	return row, nil
}

func (s *Service) UpdateWorkflow(ctx context.Context, req WorkflowUpdate) (WorkflowRow, error) {
	req.ID = strings.TrimSpace(req.ID)
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.Stage = strings.TrimSpace(req.Stage)
	req.State = strings.TrimSpace(req.State)
	if req.ID == "" || req.WorkspacePath == "" || req.SessionID == "" || !validWorkflow(req.Stage, req.State) {
		return WorkflowRow{}, fmt.Errorf("%w: invalid workflow update", ErrInput)
	}
	if req.ReviewRound < 0 || req.ReviewRound > 3 {
		return WorkflowRow{}, fmt.Errorf("%w: invalid review round", ErrInput)
	}
	doc, err := db.Open()
	if err != nil {
		return WorkflowRow{}, err
	}
	row, err := scanWorkflow(doc.QueryRowContext(ctx, workflowSelect+" where id = ? and workspace_path = ? and session_id = ?", req.ID, req.WorkspacePath, req.SessionID))
	if err == sql.ErrNoRows {
		return WorkflowRow{}, db.ErrNotFound
	}
	if err != nil {
		return WorkflowRow{}, err
	}
	if workflowRank(req.Stage) < workflowRank(row.Stage) {
		return WorkflowRow{}, fmt.Errorf("%w: workflow stage cannot move backwards", ErrInput)
	}
	if workflowTerminal(row) {
		if row.Stage == req.Stage && row.State == req.State {
			return row, nil
		}
		return WorkflowRow{}, fmt.Errorf("%w: workflow is terminal", ErrInput)
	}
	if req.ReviewRound > 0 {
		if req.ReviewRound < row.ReviewRound {
			return WorkflowRow{}, fmt.Errorf("%w: review round cannot move backwards", ErrInput)
		}
		row.ReviewRound = req.ReviewRound
	}
	row.Stage = req.Stage
	row.State = req.State
	row.DebugID = pick(req.DebugID, row.DebugID)
	if req.DebugCursor != nil {
		row.DebugCursor = req.DebugCursor
	}
	row.DebugRequestKey = pick(req.DebugRequestKey, row.DebugRequestKey)
	row.BacktestID = pick(req.BacktestID, row.BacktestID)
	row.Summary = pick(req.Summary, row.Summary)
	row.Error = pick(req.Error, row.Error)
	row.Revision++
	row.UpdatedAt = time.Now().UnixMilli()
	res, err := doc.ExecContext(ctx, `update workflow_runs set stage = ?, state = ?, review_round = ?, debug_id = ?, debug_cursor = ?, debug_request_key = ?, backtest_id = ?, summary = ?, error = ?, revision = ?, updated_at = ? where id = ? and revision = ?`,
		row.Stage, row.State, row.ReviewRound, row.DebugID, workflowCursor(row.DebugCursor), row.DebugRequestKey, row.BacktestID, row.Summary, row.Error, row.Revision, row.UpdatedAt, row.ID, row.Revision-1)
	if err != nil {
		return WorkflowRow{}, err
	}
	count, err := res.RowsAffected()
	if err != nil || count != 1 {
		return WorkflowRow{}, fmt.Errorf("workflow update conflict")
	}
	s.emitWorkflow(ctx, row)
	return row, nil
}

func (s *Service) UpdateWorkflowBacktest(ctx context.Context, workspace string, session string, id string, state string, detail string) (WorkflowRow, error) {
	doc, err := db.Open()
	if err != nil {
		return WorkflowRow{}, err
	}
	row, err := scanWorkflow(doc.QueryRowContext(ctx, workflowSelect+" where workspace_path = ? and session_id = ? and backtest_id = ? order by updated_at desc limit 1", strings.TrimSpace(workspace), strings.TrimSpace(session), strings.TrimSpace(id)))
	if err == sql.ErrNoRows {
		return WorkflowRow{}, db.ErrNotFound
	}
	if err != nil {
		return WorkflowRow{}, err
	}
	next := "running"
	stage := "backtest"
	if state == "done" {
		next = "passed"
		stage = "done"
	}
	if state == "failed" {
		next = "failed"
	}
	failure := ""
	if state == "failed" {
		failure = detail
	}
	return s.UpdateWorkflow(ctx, WorkflowUpdate{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Stage:         stage,
		State:         next,
		BacktestID:    id,
		Summary:       detail,
		Error:         failure,
	})
}

func (s *Service) emitWorkflow(ctx context.Context, row WorkflowRow) {
	if s.evt == nil {
		return
	}
	body, err := json.Marshal(row)
	if err == nil {
		s.evt(ctx, "workflow.updated", body)
	}
}

const fields = `id, workspace_path, session_id, code_revision, stage, state, review_round, debug_id, debug_cursor, debug_request_key, backtest_id, review_enabled, debug_enabled, backtest_enabled, summary, error, revision, created_at, updated_at`
const workflowSelect = `select ` + fields + ` from workflow_runs`

func scanWorkflow(row scanner) (WorkflowRow, error) {
	out := WorkflowRow{}
	var cursor string
	err := row.Scan(&out.ID, &out.WorkspacePath, &out.SessionID, &out.CodeRevision, &out.Stage, &out.State, &out.ReviewRound, &out.DebugID, &cursor, &out.DebugRequestKey, &out.BacktestID, &out.ReviewEnabled, &out.DebugEnabled, &out.BacktestEnabled, &out.Summary, &out.Error, &out.Revision, &out.CreatedAt, &out.UpdatedAt)
	if err == nil {
		err = json.Unmarshal([]byte(cursor), &out.DebugCursor)
	}
	return out, err
}

func workflowCursor(cursor map[string]int64) string {
	if cursor == nil {
		return "{}"
	}
	body, err := json.Marshal(cursor)
	if err != nil {
		return "{}"
	}
	return string(body)
}

func workflowSession(ctx context.Context, doc *sql.DB, workspace string, session string) error {
	var path string
	err := doc.QueryRowContext(ctx, "select workspace_path from sessions where id = ?", session).Scan(&path)
	if err == sql.ErrNoRows || path != workspace {
		return db.ErrNotFound
	}
	return err
}

func workflowStage(req WorkflowStart) string {
	if req.Review {
		return "review"
	}
	if req.Debug {
		return "debug"
	}
	return "backtest"
}

func validWorkflow(stage string, state string) bool {
	stages := map[string]bool{"review": true, "debug": true, "backtest": true, "done": true}
	states := map[string]bool{"requested": true, "dispatching": true, "running": true, "fixing": true, "passed": true, "failed": true, "review_exhausted": true, "cancelled": true}
	return stages[stage] && states[state]
}

func workflowRank(stage string) int {
	return map[string]int{"review": 1, "debug": 2, "backtest": 3, "done": 4}[stage]
}

func workflowTerminal(row WorkflowRow) bool {
	return row.Stage == "done" || row.State == "failed" || row.State == "review_exhausted" || row.State == "cancelled"
}
