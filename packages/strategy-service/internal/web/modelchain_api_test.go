package web

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"strategy-service/internal/db"
	"strategy-service/internal/modelchain"
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

func TestModelChainPromptUsesSmartxHelper(t *testing.T) {
	req := modelchain.Prompt{Agent: "general"}
	helperAgent(&req)
	if req.Agent != helper {
		t.Fatalf("agent = %q", req.Agent)
	}
}

func TestModelChainPromptRejectsSessionMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	api := &API{chain: modelchain.NewService(nil)}
	router := gin.New()
	router.POST("/api/model-chain/session/:sessionId/prompt", api.modelChainPrompt)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/model-chain/session/path-session/prompt", strings.NewReader(`{
		"workspacePath":"workspace",
		"sessionId":"body-session",
		"parts":[{"type":"text","text":"review"}]
	}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestModelChainPromptRejectsWorkspaceMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	id := fmt.Sprintf("ses_model_chain_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, id, "workspace-one", "review", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
	})
	api := &API{
		chain: modelchain.NewService(nil),
		bench: workbench.NewService(nil, nil, nil, ""),
	}
	router := gin.New()
	router.POST("/api/model-chain/session/:sessionId/prompt", api.modelChainPrompt)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/model-chain/session/"+id+"/prompt", strings.NewReader(fmt.Sprintf(`{
		"workspacePath":"workspace-two",
		"sessionId":%q,
		"parts":[{"type":"text","text":"review"}]
	}`, id)))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestModelChainPromptPersistsIntakeBeforeModelFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	id := fmt.Sprintf("ses_model_chain_intake_%d", time.Now().UnixNano())
	path := t.TempDir()
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, id, path, "intake", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_requirement_receipts where session_id = ?", id)
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_requirements where session_id = ?", id)
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
	})
	bench := workbench.NewService(nil, nil, nil, "")
	api := &API{chain: modelchain.NewService(nil), bench: bench}
	router := gin.New()
	router.POST("/api/model-chain/session/:sessionId/prompt", api.modelChainPrompt)
	body := fmt.Sprintf(`{"workspacePath":%q,"sessionId":%q,"parts":[{"type":"text","text":"wrapped review"}],"intake":{"id":"request-1","text":"user requirement"}}`, path, id)
	for range 2 {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/model-chain/session/"+id+"/prompt", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
		}
	}
	row, err := bench.GetRequirements(t.Context(), workbench.RequirementsGet{WorkspacePath: path, SessionID: id})
	if err != nil {
		t.Fatal(err)
	}
	if len(row.Requirements) != 1 || row.Requirements[0] != "user requirement" {
		t.Fatalf("requirements = %#v", row.Requirements)
	}
}
