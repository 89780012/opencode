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

func TestCleanWaitsKeepsLatestOpenWaitPerRun(t *testing.T) {
	list := cleanWaits([]Wait{
		{ID: "old", RunID: "run", StepID: "step", Status: WaitOpen, Mode: WaitConfirm, Source: WaitRuntime, CreatedAt: 100},
		{ID: "new", RunID: "run", StepID: "step", Status: WaitOpen, Mode: WaitApproval, Source: WaitSystem, CreatedAt: 200},
		{ID: "done", RunID: "run", StepID: "step", Status: WaitAnswered, Mode: WaitForm, CreatedAt: 300},
	})
	if len(list) != 2 {
		t.Fatalf("expected latest open wait plus answered wait, got %d", len(list))
	}
	if got := list[0].ID; got != "done" {
		t.Fatalf("expected answered wait sorted first by created_at, got %q", got)
	}
	if got := list[1].ID; got != "new" {
		t.Fatalf("expected latest open wait to be kept, got %q", got)
	}
	if got := list[1].Mode; got != WaitApproval {
		t.Fatalf("expected wait mode to be preserved, got %q", got)
	}
	if got := list[1].Source; got != WaitSystem {
		t.Fatalf("expected wait source to be preserved, got %q", got)
	}
}

func TestCleanRepliesDedupesIdempotencyKeyPerWait(t *testing.T) {
	list := cleanReplies([]Reply{
		{ID: "old", WaitID: "wait", RunID: "run", StepID: "step", IdempotencyKey: "key", Actor: ReplyOperator, CreatedAt: 100},
		{ID: "new", WaitID: "wait", RunID: "run", StepID: "step", IdempotencyKey: "key", Actor: ReplySystem, CreatedAt: 200},
		{ID: "other", WaitID: "wait", RunID: "run", StepID: "step", IdempotencyKey: "other", CreatedAt: 300},
	})
	if len(list) != 2 {
		t.Fatalf("expected duplicate idempotency key to be removed, got %d", len(list))
	}
	if got := list[0].ID; got != "other" {
		t.Fatalf("expected newest distinct reply first, got %q", got)
	}
	if got := list[1].ID; got != "new" {
		t.Fatalf("expected newest duplicate reply to be kept, got %q", got)
	}
	if got := list[1].Actor; got != ReplySystem {
		t.Fatalf("expected reply actor to be preserved, got %q", got)
	}
}
