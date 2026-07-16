package config

import "testing"

func TestDefaultWorkflowBaselineDisabled(t *testing.T) {
	if Default().Workflow.Baseline {
		t.Fatal("workflow baseline is enabled by default")
	}
}

func TestCleanWorkflowBaseline(t *testing.T) {
	cfg := Default()
	cfg.Workflow.Baseline = true
	if !clean(cfg).Workflow.Baseline {
		t.Fatal("workflow baseline was not preserved")
	}
}
