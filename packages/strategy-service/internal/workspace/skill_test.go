package workspace

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCreateCopiesAssets(t *testing.T) {
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

	root := filepath.Join(got.Workspace.Path, "start.py")
	_, err = os.Stat(root)
	if err != nil {
		t.Fatal(err)
	}

	src := filepath.Join(got.Workspace.Path, "src", "index.js")
	_, err = os.Stat(src)
	if err != nil {
		t.Fatal(err)
	}

	body, err := os.ReadFile(filepath.Join(got.Workspace.Path, "package.json"))
	if err != nil {
		t.Fatal(err)
	}

	pkg := map[string]any{}
	err = json.Unmarshal(body, &pkg)
	if err != nil {
		t.Fatal(err)
	}
	if pkg["name"] != "demo" {
		t.Fatalf("expected package name demo, got %v", pkg["name"])
	}
	if pkg["project_dir"] != got.Workspace.Path {
		t.Fatalf("expected project_dir %s, got %v", got.Workspace.Path, pkg["project_dir"])
	}

	agent := filepath.Join(got.Workspace.Path, ".opencode", "agents", "strategy.md")
	_, err = os.Stat(agent)
	if err != nil {
		t.Fatal(err)
	}
}

func TestListBackfillsAssets(t *testing.T) {
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

	_, err = os.Stat(filepath.Join(dir, "start.py"))
	if !os.IsNotExist(err) {
		t.Fatalf("expected no template files for list backfill, got %v", err)
	}

	agent := filepath.Join(dir, ".opencode", "agents", "strategy.md")
	_, err = os.Stat(agent)
	if err != nil {
		t.Fatal(err)
	}
}

func TestOpenBackfillsAssets(t *testing.T) {
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
	got, err := svc.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got.Workspace.Path != dir {
		t.Fatalf("expected %s, got %s", dir, got.Workspace.Path)
	}

	_, err = os.Stat(filepath.Join(dir, "start.py"))
	if !os.IsNotExist(err) {
		t.Fatalf("expected no template files for open backfill, got %v", err)
	}

	agent := filepath.Join(dir, ".opencode", "agents", "strategy.md")
	_, err = os.Stat(agent)
	if err != nil {
		t.Fatal(err)
	}
}

func TestCreateSeedsSmartXPromptRules(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("USERPROFILE", os.Getenv("HOME"))

	svc := NewService()
	got, err := svc.Create("demo")
	if err != nil {
		t.Fatal(err)
	}

	skill, err := os.ReadFile(filepath.Join(got.Workspace.Path, ".opencode", "skills", "strategy-service", "SKILL.md"))
	if err != nil {
		t.Fatal(err)
	}

	agent, err := os.ReadFile(filepath.Join(got.Workspace.Path, ".opencode", "agents", "strategy.md"))
	if err != nil {
		t.Fatal(err)
	}

	for _, body := range []string{string(skill), string(agent)} {
		if !strings.Contains(body, "https://smarttest.ztqft.com/sdkDoc/python/1.0.0/api/pythonApi.html") {
			t.Fatal("expected Smart api doc url")
		}
		if !strings.Contains(body, "https://smarttest.ztqft.com/sdkDoc/python/1.0.0/example/pythonApiExample.html") {
			t.Fatal("expected Smart demo url")
		}
		if !strings.Contains(body, "smart.on_init(init)") {
			t.Fatal("expected Smart init lifecycle rule")
		}
		if !strings.Contains(body, "smart.current_account") {
			t.Fatal("expected current_account guidance")
		}
		if !strings.Contains(body, "smart.query_bar") {
			t.Fatal("expected query_bar guidance")
		}
	}
}
