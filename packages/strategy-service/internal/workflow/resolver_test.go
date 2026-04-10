package workflow

import "testing"

func TestParseToolPlan(t *testing.T) {
	res, err := parseTool(Plan, []byte(`{"kind":"plan","summary":"ship it","plan":["a","b"],"deliverables":["code"]}`))
	if err != nil {
		t.Fatalf("parseTool returned error: %v", err)
	}
	if res.Text != "ship it" {
		t.Fatalf("expected summary text, got %q", res.Text)
	}
	if res.Structured == "" {
		t.Fatal("expected structured payload")
	}
}

func TestParseToolBuildRequiresSummary(t *testing.T) {
	_, err := parseTool(Build, []byte(`{"kind":"build","next_prompt":"keep going"}`))
	if err == nil {
		t.Fatal("expected parseTool to require summary for build nodes")
	}
}

func TestParseToolIntentRequiresIntent(t *testing.T) {
	_, err := parseTool(Intent, []byte(`{"kind":"intent","summary":"route"}`))
	if err == nil {
		t.Fatal("expected parseTool to require intent")
	}
}

func TestParseToolReviewRequiresPass(t *testing.T) {
	_, err := parseTool(Review, []byte(`{"kind":"review","summary":"check"}`))
	if err == nil {
		t.Fatal("expected parseTool to require pass")
	}
}

func TestParseToolRejectsWrongKind(t *testing.T) {
	_, err := parseTool(Review, []byte(`{"kind":"build","summary":"check","pass":true}`))
	if err == nil {
		t.Fatal("expected parseTool to reject mismatched kind")
	}
}
