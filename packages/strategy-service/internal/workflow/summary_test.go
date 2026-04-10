package workflow

import "testing"

func TestSummaryAggregatesRunsAndNodes(t *testing.T) {
	pass := true
	fail := false
	data, err := summary(
		Workflow{
			ID: "wf_1",
			Nodes: []Node{
				{ID: "execute", Kind: Execute, Title: "execute"},
				{ID: "check", Kind: Check, Title: "check"},
			},
		},
		[]Run{
			{ID: "run_1", WorkflowID: "wf_1", Status: RunDone, StartedAt: 1000, EndedAt: 5000},
			{ID: "run_2", WorkflowID: "wf_1", Status: RunFailed, StartedAt: 6000, EndedAt: 9000},
			{ID: "run_3", WorkflowID: "wf_x", Status: RunDone, StartedAt: 7000, EndedAt: 8000},
		},
		[]NodeRun{
			{RunID: "run_1", NodeID: "execute", Status: NodeDone, StartedAt: 1000, EndedAt: 2000},
			{RunID: "run_1", NodeID: "check", Status: NodeDone, StartedAt: 2100, EndedAt: 2600, Result: Result{Pass: &pass}},
			{RunID: "run_2", NodeID: "execute", Status: NodeDone, StartedAt: 6000, EndedAt: 7200},
			{RunID: "run_2", NodeID: "check", Status: NodeFailed, StartedAt: 7300, EndedAt: 7800, Result: Result{Pass: &fail}},
			{RunID: "run_3", NodeID: "execute", Status: NodeDone, StartedAt: 7000, EndedAt: 7600},
		},
	)
	if err != nil {
		t.Fatalf("summary returned error: %v", err)
	}
	if data.TotalRuns != 2 {
		t.Fatalf("expected 2 runs, got %d", data.TotalRuns)
	}
	if data.DoneRuns != 1 || data.FailedRuns != 1 {
		t.Fatalf("unexpected run totals: %#v", data)
	}
	if data.AvgRunMS != 3500 {
		t.Fatalf("expected avg run ms 3500, got %d", data.AvgRunMS)
	}
	if data.TotalNodeRuns != 4 {
		t.Fatalf("expected 4 node runs, got %d", data.TotalNodeRuns)
	}
	if len(data.Nodes) != 2 {
		t.Fatalf("expected 2 node summaries, got %d", len(data.Nodes))
	}
	check := findNode(data.Nodes, "check")
	if check == nil {
		t.Fatal("expected check node summary")
	}
	if check.Pass != 1 || check.Fail != 1 {
		t.Fatalf("unexpected pass/fail totals: %#v", check)
	}
	if check.Failed != 1 || check.Done != 1 {
		t.Fatalf("unexpected node status totals: %#v", check)
	}
}

func TestSummaryRequiresWorkflowID(t *testing.T) {
	_, err := summary(Workflow{}, nil, nil)
	if err == nil {
		t.Fatal("expected workflow id validation error")
	}
}

func findNode(list []NodeSummary, id string) *NodeSummary {
	for i := range list {
		if list[i].NodeID == id {
			return &list[i]
		}
	}
	return nil
}
