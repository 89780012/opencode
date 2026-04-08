package workflow

import "testing"

func TestParseBuild(t *testing.T) {
	res, err := parse(Build, "done")
	if err != nil {
		t.Fatalf("parse returned error: %v", err)
	}
	if res.Raw != "done" {
		t.Fatalf("expected raw output to be preserved, got %q", res.Raw)
	}
	if res.Text != "done" {
		t.Fatalf("expected text output to be preserved, got %q", res.Text)
	}
}

func TestParseReviewRejectsEmpty(t *testing.T) {
	_, err := parse(Review, "")
	if err == nil {
		t.Fatal("expected parse to reject empty review output")
	}
}

func TestParseReviewRejectsInvalidJSON(t *testing.T) {
	_, err := parse(Review, "not json")
	if err == nil {
		t.Fatal("expected parse to reject invalid review JSON")
	}
}

func TestParseReviewRejectsMissingPass(t *testing.T) {
	_, err := parse(Review, `{"summary":"x"}`)
	if err == nil {
		t.Fatal("expected parse to require boolean pass")
	}
}

func TestParseReviewPreservesRawAndSummary(t *testing.T) {
	res, err := parse(Review, `{"pass":false,"summary":"fix this","next_prompt":"retry"}`)
	if err != nil {
		t.Fatalf("parse returned error: %v", err)
	}
	if res.Raw == "" {
		t.Fatal("expected raw output to be present")
	}
	if res.Text != "fix this" {
		t.Fatalf("expected summary text, got %q", res.Text)
	}
	if res.NextPrompt != "retry" {
		t.Fatalf("expected next prompt to be preserved, got %q", res.NextPrompt)
	}
	if res.Pass == nil || *res.Pass {
		t.Fatal("expected pass to be false")
	}
}
