package workflow

import "testing"

func TestValidateRequiresRoot(t *testing.T) {
	err := validate(Workflow{
		Nodes: []Node{
			{ID: "n1", Kind: Plan, ToolID: "smartx-workflow"},
		},
	})
	if err == nil {
		t.Fatal("expected root validation error")
	}
}

func TestValidateRequiresKnownEdgeTargets(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan, ToolID: "smartx-workflow"},
		},
		Edges: []Edge{
			{ID: "e1", From: "n1", To: "n2", Cond: Always},
		},
	})
	if err == nil {
		t.Fatal("expected unknown edge target validation error")
	}
}

func TestValidateRequiresToolForNonAutoNode(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan},
		},
	})
	if err == nil {
		t.Fatal("expected missing tool validation error")
	}
}

func TestValidateRequiresCheckOutgoingEdge(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Check, ToolID: "smartx-workflow"},
		},
	})
	if err == nil {
		t.Fatal("expected check outgoing edge validation error")
	}
}

func TestValidateRejectsExecuteConditionalEdge(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Execute, ToolID: "smartx-workflow"},
			{ID: "n2", Kind: Check, ToolID: "smartx-workflow"},
		},
		Edges: []Edge{
			{ID: "e1", From: "n1", To: "n2", Cond: Pass},
		},
	})
	if err == nil {
		t.Fatal("expected execute edge validation error")
	}
}

func TestValidateAcceptsBasicWorkflow(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Plan, ToolID: "smartx-workflow"},
			{ID: "n2", Kind: Execute, ToolID: "smartx-workflow"},
		},
		Edges: []Edge{
			{ID: "e1", From: "n1", To: "n2", Cond: Always},
		},
	})
	if err != nil {
		t.Fatalf("expected workflow to validate, got %v", err)
	}
}

func TestValidateRejectsHalfModelOverride(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Execute, ToolID: "smartx-workflow", ModelProviderID: "openai"},
		},
	})
	if err == nil {
		t.Fatal("expected model override validation error")
	}
}

func TestValidateRequiresRouterOutgoingEdge(t *testing.T) {
	err := validate(Workflow{
		RootNodeID: "n1",
		Nodes: []Node{
			{ID: "n1", Kind: Router, ToolID: "smartx-workflow"},
		},
	})
	if err == nil {
		t.Fatal("expected router outgoing edge validation error")
	}
}
