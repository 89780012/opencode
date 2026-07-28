package web

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

func TestWorkbenchRequirementsPut(t *testing.T) {
	gin.SetMode(gin.TestMode)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	path := t.TempDir()
	id := fmt.Sprintf("ses_web_requirements_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(context.Background(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`,
		id, path, "requirements", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_requirements where session_id = ?", id)
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
	})

	api := &API{bench: workbench.NewService(nil, nil, nil, "")}
	router := gin.New()
	api.Register(router)
	call := func(ctx context.Context, body string) *httptest.ResponseRecorder {
		t.Helper()
		rec := httptest.NewRecorder()
		req := httptest.NewRequestWithContext(ctx, http.MethodPut, "/api/workbench/requirements", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(rec, req)
		return rec
	}

	body, err := json.Marshal(workbench.RequirementsSave{
		WorkspacePath: path,
		SessionID:     id,
		Requirements:  []string{},
	})
	if err != nil {
		t.Fatal(err)
	}
	rec := call(context.Background(), string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusOK {
		t.Fatalf("envelope = %#v", out)
	}
	data, ok := out.Data.(map[string]any)
	if !ok {
		t.Fatalf("data is %T", out.Data)
	}
	items, ok := data["requirements"].([]any)
	if !ok || len(items) != 0 {
		t.Fatalf("requirements = %#v", data["requirements"])
	}

	for _, body := range []string{
		fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q}`, path, id),
		fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q,"requirements":null}`, path, id),
		fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q,"requirements":[" "]}`, path, id),
	} {
		rec = call(context.Background(), body)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
		}
	}

	for _, body := range []string{
		fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q,"requirements":[]}`, path, id+"-missing"),
		fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q,"requirements":["wrong"]}`, path+"-other", id),
	} {
		rec = call(context.Background(), body)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
		}
	}

	stored, err := api.bench.GetRequirements(context.Background(), workbench.RequirementsGet{WorkspacePath: path, SessionID: id})
	if err != nil {
		t.Fatal(err)
	}
	if stored.Requirements == nil || len(stored.Requirements) != 0 {
		t.Fatalf("requirements changed after rejected save: %#v", stored.Requirements)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	rec = call(ctx, string(body))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestWorkbenchWorkflowResumeReconcilesBacktest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name   string
		status string
		bt     string
		stage  string
		state  string
		err    string
	}{
		{name: "terminal", status: "done", bt: "remote", stage: "done", state: "passed"},
		{name: "unknown submission", status: "pending", stage: "backtest", state: "failed", err: "无法安全恢复"},
	} {
		t.Run(test.name, func(t *testing.T) {
			doc, err := db.Open()
			if err != nil {
				t.Fatal(err)
			}
			workspace := t.TempDir()
			session := fmt.Sprintf("ses_web_resume_%d", time.Now().UnixNano())
			run := fmt.Sprintf("bt_web_resume_%d", time.Now().UnixNano())
			now := time.Now().UnixMilli()
			_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, session, workspace, "resume", "{}", "", now, now)
			if err != nil {
				t.Fatal(err)
			}
			_, err = doc.ExecContext(t.Context(), `insert into backtest_runs(id, workspace_path, session_id, plugin_id, bt_id, status, config_json, started_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`, run, workspace, session, "plugin", test.bt, test.status, "{}", now, now)
			if err != nil {
				t.Fatal(err)
			}
			bench := workbench.NewService(nil, nil, nil, "")
			row, err := bench.StartWorkflow(t.Context(), workbench.WorkflowStart{
				WorkspacePath: workspace,
				SessionID:     session,
				CodeRevision:  "manual:resume",
				Backtest:      true,
			})
			if err != nil {
				t.Fatal(err)
			}
			row, err = bench.UpdateWorkflow(t.Context(), workbench.WorkflowUpdate{
				ID:            row.ID,
				WorkspacePath: workspace,
				SessionID:     session,
				Stage:         "backtest",
				State:         "running",
				BacktestID:    run,
			})
			if err != nil {
				t.Fatal(err)
			}
			row, err = bench.CancelWorkflow(t.Context(), workbench.WorkflowGet{WorkspacePath: workspace, SessionID: session})
			if err != nil {
				t.Fatal(err)
			}
			if row.State != "paused" || row.ResumeState != "running" {
				t.Fatalf("paused workflow = %#v", row)
			}

			back := backtest.NewService(nil)
			api := &API{bench: bench, back: back}
			t.Cleanup(func() {
				ctx, cancel := context.WithTimeout(context.Background(), time.Second)
				defer cancel()
				_ = back.Close(ctx)
				_, _ = doc.ExecContext(context.Background(), "delete from workflow_runs where session_id = ?", session)
				_, _ = doc.ExecContext(context.Background(), "delete from backtest_runs where session_id = ?", session)
				_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", session)
			})
			body := fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q}`, workspace, session)
			rec := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(rec)
			ctx.Request = httptest.NewRequest(http.MethodPut, "/api/workbench/workflow/resume", strings.NewReader(body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			api.workbenchWorkflowResume(ctx)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
			}

			got, err := bench.GetWorkflow(t.Context(), workbench.WorkflowGet{WorkspacePath: workspace, SessionID: session})
			if err != nil {
				t.Fatal(err)
			}
			if got.Stage != test.stage || got.State != test.state || !strings.Contains(got.Error, test.err) {
				t.Fatalf("resumed workflow = %#v", got)
			}
		})
	}
}
