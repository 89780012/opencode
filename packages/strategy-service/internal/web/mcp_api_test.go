package web

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"strategy-service/internal/db"

	"github.com/gin-gonic/gin"
)

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
