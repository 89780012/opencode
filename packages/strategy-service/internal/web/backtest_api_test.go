package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"strategy-service/internal/backtest"

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
