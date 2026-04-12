package workflow

import "testing"

func TestParseToolPlan(t *testing.T) {
	res, err := parseTool(Plan, []byte(`{"kind":"plan","summary":"ship it","steps":["a","b"],"deliverables":["code"]}`))
	if err != nil {
		t.Fatalf("parseTool returned error: %v", err)
	}
	if res.Text != "ship it" {
		t.Fatalf("expected summary text, got %q", res.Text)
	}
	if len(res.Steps) != 2 {
		t.Fatalf("expected steps to be parsed, got %#v", res.Steps)
	}
}

func TestParseToolExecuteRequiresSummary(t *testing.T) {
	_, err := parseTool(Execute, []byte(`{"kind":"execute","handoff":"keep going"}`))
	if err == nil {
		t.Fatal("expected parseTool to require summary for execute nodes")
	}
}

func TestParseToolRouterRequiresRoute(t *testing.T) {
	_, err := parseTool(Router, []byte(`{"kind":"router","summary":"route"}`))
	if err == nil {
		t.Fatal("expected parseTool to require route")
	}
}

func TestParseToolRouterAllowsEmptySummary(t *testing.T) {
	res, err := parseTool(Router, []byte(`{"kind":"router","route":"plan"}`))
	if err != nil {
		t.Fatalf("expected parseTool to allow router without summary, got %v", err)
	}
	if res.Text != "plan" {
		t.Fatalf("expected router fallback text, got %q", res.Text)
	}
}

func TestParseToolRouterAllowsRespondRoute(t *testing.T) {
	res, err := parseTool(Router, []byte(`{"kind":"router","route":"respond"}`))
	if err != nil {
		t.Fatalf("expected parseTool to allow respond route, got %v", err)
	}
	if res.Route != "respond" {
		t.Fatalf("expected respond route, got %q", res.Route)
	}
}

func TestParseToolRespondRequiresSummary(t *testing.T) {
	_, err := parseTool(Respond, []byte(`{"kind":"respond","handoff":"done"}`))
	if err == nil {
		t.Fatal("expected parseTool to require summary for respond nodes")
	}
}

func TestParseToolCheckRequiresPass(t *testing.T) {
	_, err := parseTool(Check, []byte(`{"kind":"check","summary":"check"}`))
	if err == nil {
		t.Fatal("expected parseTool to require pass")
	}
}

func TestParseToolRejectsWrongKind(t *testing.T) {
	_, err := parseTool(Check, []byte(`{"kind":"execute","summary":"check","pass":true}`))
	if err == nil {
		t.Fatal("expected parseTool to reject mismatched kind")
	}
}
