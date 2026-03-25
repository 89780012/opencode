package smartx

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestMeta(t *testing.T) {
	dir := t.TempDir()
	old := filepath.Join(dir, "other.log")
	hit := filepath.Join(dir, "test032201.log")
	if err := os.WriteFile(old, []byte("old\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	time.Sleep(20 * time.Millisecond)
	if err := os.WriteFile(hit, []byte("hit\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	svc := New(Config{LogDir: dir})
	out, err := svc.Meta("test032201", 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.Files) != 2 {
		t.Fatalf("got %d files", len(out.Files))
	}
	if out.Files[0].Path != hit {
		t.Fatalf("got %s want %s", out.Files[0].Path, hit)
	}
	if !out.Files[0].Match {
		t.Fatal("expected first file to match")
	}
}

func TestWatch(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "smartx.log")
	if err := os.WriteFile(path, []byte("boot\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	go func() {
		time.Sleep(150 * time.Millisecond)
		_ = os.WriteFile(path, []byte("boot\nruntime error\n"), 0o644)
	}()

	svc := New(Config{LogDir: dir})
	out, err := svc.Watch(context.Background(), "", 20, 3, 1200*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.Logs) != 1 {
		t.Fatalf("got %d logs", len(out.Logs))
	}
	body := strings.Join(out.Logs[0].Lines, "\n")
	if !strings.Contains(body, "runtime error") {
		t.Fatalf("got %q", body)
	}
}
