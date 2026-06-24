package web

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"strategy-service/internal/db"

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
	for _, item := range list {
		row, ok := item.(map[string]any)
		if !ok {
			continue
		}
		name, _ := row["name"].(string)
		names[name] = true
	}
	for _, name := range []string{"init_project_state", "resume_project_state", "get_project_state", "save_project_state", "validate_project_state"} {
		if !names[name] {
			t.Fatalf("missing MCP tool %s", name)
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
