package config

import "testing"

func TestDefaultWorkflowBaselineDisabled(t *testing.T) {
	cfg := Default().Workflow
	if cfg.Baseline || cfg.Review || cfg.Debug || cfg.Backtest {
		t.Fatal("workflow automation is enabled by default")
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
