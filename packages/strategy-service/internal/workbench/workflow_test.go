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
	row, err = svc.UpdateWorkflow(ctx, WorkflowUpdate{ID: row.ID, WorkspacePath: workspace, SessionID: session, Stage: "backtest", State: "running", BacktestID: "bt-1"})
	if err != nil {
		t.Fatal(err)
	}
	row, err = svc.UpdateWorkflowBacktest(ctx, workspace, session, "bt-1", "done", "complete")
	if err != nil {
		t.Fatal(err)
	}
	if row.Stage != "done" || row.State != "passed" || row.Revision != 8 {
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
