package workspace

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCreateCopiesSkill(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("USERPROFILE", os.Getenv("HOME"))

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	file := filepath.Join(got.Workspace.Path, ".opencode", "skills", "strategy-service", "SKILL.md")
	_, err = os.Stat(file)
	if err != nil {
		t.Fatal(err)
	}
}

func TestListBackfillsSkill(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("USERPROFILE", os.Getenv("HOME"))

	root, err := base()
	if err != nil {
		t.Fatal(err)
	}

	dir := filepath.Join(root, "demo")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		t.Fatal(err)
	}

	svc := NewService()
	_, err = svc.List()
	if err != nil {
		t.Fatal(err)
	}

	file := filepath.Join(dir, ".opencode", "skills", "strategy-service", "SKILL.md")
	_, err = os.Stat(file)
	if err != nil {
		t.Fatal(err)
	}
}
