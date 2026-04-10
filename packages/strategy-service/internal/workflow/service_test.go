package workflow

import (
	"strings"
	"testing"
)

func TestBuildPromptIncludesSkills(t *testing.T) {
	text := buildPrompt(
		Workflow{Name: "demo"},
		Node{
			Title:  "writer",
			Prompt: "write code",
			Skills: []string{"typescript", "tests"},
			ToolID: "smartx-workflow",
		},
		"ship it",
		"",
		"",
	)
	if text == "" {
		t.Fatal("expected prompt text")
	}
	if want := "Requested skills:\n- typescript\n- tests"; !strings.Contains(text, want) {
		t.Fatalf("expected prompt to include skills, got %q", text)
	}
}

func TestBodyIncludesModelAndVariant(t *testing.T) {
	out := body(Node{
		Agent:           "coder",
		ModelProviderID: "openai",
		ModelID:         "gpt-5.4",
		Variant:         "fast",
	}, Run{}, "hello")
	model, ok := out["model"].(map[string]string)
	if !ok {
		t.Fatal("expected model override")
	}
	if model["providerID"] != "openai" || model["modelID"] != "gpt-5.4" {
		t.Fatalf("unexpected model override: %#v", model)
	}
	if out["variant"] != "fast" {
		t.Fatalf("expected variant override, got %#v", out["variant"])
	}
}

func TestBodyFallsBackToRunModelAndVariant(t *testing.T) {
	out := body(Node{
		Agent: "coder",
	}, Run{
		ModelProviderID: "openai",
		ModelID:         "gpt-5.3",
		Variant:         "steady",
	}, "hello")
	model, ok := out["model"].(map[string]string)
	if !ok {
		t.Fatal("expected model fallback")
	}
	if model["providerID"] != "openai" || model["modelID"] != "gpt-5.3" {
		t.Fatalf("unexpected model fallback: %#v", model)
	}
	if out["variant"] != "steady" {
		t.Fatalf("expected variant fallback, got %#v", out["variant"])
	}
}

func TestCountFiltersNode(t *testing.T) {
	list := []NodeRun{
		{NodeID: "a"},
		{NodeID: "b"},
		{NodeID: "a"},
	}
	if count(list, "") != 3 {
		t.Fatalf("expected total count, got %d", count(list, ""))
	}
	if count(list, "a") != 2 {
		t.Fatalf("expected node count, got %d", count(list, "a"))
	}
}

func TestBuildPromptIntentAllowsChecker(t *testing.T) {
	text := buildPrompt(
		Workflow{Name: "demo"},
		Node{
			Kind:   Intent,
			Title:  "intent",
			Agent:  "intent",
			ToolID: "smartx-workflow",
		},
		"check it first",
		"",
		"",
	)
	if !strings.Contains(text, `"checker"`) {
		t.Fatalf("expected intent prompt contract to include checker, got %q", text)
	}
}

func TestNextRoutesIntentToChecker(t *testing.T) {
	nextID, _ := next(
		Workflow{
			Edges: []Edge{
				{From: "intent", To: "plan", Cond: PlanTo},
				{From: "intent", To: "build", Cond: BuildTo},
				{From: "intent", To: "review", Cond: CheckTo},
			},
		},
		Node{ID: "intent", Kind: Intent},
		Result{Intent: string(CheckTo)},
	)
	if nextID != "review" {
		t.Fatalf("expected checker route to review, got %q", nextID)
	}
}

func TestBuildPromptRequiresToolCall(t *testing.T) {
	text := buildPrompt(
		Workflow{Name: "demo"},
		Node{
			Kind:   Plan,
			Title:  "plan",
			Agent:  "smartx-plan",
			ToolID: "smartx-workflow",
		},
		"ship it",
		"",
		"",
	)
	if !strings.Contains(text, "smartx-workflow") {
		t.Fatalf("expected tool contract in prompt, got %q", text)
	}
	if strings.Contains(text, "Return JSON with keys") {
		t.Fatalf("expected tool contract to replace raw JSON contract, got %q", text)
	}
}
