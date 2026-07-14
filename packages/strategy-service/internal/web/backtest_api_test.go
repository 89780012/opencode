package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"

	"github.com/gin-gonic/gin"
)

func TestBacktestRunInvalidBodyUsesBusinessCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	api := &API{back: backtest.NewService(nil)}
	t.Cleanup(func() { _ = api.Close(t.Context()) })
	router := gin.New()
	api.Register(router)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/backtest/run", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("http status = %d", rec.Code)
	}
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusBadRequest {
		t.Fatalf("business code = %d", out.Code)
	}
}

func TestBacktestConflictUsesBusinessCodeAndReturnsRun(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	backError(ctx, &backtest.Conflict{Run: backtest.Run{ID: "existing"}})
	if rec.Code != http.StatusOK {
		t.Fatalf("http status = %d", rec.Code)
	}
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusConflict {
		t.Fatalf("business code = %d", out.Code)
	}
	data, ok := out.Data.(map[string]any)
	if !ok || data["id"] != "existing" {
		t.Fatalf("data = %#v", out.Data)
	}
}

func TestBacktestScopedGetRequiresBothScopeValues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	api := &API{back: backtest.NewService(nil)}
	t.Cleanup(func() { _ = api.Close(t.Context()) })
	router := gin.New()
	api.Register(router)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/backtest/runs/bt_test?workspacePath=workspace", nil)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("http status = %d", rec.Code)
	}
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusBadRequest {
		t.Fatalf("business code = %d", out.Code)
	}
}

func TestBacktestRunErrorsHideCrossScopeConflictsAndMapMissingSessions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	row := backtest.Run{
		ID: "private-run", WorkspacePath: "other", SessionID: "private-session", RequestKey: "secret-key",
		Result: json.RawMessage(`{"secret":true}`), LogPath: `C:\\private\\backtest.log`,
	}
	backRunError(ctx, &backtest.Conflict{Run: row}, backtest.RunReq{WorkspacePath: "workspace", SessionID: "session"})
	if strings.Contains(rec.Body.String(), "private") || strings.Contains(rec.Body.String(), "secret") {
		t.Fatalf("cross-scope conflict leaked: %s", rec.Body.String())
	}
	var out envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusConflict || out.Data != nil {
		t.Fatalf("conflict = %#v", out)
	}

	rec = httptest.NewRecorder()
	ctx, _ = gin.CreateTestContext(rec)
	backError(ctx, db.ErrNotFound)
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Code != http.StatusNotFound {
		t.Fatalf("not found = %#v", out)
	}
}
