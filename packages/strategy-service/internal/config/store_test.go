package config

import (
	"path/filepath"
	"testing"

	"strategy-service/internal/db"
)

func TestDefaultWorkflowBaselineDisabled(t *testing.T) {
	cfg := Default().Workflow
	if cfg.Baseline || cfg.Review || cfg.Debug || cfg.Backtest {
		t.Fatal("workflow automation is enabled by default")
	}
}

func TestDefaultWorkbenchIntakeDisabled(t *testing.T) {
	if Default().Workbench.Intake {
		t.Fatal("workbench intake is enabled by default")
	}
}

func TestCleanWorkflowBaseline(t *testing.T) {
	cfg := Default()
	cfg.Workflow.Baseline = true
	cfg.Workflow.Review = true
	cfg.Workflow.Debug = true
	cfg.Workflow.Backtest = true
	out := clean(cfg).Workflow
	if !out.Baseline || !out.Review || !out.Debug || !out.Backtest {
		t.Fatal("workflow configuration was not preserved")
	}
}

func TestCleanWorkbenchIntake(t *testing.T) {
	cfg := Default()
	cfg.Workbench.Intake = true
	if !clean(cfg).Workbench.Intake {
		t.Fatal("workbench intake was not preserved")
	}
}

func TestStorePersistsWorkbenchIntake(t *testing.T) {
	doc, err := db.OpenPath(filepath.Join(t.TempDir(), "strategy.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = doc.Close() })
	store := &Store{doc: doc}
	cfg := Default()
	cfg.Workbench.Intake = true
	if _, err := store.Save(cfg); err != nil {
		t.Fatal(err)
	}
	out, err := store.LoadUserConfig()
	if err != nil {
		t.Fatal(err)
	}
	if out.Workbench.Intake != cfg.Workbench.Intake {
		t.Fatalf("workbench intake = %v, want %v", out.Workbench.Intake, cfg.Workbench.Intake)
	}
}
