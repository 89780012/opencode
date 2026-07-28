package workbench

import (
	"context"
	"testing"
	"time"

	"strategy-service/internal/db"
)

func TestWorkflowLifecycle(t *testing.T) {
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	stamp := time.Now().UnixNano()
	workspace := t.TempDir()
	session := "workflow_session_" + hash(workspace)
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "workflow", stamp, stamp)
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{}
	row, err := svc.StartWorkflow(ctx, WorkflowStart{
		WorkspacePath: workspace,
		SessionID:     session,
		CodeRevision:  "code-1",
		Review:        true,
		Debug:         true,
		Backtest:      true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "review" || row.State != "requested" || row.Revision != 1 {
		t.Fatalf("start = %#v", row)
	}
	again, err := svc.StartWorkflow(ctx, WorkflowStart{
		WorkspacePath: workspace,
		SessionID:     session,
		CodeRevision:  "code-1",
		Review:        true,
		Debug:         true,
		Backtest:      true,
	})
	if err != nil || again.ID != row.ID || again.Revision != row.Revision {
		t.Fatalf("idempotent start = %#v, %v", again, err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "review", State: "dispatching"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "review", State: "running", ReviewRound: 1})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "review", State: "passed", ReviewRound: 1})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "debug", State: "requested"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{
		ID:              row.ID,
		WorkspacePath:   workspace,
		SessionID:       session,
		Stage:           "debug",
		State:           "running",
		DebugID:         "debug-1",
		DebugCursor:     map[string]int64{"strategy.log": 42},
		DebugRequestKey: "pipeline:debug:start",
	})
	if err != nil {
		t.Fatal(err)
	}
	restored, err := svc.GetWorkflow(ctx, WorkflowGet{WorkspacePath: workspace, SessionID: session})
	if err != nil || restored.DebugID != "debug-1" || restored.DebugCursor["strategy.log"] != 42 || restored.DebugRequestKey != "pipeline:debug:start" {
		t.Fatalf("restored debug = %#v, %v", restored, err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "debug", State: "passed"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "requested"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "dispatching"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "running", BacktestID: "bt-1"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflowBacktest(ctx, workspace, session, "bt-1", "done", "complete")
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "done" || row.State != "passed" || row.Revision != 11 {
		t.Fatalf("done = %#v", row)
	}
}

func TestWorkflowRejectsThirdFailedReviewContinuation(t *testing.T) {
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	stamp := time.Now().UnixNano()
	workspace := t.TempDir()
	session := "workflow_exhausted_" + hash(workspace)
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "workflow", stamp, stamp)
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{}
	row, err := svc.StartWorkflow(ctx, WorkflowStart{WorkspacePath: workspace, SessionID: session, CodeRevision: "code-1", Review: true, Debug: true})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "review", State: "review_exhausted", ReviewRound: 3})
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "debug", State: "requested"})
	if err == nil {
		t.Fatal("terminal review advanced to debug")
	}
}

func TestWorkflowCancelUsesPersistedStage(t *testing.T) {
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	workspace := t.TempDir()
	session := "workflow_cancel_" + hash(workspace)
	stamp := time.Now().UnixNano()
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "workflow", stamp, stamp)
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{}
	row, err := svc.StartWorkflow(ctx, WorkflowStart{WorkspacePath: workspace, SessionID: session, CodeRevision: "code-1", Debug: true})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "debug", State: "running", DebugID: "debug-cancel"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.CancelWorkflow(ctx, WorkflowGet{WorkspacePath: workspace, SessionID: session})
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "debug" || row.State != "paused" || row.ResumeState != "running" || row.Revision != 3 {
		t.Fatalf("paused = %#v", row)
	}
	again, err := svc.CancelWorkflow(ctx, WorkflowGet{WorkspacePath: workspace, SessionID: session})
	if err != nil || again.Revision != row.Revision {
		t.Fatalf("idempotent cancel = %#v, %v", again, err)
	}
	row, err = svc.ResumeWorkflow(ctx, WorkflowGet{WorkspacePath: workspace, SessionID: session})
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "debug" || row.State != "running" || row.ResumeState != "" || row.Revision != 4 {
		t.Fatalf("resumed = %#v", row)
	}
}

func TestWorkflowRejectsInvalidStageJump(t *testing.T) {
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	workspace := t.TempDir()
	session := "workflow_jump_" + hash(workspace)
	stamp := time.Now().UnixNano()
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "workflow", stamp, stamp)
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{}
	row, err := svc.StartWorkflow(ctx, WorkflowStart{WorkspacePath: workspace, SessionID: session, CodeRevision: "code-1", Review: true, Debug: true, Backtest: true})
	if err != nil {
		t.Fatal(err)
	}
	for _, next := range []WorkflowUpdate{
		{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "debug", State: "running"},
		{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "requested"},
		{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "done", State: "passed"},
	} {
		if _, err := svc.UpdateWorkflow(ctx, next); err == nil {
			t.Fatalf("invalid transition was accepted: %#v", next)
		}
	}
}

func TestWorkflowBacktestFailureKeepsStage(t *testing.T) {
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	workspace := t.TempDir()
	session := "workflow_backtest_failed_" + hash(workspace)
	stamp := time.Now().UnixNano()
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "workflow", stamp, stamp)
	if err != nil {
		t.Fatal(err)
	}
	svc := &Service{}
	row, err := svc.StartWorkflow(ctx, WorkflowStart{WorkspacePath: workspace, SessionID: session, CodeRevision: "code-1", Backtest: true})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "running", BacktestID: "bt-failed"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflowBacktest(ctx, workspace, session, "bt-failed", "failed", "backtest failed")
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "backtest" || row.State != "failed" || row.Error != "backtest failed" {
		t.Fatalf("failed = %#v", row)
	}
}
