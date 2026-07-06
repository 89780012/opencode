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
	text := brief([]string{"use grid strategy.", "trade BTC.", "  "})

	if !strings.Contains(text, "1. use grid strategy.") {
		t.Fatalf("brief() = %q", text)
	}
	if strings.Contains(text, "\n\n") {
		t.Fatalf("brief() contains blank line: %q", text)
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

func TestSaveReviewUpdatesRunningReview(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())
	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		SessionID:     ses,
	}); err != nil {
		t.Fatal(err)
	}

	run, err := svc.SaveReview(context.Background(), ReviewReq{
		WorkspacePath: dir,
		State:         "running",
		Summary:       "审查已开始",
		Items: []ReviewItem{{
			Name:   "审查进行中",
			Status: "running",
			Detail: "strategy-reviewer 正在执行审查",
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	done, err := svc.SaveReview(context.Background(), ReviewReq{
		WorkspacePath: dir,
		State:         "failed",
		Summary:       "发现风险，需要修复",
		Items: []ReviewItem{{
			Name:       "风控缺陷",
			Status:     "failed",
			Detail:     "缺少止损逻辑",
			Suggestion: "补充止损条件",
		}},
		Suggestions: []string{"补充风险控制"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if done.ID != run.ID {
		t.Fatalf("review id = %q, want %q", done.ID, run.ID)
	}
	list, err := svc.ListReviews(context.Background(), ReviewGet{WorkspacePath: dir})
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("review count = %d, want 1", len(list))
	}
	if list[0].State != "failed" || list[0].Items[0].Name != "风控缺陷" {
		t.Fatalf("running review was not updated: %#v", list[0])
	}
	prog, err := svc.ListProgress(context.Background(), ProgressList{WorkspacePath: dir})
	if err != nil {
		t.Fatal(err)
	}
	reviews := make([]ProgressEvent, 0, 2)
	for _, item := range prog.Events {
		if strings.HasPrefix(item.Kind, "review.") {
			reviews = append(reviews, item)
		}
	}
	if len(reviews) != 2 {
		t.Fatalf("review progress count = %d, want 2", len(reviews))
	}
	if reviews[0].Title != "开始第1轮审查" {
		t.Fatalf("start title = %q", reviews[0].Title)
	}
	if reviews[1].Title != "第1轮审查结束" {
		t.Fatalf("done title = %q", reviews[1].Title)
	}
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

func TestSaveAnalysisSkipsUnchangedProgress(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())

	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		SessionID:     ses,
	}); err != nil {
		t.Fatal(err)
	}
	input := AnalysisReq{
		WorkspacePath: dir,
		State:         "done",
		Items:         []string{"读取行情", "执行入场"},
	}
	first, err := svc.SaveAnalysis(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.SaveAnalysis(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if second.UpdatedAt != first.UpdatedAt {
		t.Fatalf("updatedAt = %d, want %d", second.UpdatedAt, first.UpdatedAt)
	}
	list, err := svc.ListProgress(context.Background(), ProgressList{WorkspacePath: dir, SessionID: ses})
	if err != nil {
		t.Fatal(err)
	}
	if countProgress(list.Events, "analysis.done") != 1 {
		t.Fatalf("events = %#v", list.Events)
	}
}

func TestSaveFlowchartSkipsUnchangedProgress(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := fmt.Sprintf("ses_%d", time.Now().UnixNano())

	if _, err := svc.InitProjectState(context.Background(), ProjectStateInitReq{
		WorkspacePath: dir,
		SessionID:     ses,
	}); err != nil {
		t.Fatal(err)
	}
	input := FlowchartReq{
		WorkspacePath: dir,
		State:         "done",
		Code:          "flowchart TD\nA[读取行情] --> B[执行入场]",
	}
	first, err := svc.SaveFlowchart(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.SaveFlowchart(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}
	if second.UpdatedAt != first.UpdatedAt {
		t.Fatalf("updatedAt = %d, want %d", second.UpdatedAt, first.UpdatedAt)
	}
	list, err := svc.ListProgress(context.Background(), ProgressList{WorkspacePath: dir, SessionID: ses})
	if err != nil {
		t.Fatal(err)
	}
	if countProgress(list.Events, "flowchart.done") != 1 {
		t.Fatalf("events = %#v", list.Events)
	}
}

func countProgress(events []ProgressEvent, kind string) int {
	count := 0
	for _, event := range events {
		if event.Kind == kind {
			count++
		}
	}
	return count
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
