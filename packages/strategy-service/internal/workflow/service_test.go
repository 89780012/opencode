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
	}, "hello")
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
