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
		true,
	)
	if text == "" {
		t.Fatal("expected prompt text")
	}
	if want := "Requested skills:\n- typescript\n- tests"; !strings.Contains(text, want) {
		t.Fatalf("expected prompt to include skills, got %q", text)
	}
}

func TestBodyUsesNodeAgent(t *testing.T) {
	out := body(Node{
		Agent: "smartx-plan",
	}, Run{
		ModelProviderID: "openai",
		ModelID:         "gpt-5.3",
	}, "hello")
	if out["agent"] != "smartx-plan" {
		t.Fatalf("expected node agent, got %#v", out["agent"])
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

func TestBuildPromptRouterAllowsCheck(t *testing.T) {
	text := buildPrompt(
		Workflow{Name: "demo"},
		Node{
			Kind:   Router,
			Title:  "router",
			Agent:  "intent",
			ToolID: "smartx-workflow",
		},
		"check it first",
		"",
		"",
		true,
	)
	if !strings.Contains(text, `"check"`) {
		t.Fatalf("expected router prompt contract to include check, got %q", text)
	}
}

func TestNextRoutesRouterToCheck(t *testing.T) {
	nextID, handoff := next(
		Workflow{
			Edges: []Edge{
				{From: "router", To: "plan", Cond: PlanTo},
				{From: "router", To: "execute", Cond: ExecuteTo},
				{From: "router", To: "check", Cond: CheckTo},
			},
		},
		Node{ID: "router", Kind: Router},
		Result{Route: string(CheckTo), Handoff: "go check"},
	)
	if nextID != "check" {
		t.Fatalf("expected check route, got %q", nextID)
	}
	if handoff != "go check" {
		t.Fatalf("expected handoff to be preserved, got %q", handoff)
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
		true,
	)
	if !strings.Contains(text, "smartx-workflow") {
		t.Fatalf("expected tool contract in prompt, got %q", text)
	}
}

func TestBuildPromptSkipsObjectiveAfterEntry(t *testing.T) {
	text := buildPrompt(
		Workflow{Name: "demo"},
		Node{
			Kind:   Execute,
			Title:  "execute",
			Agent:  "strategy",
			ToolID: "smartx-workflow",
		},
		"ship it",
		"follow the plan",
		"",
		false,
	)
	if strings.Contains(text, "User objective:") {
		t.Fatalf("expected prompt to skip objective after entry, got %q", text)
	}
	if !strings.Contains(text, "Workflow handoff:\nfollow the plan") {
		t.Fatalf("expected prompt to include handoff, got %q", text)
	}
}

func TestCarrySkipsRouterFallback(t *testing.T) {
	if got := carry(Node{Kind: Router}, Result{Text: "pick plan"}); got != "" {
		t.Fatalf("expected router carry to stay empty without handoff, got %q", got)
	}
	if got := carry(Node{Kind: Plan}, Result{Text: "do work"}); got != "do work" {
		t.Fatalf("expected non-router carry fallback, got %q", got)
	}
}
