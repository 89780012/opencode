package workbench

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"strategy-service/internal/db"
)

func TestBriefKeepsNumberAndTextTogether(t *testing.T) {
	text := brief([]string{"use grid strategy.", "  "})

	if !strings.Contains(text, "1. use grid strategy.") {
		t.Fatalf("brief() = %q", text)
	}
	if strings.Contains(text, "1.\n") {
		t.Fatalf("brief() split number and text: %q", text)
	}
}

func TestProjectStateLifecycleCreatesResumesAndSaves(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	yes := true
	dirty := true

	row, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		WorktreePath:  dir,
		Project:       "alpha",
		Phase:         "implementation",
		Status:        "in-progress",
		Current:       "Wire project memory",
		Summary:       "Initial SmartX memory contract",
		Next:          []string{"Run workflow tests"},
		Risks:         []string{"Missing regression coverage"},
		Verified:      &yes,
		Dirty:         &dirty,
		Features: []ProjectTask{{
			ID:          "pm-1",
			Name:        "Project memory gate",
			Description: "Enforce restore before sustained work",
			Status:      "running",
			Priority:    "high",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !row.Exists || row.Project != "alpha" || row.Status != "in-progress" || !row.Dirty {
		t.Fatalf("unexpected init row: %#v", row)
	}
	for _, item := range projectStateRequired {
		if _, err := os.Stat(filepath.Join(dir, ".project-state", item)); err != nil {
			t.Fatalf("missing %s: %v", item, err)
		}
	}

	var state projectStateDoc
	readJSON(t, filepath.Join(dir, ".project-state", "state.json"), &state)
	if state.Current != "Wire project memory" || !state.Verified || !state.Dirty {
		t.Fatalf("unexpected state.json: %#v", state)
	}
	var feature projectFeatureDoc
	readJSON(t, filepath.Join(dir, ".project-state", "feature-list.json"), &feature)
	if feature.Features[0].Status != "in-progress" {
		t.Fatalf("feature status should be normalized: %#v", feature.Features[0])
	}

	resumed, err := svc.ResumeProjectState(context.Background(), ProjectStateGet{WorkspacePath: dir})
	if err != nil {
		t.Fatal(err)
	}
	if resumed.Current != row.Current || resumed.Next[0] != "Run workflow tests" {
		t.Fatalf("unexpected resumed row: %#v", resumed)
	}

	no := false
	saved, err := svc.SaveProjectState(context.Background(), ProjectStateSaveReq{
		WorkspacePath: dir,
		Phase:         "verification",
		Status:        "ready",
		Current:       "Run verification",
		Summary:       "Project-state service is covered",
		Next:          []string{"Wire plugin tests"},
		Risks:         []string{"Workflow regression"},
		Verified:      &yes,
		Dirty:         &no,
	})
	if err != nil {
		t.Fatal(err)
	}
	if saved.Phase != "verification" || saved.Status != "ready" || saved.Dirty {
		t.Fatalf("unexpected saved row: %#v", saved)
	}
	log, err := os.ReadFile(filepath.Join(dir, ".project-state", "session-log.md"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(string(log), "## ") != 2 {
		t.Fatalf("session log should append entries: %q", string(log))
	}
	progress, err := os.ReadFile(filepath.Join(dir, ".project-state", "progress.md"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(progress), "Run verification") || !strings.Contains(string(progress), "Wire plugin tests") {
		t.Fatalf("progress not updated: %q", string(progress))
	}
}

func TestProjectStateValidateRepairsMissingFilesWithoutOverwritingExistingContent(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()

	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		Project:       "beta",
		Current:       "Keep progress",
	}); err != nil {
		t.Fatal(err)
	}
	progress := filepath.Join(dir, ".project-state", "progress.md")
	body := []byte("manual progress")
	if err := os.WriteFile(progress, body, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(filepath.Join(dir, ".project-state", "state.json")); err != nil {
		t.Fatal(err)
	}

	row, err := svc.ValidateProjectState(context.Background(), ProjectStateGet{WorkspacePath: dir})
	if err != nil {
		t.Fatal(err)
	}
	if !row.Exists || row.Project != "beta" {
		t.Fatalf("unexpected validation row: %#v", row)
	}
	next, err := os.ReadFile(progress)
	if err != nil {
		t.Fatal(err)
	}
	if string(next) != string(body) {
		t.Fatalf("progress was overwritten: %q", string(next))
	}
	if _, err := os.Stat(filepath.Join(dir, ".project-state", "state.json")); err != nil {
		t.Fatalf("state.json not repaired: %v", err)
	}
}

func TestProgressUsesProjectStateSession(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())
	old := ses + "_old"

	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		Project:       "alpha",
		SessionID:     ses,
	}); err != nil {
		t.Fatal(err)
	}
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := doc.ExecContext(context.Background(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`,
		old, dir, "older", "{}", "", int64(1), int64(1)); err != nil {
		t.Fatal(err)
	}
	row, err := svc.AppendProgress(context.Background(), ProgressAppend{
		WorkspacePath: dir,
		Kind:          "analysis.done",
		State:         "done",
		Title:         "分析",
		Detail:        "ok",
	})
	if err != nil {
		t.Fatal(err)
	}
	if row.SessionID != ses {
		t.Fatalf("session id = %q, want %s", row.SessionID, ses)
	}
}

func TestProgressPersistsEvent(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())

	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		SessionID:     ses,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.AppendProgress(context.Background(), ProgressAppend{
		WorkspacePath: dir,
		SessionID:     ses,
		Kind:          "review.done",
		State:         "done",
		Title:         "review",
		Detail:        "passed",
	}); err != nil {
		t.Fatal(err)
	}
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	var count int
	if err := doc.QueryRowContext(context.Background(), `select count(*) from session_progress_events where workspace_path = ? and session_id = ? and kind = ?`, dir, ses, "review.done").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("event count = %d, want 1", count)
	}
	list, err := svc.ListProgress(context.Background(), ProgressList{WorkspacePath: dir, SessionID: ses})
	if err != nil {
		t.Fatal(err)
	}
	if !hasProgress(list.Events, "review.done") {
		t.Fatalf("unexpected progress events: %#v", list.Events)
	}
}

func hasProgress(events []ProgressEvent, kind string) bool {
	for _, event := range events {
		if event.Kind == kind {
			return true
		}
	}
	return false
}

func TestProgressDedupesImmediateDuplicate(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())

	first, err := svc.AppendProgress(context.Background(), ProgressAppend{
		WorkspacePath: dir,
		SessionID:     ses,
		Kind:          "analysis.done",
		State:         "done",
		Title:         "工作区分析",
		Detail:        "same",
		Source:        "service",
	})
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.AppendProgress(context.Background(), ProgressAppend{
		WorkspacePath: dir,
		SessionID:     ses,
		Kind:          "analysis.done",
		State:         "done",
		Title:         "工作区分析",
		Detail:        "same",
		Source:        "service",
	})
	if err != nil {
		t.Fatal(err)
	}
	if second.ID != first.ID {
		t.Fatalf("duplicate id = %q, want %q", second.ID, first.ID)
	}
	list, err := svc.ListProgress(context.Background(), ProgressList{WorkspacePath: dir, SessionID: ses})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Events) != 1 {
		t.Fatalf("event count = %d, want 1", len(list.Events))
	}
}

func readJSON(t *testing.T, file string, out any) {
	t.Helper()
	body, err := os.ReadFile(file)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(body, out); err != nil {
		t.Fatal(err)
	}
}
