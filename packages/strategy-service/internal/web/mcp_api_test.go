package web

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"
	"strategy-service/internal/smartx"
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

func TestMCPProjectStateToolsAreListed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	api := &API{}
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`))
	ctx.Request.Header.Set("Content-Type", "application/json")

	api.mcpPost(ctx)

	var body rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	result, ok := body.Result.(map[string]any)
	if !ok {
		t.Fatalf("result is %T", body.Result)
	}
	list, ok := result["tools"].([]any)
	if !ok {
		t.Fatalf("tools is %T", result["tools"])
	}
	names := map[string]bool{}
	var review map[string]any
	for _, item := range list {
		row, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name, _ := row["name"].(string)
		names[name] = true
		if name == "save_review" {
			review = row
		}
	}
	for _, name := range []string{
		"init_project_state",
		"resume_project_state",
		"get_project_state",
		"save_project_state",
		"validate_project_state",
		"run_backtest",
		"list_backtests",
		"get_backtest",
		"get_backtest_config",
		"save_review",
	} {
		if !names[name] {
			t.Fatalf("missing MCP tool %s", name)
		}
	}
	input, ok := review["inputSchema"].(map[string]any)
	if !ok {
		t.Fatalf("save_review input schema = %#v", review["inputSchema"])
	}
	required, ok := input["required"].([]any)
	if !ok {
		t.Fatalf("save_review required = %#v", input["required"])
	}
	got := map[string]bool{}
	for _, item := range required {
		name, _ := item.(string)
		got[name] = true
	}
	for _, name := range []string{"reviewId", "sessionId"} {
		if !got[name] {
			t.Fatalf("save_review missing required field %s", name)
		}
	}
}

func TestMCPSaveReviewMapsIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	workspace := filepath.Join(t.TempDir(), "mcp-review")
	session := fmt.Sprintf("ses_mcp_review_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, session, workspace, "review", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from session_progress_events where workspace_path = ?", workspace)
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_reviews where workspace_path = ?", workspace)
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", session)
	})
	api := &API{bench: workbench.NewService(nil, nil, nil, "")}
	body, err := json.Marshal(rpcReq{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "tools/call",
		Params: map[string]any{
			"name": "save_review",
			"arguments": map[string]any{
				"workspacePath": workspace,
				"worktreePath":  workspace,
				"reviewId":      "review-call-id",
				"sessionId":     session,
				"state":         "passed",
				"summary":       "审查通过",
				"items": []any{map[string]any{
					"name":   "完整性",
					"status": "passed",
					"detail": "实现完整",
				}},
				"suggestions": []any{},
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(string(body)))
	ctx.Request.Header.Set("Content-Type", "application/json")
	api.mcpPost(ctx)
	var out rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	result, ok := out.Result.(map[string]any)
	if !ok {
		t.Fatalf("result = %#v", out.Result)
	}
	row, ok := result["structuredContent"].(map[string]any)
	if !ok || row["reviewId"] != "review-call-id" || row["sessionId"] != session {
		t.Fatalf("structured content = %#v", result["structuredContent"])
	}
}

type backtestClient struct{}

func (backtestClient) Backtest(ctx context.Context, _ smartx.BacktestInput) (smartx.BacktestResult, error) {
	<-ctx.Done()
	return smartx.BacktestResult{}, ctx.Err()
}

func (backtestClient) BacktestProgress(ctx context.Context, _ smartx.ProgressInput) (smartx.ProgressResult, error) {
	<-ctx.Done()
	return smartx.ProgressResult{}, ctx.Err()
}

func TestMCPRunBacktestReturnsPendingAndIdempotentV1Result(t *testing.T) {
	gin.SetMode(gin.TestMode)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	workspace := filepath.Join(t.TempDir(), "mcp-backtest-local")
	session := fmt.Sprintf("ses_mcp_backtest_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, session, workspace, "mcp backtest", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	sessions := []string{session}
	svc := backtest.NewService(backtestClient{})
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		if err := svc.Close(ctx); err != nil {
			t.Error(err)
		}
		for _, id := range sessions {
			_, _ = doc.ExecContext(context.Background(), "delete from backtest_runs where session_id = ?", id)
			_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
		}
	})
	api := &API{back: svc}
	request := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "tools/call",
		"params": map[string]any{
			"name": "run_backtest",
			"arguments": map[string]any{
				"workspacePath": workspace,
				"sessionId":     session,
				"requestKey":    "ai:stable-call",
				"config": map[string]any{
					"startTime": "2026-01-01",
					"endTime":   "2026-02-01",
				},
			},
		},
	}
	invoke := func() map[string]any {
		t.Helper()
		body, err := json.Marshal(request)
		if err != nil {
			t.Fatal(err)
		}
		rec := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(rec)
		ctx.Request = httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(string(body)))
		ctx.Request.Header.Set("Content-Type", "application/json")
		api.mcpPost(ctx)

		var response rpcRes
		if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
			t.Fatal(err)
		}
		result, ok := response.Result.(map[string]any)
		if !ok {
			t.Fatalf("result is %T", response.Result)
		}
		content, ok := result["structuredContent"].(map[string]any)
		if !ok {
			t.Fatalf("structuredContent is %T", result["structuredContent"])
		}
		return content
	}

	runID := ""
	for idx, want := range []string{"created", "idempotent"} {
		content := invoke()
		if content["version"] != float64(1) || content["accepted"] != true || content["reason"] != want {
			t.Fatalf("structuredContent %d = %#v", idx, content)
		}
		run, ok := content["run"].(map[string]any)
		if !ok || run["status"] != "pending" || run["workspacePath"] != workspace || run["sessionId"] != session {
			t.Fatalf("run %d = %#v", idx, content["run"])
		}
		for _, key := range []string{"result", "dataFiles", "logPath", "pluginId", "requestKey"} {
			if _, ok := run[key]; ok {
				t.Fatalf("run %d leaked %s: %#v", idx, key, run)
			}
		}
		if idx == 0 {
			runID, _ = run["id"].(string)
		}
	}

	params := request["params"].(map[string]any)
	args := params["arguments"].(map[string]any)
	args["requestKey"] = "ai:new-call"
	active := invoke()
	if active["accepted"] != true || active["reason"] != "active" {
		t.Fatalf("active conflict = %#v", active)
	}
	run, ok := active["run"].(map[string]any)
	if !ok || run["id"] != runID {
		t.Fatalf("active run = %#v", active["run"])
	}

	params["name"] = "list_backtests"
	params["arguments"] = map[string]any{"workspacePath": workspace, "sessionId": session, "limit": 1}
	list := invoke()
	runs, ok := list["runs"].([]any)
	if !ok || len(runs) != 1 || list["workspacePath"] != workspace || list["sessionId"] != session {
		t.Fatalf("list = %#v", list)
	}
	brief, ok := runs[0].(map[string]any)
	if !ok || brief["id"] != runID {
		t.Fatalf("brief = %#v", runs[0])
	}
	for _, key := range []string{"config", "result", "summary", "dataFiles", "logPath", "pluginId", "requestKey"} {
		if _, ok := brief[key]; ok {
			t.Fatalf("brief leaked %s: %#v", key, brief)
		}
	}

	params["name"] = "get_backtest"
	params["arguments"] = map[string]any{"id": runID, "workspacePath": workspace, "sessionId": session}
	detail := invoke()
	item, ok := detail["run"].(map[string]any)
	if !ok || item["id"] != runID || item["hasResult"] != false {
		t.Fatalf("detail = %#v", detail)
	}
	for _, key := range []string{"result", "dataFiles", "logPath", "pluginId", "requestKey", "btId"} {
		if _, ok := item[key]; ok {
			t.Fatalf("detail leaked %s: %#v", key, item)
		}
	}

	params["name"] = "get_backtest_config"
	params["arguments"] = map[string]any{"workspacePath": workspace, "sessionId": session}
	config := invoke()
	if _, ok := config["config"].(map[string]any); !ok {
		t.Fatalf("config = %#v", config)
	}

	workspace2 := filepath.Join(t.TempDir(), "mcp-backtest-local")
	session2 := fmt.Sprintf("ses_mcp_backtest_busy_%d", time.Now().UnixNano())
	sessions = append(sessions, session2)
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, session2, workspace2, "mcp busy", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	params["name"] = "run_backtest"
	params["arguments"] = map[string]any{
		"workspacePath": workspace2,
		"sessionId":     session2,
		"requestKey":    "ai:busy-call",
		"config": map[string]any{
			"startTime": "2026-01-01",
			"endTime":   "2026-02-01",
		},
	}
	busy := invoke()
	if busy["accepted"] != false || busy["reason"] != "busy" {
		t.Fatalf("busy conflict = %#v", busy)
	}
	if _, ok := busy["run"]; ok {
		t.Fatalf("busy conflict leaked run = %#v", busy)
	}

	params["name"] = "get_backtest_config"
	params["arguments"] = map[string]any{"workspacePath": workspace2, "sessionId": session}
	bad := invoke()
	errBody, ok := bad["error"].(map[string]any)
	if !ok || errBody["code"] != "not_found" {
		t.Fatalf("cross-scope config = %#v", bad)
	}

	router := gin.New()
	api.Register(router)
	rec := httptest.NewRecorder()
	path := "/api/backtest/runs/" + url.PathEscape(runID) + "?workspacePath=" + url.QueryEscape(workspace) + "&sessionId=" + url.QueryEscape(session)
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	data, ok := out.Data.(map[string]any)
	if rec.Code != http.StatusOK || out.Code != http.StatusOK || !ok || data["id"] != runID {
		t.Fatalf("scoped detail = status:%d body:%s", rec.Code, rec.Body.String())
	}
}

func TestMCPBacktestErrorsAreStructuredAndSanitized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)

	mcpBacktestError(ctx, 1, errors.New(`open C:\\secret\\backtest.db: denied`))

	var response rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	result, ok := response.Result.(map[string]any)
	if !ok {
		t.Fatalf("result is %T", response.Result)
	}
	content, ok := result["structuredContent"].(map[string]any)
	if !ok {
		t.Fatalf("structuredContent is %T", result["structuredContent"])
	}
	if strings.Contains(rec.Body.String(), "secret") {
		t.Fatalf("internal error leaked: %s", rec.Body.String())
	}
	errBody, ok := content["error"].(map[string]any)
	if !ok || errBody["code"] != "internal_error" || errBody["message"] != "backtest request failed" {
		t.Fatalf("error = %#v", content["error"])
	}
}

func TestMCPBacktestPatchRejectsNulls(t *testing.T) {
	for _, args := range []map[string]any{
		{"config": nil},
		{"config": map[string]any{"cash": nil}},
	} {
		_, err := decodePatch(args)
		var input *backtest.Invalid
		if !errors.As(err, &input) || input.Code != "invalid_config" {
			t.Fatalf("decodePatch(%#v) error = %#v", args, err)
		}
	}
}

func TestMCPToolResultStructuredContentIsRecord(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)

	mcpToolResult(ctx, 1, "boom", nil, true)

	var body rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	result, ok := body.Result.(map[string]any)
	if !ok {
		t.Fatalf("result is %T", body.Result)
	}
	if _, ok := result["structuredContent"].(map[string]any); !ok {
		t.Fatalf("structuredContent is %T", result["structuredContent"])
	}
}

func TestMCPWorkbenchNotFoundStructuredContentIsRecord(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)

	mcpWorkbench(context.Background(), 1, ctx, func(context.Context) (any, error) {
		return nil, db.ErrNotFound
	})

	var body rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	result, ok := body.Result.(map[string]any)
	if !ok {
		t.Fatalf("result is %T", body.Result)
	}
	if _, ok := result["structuredContent"].(map[string]any); !ok {
		t.Fatalf("structuredContent is %T", result["structuredContent"])
	}
}

func TestMCPWorkbenchErrorStructuredContentIsRecord(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)

	mcpWorkbench(context.Background(), 1, ctx, func(context.Context) (any, error) {
		return nil, errors.New("save failed")
	})

	var body rpcRes
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	result, ok := body.Result.(map[string]any)
	if !ok {
		t.Fatalf("result is %T", body.Result)
	}
	content, ok := result["structuredContent"].(map[string]any)
	if !ok {
		t.Fatalf("structuredContent is %T", result["structuredContent"])
	}
	if content["error"] != "save failed" {
		t.Fatalf("unexpected error payload: %#v", content)
	}
}
