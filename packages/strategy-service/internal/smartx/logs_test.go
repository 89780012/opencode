package smartx

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestWatchUsesDebugCursor(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "demo-local.log")
	old := "SyntaxError: old failure\n"
	if err := os.WriteFile(path, []byte(old), 0o600); err != nil {
		t.Fatal(err)
	}
	file, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := file.WriteString("strategy ready\n"); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	svc := New(Config{LogDir: dir})
	watch, err := svc.watch(context.Background(), "demo", 20, 3, 10*time.Millisecond, map[string]int64{path: int64(len(old))})
	if err != nil {
		t.Fatal(err)
	}
	body := strings.Join(watch.lines(), "\n")
	if strings.Contains(body, "old failure") || !strings.Contains(body, "strategy ready") {
		t.Fatalf("incremental logs = %q", body)
	}
	if issues := debugIssues(watch); len(issues) != 0 {
		t.Fatalf("old error leaked into issues: %#v", issues)
	}
}

func TestDebugIssuesClassifiesFatalLogs(t *testing.T) {
	watch := LogWatch{Logs: []LogTail{{Lines: []string{
		"Traceback (most recent call last):",
		"ModuleNotFoundError: No module named secret_path",
		"extension stopped unexpectedly",
	}}}}
	issues := debugIssues(watch)
	for _, want := range []string{"Python 运行异常", "模块导入失败", "策略异常退出"} {
		if !contains(issues, want) {
			t.Fatalf("issues = %#v, missing %q", issues, want)
		}
	}
	if strings.Contains(strings.Join(issues, "\n"), "secret_path") {
		t.Fatalf("issues leaked raw log: %#v", issues)
	}
}

func TestRestoreRebuildsDebugCursor(t *testing.T) {
	svc := New(Config{})
	cursor := map[string]int64{"strategy.log": 42}
	svc.Restore(Debug{ID: "debug-1", Name: "demo-local", Filter: "demo", Started: 10, Cursor: cursor})
	cursor["strategy.log"] = 99

	run, ok := svc.Debug("debug-1")
	if !ok || run.Name != "demo-local" || run.Filter != "demo" || run.Cursor["strategy.log"] != 42 {
		t.Fatalf("restored debug = %#v, %v", run, ok)
	}
	run.Cursor["strategy.log"] = 100
	again, _ := svc.Debug("debug-1")
	if again.Cursor["strategy.log"] != 42 {
		t.Fatalf("debug cursor was mutated through snapshot: %#v", again.Cursor)
	}
}
