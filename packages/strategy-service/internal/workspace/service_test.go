package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func home(t *testing.T) {
	t.Helper()

	dir := t.TempDir()
	t.Setenv("HOME", dir)
	t.Setenv("USERPROFILE", dir)
}

func TestFilesSkipsNoise(t *testing.T) {
	home(t)

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	err = os.MkdirAll(filepath.Join(got.Workspace.Path, "node_modules", "pkg"), 0o755)
	if err != nil {
		t.Fatal(err)
	}
	err = os.MkdirAll(filepath.Join(got.Workspace.Path, "dist"), 0o755)
	if err != nil {
		t.Fatal(err)
	}
	err = os.MkdirAll(filepath.Join(got.Workspace.Path, "src"), 0o755)
	if err != nil {
		t.Fatal(err)
	}

	err = os.WriteFile(filepath.Join(got.Workspace.Path, "node_modules", "pkg", "index.js"), []byte("skip"), 0o644)
	if err != nil {
		t.Fatal(err)
	}
	err = os.WriteFile(filepath.Join(got.Workspace.Path, "dist", "main.js"), []byte("skip"), 0o644)
	if err != nil {
		t.Fatal(err)
	}
	err = os.WriteFile(filepath.Join(got.Workspace.Path, "src", "main.ts"), []byte("keep"), 0o644)
	if err != nil {
		t.Fatal(err)
	}

	files, err := svc.Files(got.Workspace.Path)
	if err != nil {
		t.Fatal(err)
	}

	hit := map[string]bool{}
	for _, item := range files.Files {
		hit[item.Path] = true
	}

	if hit["node_modules/pkg/index.js"] {
		t.Fatal("expected node_modules to be skipped")
	}
	if hit["dist/main.js"] {
		t.Fatal("expected dist to be skipped")
	}
	if !hit["src/main.ts"] {
		t.Fatal("expected src/main.ts to be listed")
	}
}

func TestContentPreview(t *testing.T) {
	home(t)

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	err = os.WriteFile(filepath.Join(got.Workspace.Path, "src", "big.txt"), []byte(strings.Repeat("a", limit+64)), 0o644)
	if err != nil {
		t.Fatal(err)
	}

	file, err := svc.Content(got.Workspace.Path, "src/big.txt")
	if err != nil {
		t.Fatal(err)
	}

	if !file.Previewable {
		t.Fatal("expected text file to be previewable")
	}
	if !file.Truncated {
		t.Fatal("expected big file to be truncated")
	}
	if file.Binary {
		t.Fatal("expected text file to be non-binary")
	}
	if file.Size <= int64(len(file.Content)) {
		t.Fatal("expected size to be larger than preview")
	}
	if len(file.Content) != limit {
		t.Fatalf("expected preview length %d, got %d", limit, len(file.Content))
	}
}

func TestContentBinary(t *testing.T) {
	home(t)

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	err = os.WriteFile(filepath.Join(got.Workspace.Path, "src", "bin.dat"), []byte{0, 1, 2, 3}, 0o644)
	if err != nil {
		t.Fatal(err)
	}

	file, err := svc.Content(got.Workspace.Path, "src/bin.dat")
	if err != nil {
		t.Fatal(err)
	}

	if file.Previewable {
		t.Fatal("expected binary file to be non-previewable")
	}
	if !file.Binary {
		t.Fatal("expected binary flag to be true")
	}
	if file.Reason != "binary" {
		t.Fatalf("expected binary reason, got %q", file.Reason)
	}
	if file.Content != "" {
		t.Fatal("expected no preview content for binary file")
	}
}

func TestContentRejectsEscape(t *testing.T) {
	home(t)

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	_, err = svc.Content(got.Workspace.Path, "../secret.txt")
	if err == nil {
		t.Fatal("expected path escape to fail")
	}
}
