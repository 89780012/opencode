package workflow

import "testing"

func TestCleanNodesDefaultsToolForNonAutoNodes(t *testing.T) {
	list := cleanNodes([]Node{
		{ID: "plan", Kind: Plan},
		{ID: "end", Kind: End, ToolID: "smartx-workflow"},
	})
	if got := list[0].ToolID; got != "smartx-workflow" {
		t.Fatalf("expected default tool for plan node, got %q", got)
	}
	if got := list[0].RetryLimit; got != 2 {
		t.Fatalf("expected default retry limit for plan node, got %d", got)
	}
	if got := list[1].ToolID; got != "" {
		t.Fatalf("expected end node tool to be cleared, got %q", got)
	}
}
