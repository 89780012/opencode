package workflow

import "testing"

func TestValidateRequiresWorkspace(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan},
		},
	})
	if err == nil {
		t.Fatal("expected workspace validation error")
	}
}

func TestValidateRequiresRoot(t *testing.T) {
	err := validate(Workflow{
		WorkspacePath: "x",
		Nodes: []Node{
			{ID: "n1", Kind: Plan},
		},
	})
	if err == nil {
		t.Fatal("expected root validation error")
	}
}

func TestValidateRequiresKnownEdgeTargets(t *testing.T) {
	err := validate(Workflow{
		WorkspacePath: "x",
		RootNodeID:    "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan},
		},
		Edges: []Edge{
			{ID: "e1", From: "n1", To: "n2", Cond: Always},
		},
	})
	if err == nil {
		t.Fatal("expected unknown edge target validation error")
	}
}

func TestValidateRequiresReviewOutgoingEdge(t *testing.T) {
	err := validate(Workflow{
		WorkspacePath: "x",
		RootNodeID:    "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Review},
		},
	})
	if err == nil {
		t.Fatal("expected review outgoing edge validation error")
	}
}

func TestValidateAcceptsBasicWorkflow(t *testing.T) {
	err := validate(Workflow{
		WorkspacePath: "x",
		RootNodeID:    "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan},
			{ID: "n2", Kind: Build},
		},
		Edges: []Edge{
			{ID: "e1", From: "n1", To: "n2", Cond: Always},
		},
	})
	if err != nil {
		t.Fatalf("expected workflow to validate, got %v", err)
	}
}
