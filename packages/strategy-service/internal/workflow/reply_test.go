package workflow

import "testing"

func TestReplyMarksWaitAnsweredAndQueuesRun(t *testing.T) {
	t.Setenv("USERPROFILE", t.TempDir())

	svc := New(nil)
	run := Run{
		ID:         "run_1",
		WorkflowID: "wf_1",
		Status:     RunWaiting,
		StartedAt:  10,
	}
	if err := svc.store.saveRuns([]Run{run}); err != nil {
		t.Fatal(err)
	}
	wait := Wait{
		ID:        "wait_1",
		RunID:     run.ID,
		StepID:    "step_1",
		Status:    WaitOpen,
		Mode:      WaitText,
		Source:    WaitModel,
		CreatedAt: 20,
	}
	if err := svc.store.saveWaits([]Wait{wait}); err != nil {
		t.Fatal(err)
	}

	row, err := svc.Reply(run.ID, wait.ID, []byte(`{"answer":"ok"}`), "key_1")
	if err != nil {
		t.Fatal(err)
	}
	if row.WaitID != wait.ID {
		t.Fatalf("expected wait id %q, got %q", wait.ID, row.WaitID)
	}
	if row.Actor != ReplyUser {
		t.Fatalf("expected reply actor user, got %q", row.Actor)
	}

	runs, err := svc.store.loadRuns()
	if err != nil {
		t.Fatal(err)
	}
	if len(runs) != 1 || runs[0].Status != RunRunning {
		t.Fatalf("expected run to be running after reply, got %#v", runs)
	}

	waits, err := svc.store.loadWaits()
	if err != nil {
		t.Fatal(err)
	}
	if len(waits) != 1 || waits[0].Status != WaitAnswered {
		t.Fatalf("expected wait to be answered, got %#v", waits)
	}
	if waits[0].AnsweredAt == 0 {
		t.Fatal("expected answered_at to be set")
	}
}

func TestReplyIsIdempotentPerWaitAndKey(t *testing.T) {
	t.Setenv("USERPROFILE", t.TempDir())

	svc := New(nil)
	run := Run{
		ID:         "run_1",
		WorkflowID: "wf_1",
		Status:     RunWaiting,
		StartedAt:  10,
	}
	if err := svc.store.saveRuns([]Run{run}); err != nil {
		t.Fatal(err)
	}
	wait := Wait{
		ID:        "wait_1",
		RunID:     run.ID,
		StepID:    "step_1",
		Status:    WaitOpen,
		Mode:      WaitText,
		Source:    WaitModel,
		CreatedAt: 20,
	}
	if err := svc.store.saveWaits([]Wait{wait}); err != nil {
		t.Fatal(err)
	}

	a, err := svc.Reply(run.ID, wait.ID, []byte(`{"answer":"ok"}`), "key_1")
	if err != nil {
		t.Fatal(err)
	}

	runs, err := svc.store.loadRuns()
	if err != nil {
		t.Fatal(err)
	}
	runs[0].Status = RunWaiting
	if err := svc.store.saveRuns(runs); err != nil {
		t.Fatal(err)
	}
	waits, err := svc.store.loadWaits()
	if err != nil {
		t.Fatal(err)
	}
	waits[0].Status = WaitOpen
	waits[0].AnsweredAt = 0
	if err := svc.store.saveWaits(waits); err != nil {
		t.Fatal(err)
	}

	b, err := svc.Reply(run.ID, wait.ID, []byte(`{"answer":"changed"}`), "key_1")
	if err != nil {
		t.Fatal(err)
	}
	if a.ID != b.ID {
		t.Fatalf("expected idempotent reply id %q, got %q", a.ID, b.ID)
	}

	list, err := svc.store.loadReplies()
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected one stored reply, got %d", len(list))
	}
}

func TestReplyRequiresWaitingRun(t *testing.T) {
	t.Setenv("USERPROFILE", t.TempDir())

	svc := New(nil)
	if err := svc.store.saveRuns([]Run{{
		ID:         "run_1",
		WorkflowID: "wf_1",
		Status:     RunRunning,
		StartedAt:  10,
	}}); err != nil {
		t.Fatal(err)
	}
	if err := svc.store.saveWaits([]Wait{{
		ID:        "wait_1",
		RunID:     "run_1",
		StepID:    "step_1",
		Status:    WaitOpen,
		Mode:      WaitText,
		Source:    WaitModel,
		CreatedAt: 20,
	}}); err != nil {
		t.Fatal(err)
	}

	_, err := svc.Reply("run_1", "wait_1", []byte(`{"answer":"ok"}`), "key_1")
	if err == nil || err.Error() != "workflow run is not waiting" {
		t.Fatalf("expected waiting error, got %v", err)
	}
}
