package workbench

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
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

func TestSaveReviewValidatesAndAggregatesItems(t *testing.T) {
	base := func() ReviewReq {
		return ReviewReq{
			WorkspacePath: t.TempDir(),
			ReviewID:      "review-validation",
			Summary:       "review summary",
			Items: []ReviewItem{{
				Name:   "risk",
				Status: "passed",
				Detail: "checked",
			}},
		}
	}
	cases := map[string]func(*ReviewReq){
		"summary": func(req *ReviewReq) { req.Summary = " " },
		"items":   func(req *ReviewReq) { req.Items = nil },
		"blank item": func(req *ReviewReq) {
			req.Items = append(req.Items, ReviewItem{})
		},
		"status": func(req *ReviewReq) { req.Items[0].Status = "unknown" },
		"state": func(req *ReviewReq) {
			req.State = "passed"
			req.Items[0].Status = "failed"
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			req := base()
			change(&req)
			if _, err := NewService(nil, nil, nil, "").SaveReview(t.Context(), req); !errors.Is(err, ErrInput) {
				t.Fatalf("error = %v, want ErrInput", err)
			}
		})
	}

	row, err := NewService(nil, nil, nil, "").SaveReview(t.Context(), ReviewReq{
		WorkspacePath: t.TempDir(),
		ReviewID:      "review-precedence",
		Summary:       "mixed results",
		Items: []ReviewItem{
			{Name: "running", Status: "running", Detail: "started"},
			{Name: "failed", Status: "failed", Detail: "failed later"},
			{Name: "error", Status: "error", Detail: "errored last"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if row.State != "error" {
		t.Fatalf("state = %q, want error", row.State)
	}
}

func TestSaveReviewIsIdempotentAndTerminalImmutable(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := seed(t, dir)
	events := make(chan string, 8)
	svc.SetEvent(func(_ context.Context, kind string, _ json.RawMessage) {
		events <- kind
	})
	run := ReviewReq{
		WorkspacePath: dir,
		WorktreePath:  dir,
		ReviewID:      "call-review-1",
		SessionID:     ses,
		State:         "running",
		Summary:       "review started",
		Items: []ReviewItem{{
			Name:   "review",
			Status: "running",
			Detail: "reviewer is running",
		}},
	}
	first, err := svc.SaveReview(t.Context(), run)
	if err != nil {
		t.Fatal(err)
	}
	again, err := svc.SaveReview(t.Context(), run)
	if err != nil {
		t.Fatal(err)
	}
	if again.ID != first.ID || again.UpdatedAt != first.UpdatedAt {
		t.Fatalf("duplicate running review changed row: first=%#v again=%#v", first, again)
	}

	done := ReviewReq{
		WorkspacePath: dir,
		WorktreePath:  dir,
		ReviewID:      run.ReviewID,
		SessionID:     ses,
		State:         "failed",
		Summary:       "review failed",
		Items: []ReviewItem{{
			Name:   "risk",
			Status: "failed",
			Detail: "risk is missing",
		}},
	}
	start := make(chan struct{})
	errs := make(chan error, 2)
	var wait sync.WaitGroup
	for range 2 {
		wait.Add(1)
		go func() {
			defer wait.Done()
			<-start
			_, err := svc.SaveReview(context.Background(), done)
			errs <- err
		}()
	}
	close(start)
	wait.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}

	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	var count int
	if err := doc.QueryRowContext(t.Context(), `select count(*) from workspace_reviews where workspace_path = ? and worktree_path = ? and review_id = ?`, dir, dir, run.ReviewID).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("review count = %d, want 1", count)
	}
	if err := doc.QueryRowContext(t.Context(), `select count(*) from session_progress_events where workspace_path = ? and session_id = ? and kind like 'review.%'`, dir, ses).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Fatalf("progress count = %d, want 2", count)
	}
	if len(events) != 2 {
		t.Fatalf("event count = %d, want 2", len(events))
	}
	changed := done
	changed.Summary = "late result"
	if _, err := svc.SaveReview(t.Context(), changed); !errors.Is(err, ErrInput) {
		t.Fatalf("terminal update error = %v, want ErrInput", err)
	}
}

func TestSaveReviewKeepsRoundForConcurrentRuns(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := seed(t, dir)
	start := func(id string) ReviewRow {
		t.Helper()
		row, err := svc.SaveReview(t.Context(), ReviewReq{
			WorkspacePath: dir,
			ReviewID:      id,
			SessionID:     ses,
			State:         "running",
			Summary:       id + " started",
			Items:         []ReviewItem{{Name: "review", Status: "running", Detail: "running"}},
		})
		if err != nil {
			t.Fatal(err)
		}
		return row
	}
	one := start("concurrent-one")
	start("concurrent-two")
	_, err := svc.SaveReview(t.Context(), ReviewReq{
		WorkspacePath: dir,
		ReviewID:      "concurrent-one",
		SessionID:     ses,
		State:         "passed",
		Summary:       "first review passed",
		Items:         []ReviewItem{{Name: "review", Status: "passed", Detail: "passed"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	var title string
	if err := doc.QueryRowContext(t.Context(), "select title from session_progress_events where id = ?", "progress_"+hash(one.ID+"\x00passed")).Scan(&title); err != nil {
		t.Fatal(err)
	}
	if title != "第1轮审查结束" {
		t.Fatalf("title = %q, want first round", title)
	}
}

func TestSaveReviewRollsBackWhenProgressFails(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := seed(t, dir)
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	name := fmt.Sprintf("fail_review_progress_%d", time.Now().UnixNano())
	_, err = doc.ExecContext(t.Context(), fmt.Sprintf(`create trigger %s before insert on session_progress_events when new.session_id = '%s' begin select raise(abort, 'forced progress failure'); end`, name, ses))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "drop trigger if exists "+name)
	})
	events := make(chan string, 1)
	svc.SetEvent(func(_ context.Context, kind string, _ json.RawMessage) {
		events <- kind
	})
	_, err = svc.SaveReview(t.Context(), ReviewReq{
		WorkspacePath: dir,
		ReviewID:      "rollback-review",
		SessionID:     ses,
		State:         "running",
		Summary:       "review started",
		Items:         []ReviewItem{{Name: "review", Status: "running", Detail: "running"}},
	})
	if err == nil {
		t.Fatal("review save succeeded despite progress failure")
	}
	var count int
	if err := doc.QueryRowContext(t.Context(), `select count(*) from workspace_reviews where review_id = ?`, "rollback-review").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("review count = %d, want rollback", count)
	}
	if len(events) != 0 {
		t.Fatalf("event count = %d, want 0", len(events))
	}
}

func TestSaveReviewScopesSessionAndWorktree(t *testing.T) {
	svc := NewService(nil, nil, nil, "")
	dir := t.TempDir()
	ses := seed(t, dir)
	other := t.TempDir()
	_, err := svc.SaveReview(t.Context(), ReviewReq{
		WorkspacePath: other,
		ReviewID:      "wrong-session",
		SessionID:     ses,
		Summary:       "wrong session",
		Items:         []ReviewItem{{Name: "scope", Status: "passed", Detail: "checked"}},
	})
	if !errors.Is(err, ErrInput) {
		t.Fatalf("scope error = %v, want ErrInput", err)
	}
	for _, item := range []struct {
		id   string
		path string
	}{
		{id: "worktree-one", path: filepath.Join(dir, "one")},
		{id: "worktree-two", path: filepath.Join(dir, "two")},
	} {
		_, err := svc.SaveReview(t.Context(), ReviewReq{
			WorkspacePath: dir,
			WorktreePath:  item.path,
			ReviewID:      item.id,
			Summary:       item.id,
			Items:         []ReviewItem{{Name: "scope", Status: "passed", Detail: "checked"}},
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	list, err := svc.ListReviews(t.Context(), ReviewGet{WorkspacePath: dir, WorktreePath: filepath.Join(dir, "one")})
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].ReviewID != "worktree-one" {
		t.Fatalf("reviews = %#v", list)
	}
}

func seed(t *testing.T, workspace string) string {
	t.Helper()
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	id := fmt.Sprintf("ses_review_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`, id, workspace, "review", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from session_progress_events where workspace_path = ?", workspace)
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_reviews where workspace_path = ?", workspace)
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
	})
	return id
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

func TestSaveRequirementsReplacesCurrentSession(t *testing.T) {
	ctx := context.Background()
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	path := t.TempDir()
	id := fmt.Sprintf("ses_requirements_%d", time.Now().UnixNano())
	now := time.Now().UnixMilli()
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)`,
		id, path, "requirements", "{}", "", now, now)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = doc.ExecContext(context.Background(), "delete from workspace_requirements where session_id = ?", id)
		_, _ = doc.ExecContext(context.Background(), "delete from sessions where id = ?", id)
	})

	svc := NewService(nil, nil, nil, "")
	first, err := svc.SaveRequirements(ctx, RequirementsSave{
		WorkspacePath: path,
		SessionID:     id,
		Requirements:  []string{" first ", "second", "first"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(first.Requirements, []string{"first", "second", "first"}) {
		t.Fatalf("requirements = %#v", first.Requirements)
	}
	loaded, err := svc.GetRequirements(ctx, RequirementsGet{WorkspacePath: path, SessionID: id})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(loaded.Requirements, first.Requirements) {
		t.Fatalf("loaded requirements = %#v", loaded.Requirements)
	}
	list, err := svc.ListSessions(ctx, SessionList{WorkspacePath: path})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Sessions) != 1 || !slices.Equal(list.Sessions[0].Requirements, first.Requirements) {
		t.Fatalf("session requirements = %#v", list.Sessions)
	}

	second, err := svc.SaveRequirements(ctx, RequirementsSave{
		WorkspacePath: path,
		SessionID:     id,
		Requirements:  []string{"replacement"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(second.Requirements, []string{"replacement"}) {
		t.Fatalf("replacement = %#v", second.Requirements)
	}
	var updated int64
	if err := doc.QueryRowContext(ctx, "select updated_at from sessions where id = ?", id).Scan(&updated); err != nil {
		t.Fatal(err)
	}
	if updated != now {
		t.Fatalf("session updated_at = %d, want %d", updated, now)
	}

	invalid := []RequirementsSave{
		{WorkspacePath: path, SessionID: id},
		{WorkspacePath: path, SessionID: id, Requirements: []string{" "}},
		{WorkspacePath: path + "-other", SessionID: id, Requirements: []string{"other"}},
		{WorkspacePath: path, SessionID: id + "-missing", Requirements: []string{"other"}},
	}
	for _, req := range invalid {
		if _, err := svc.SaveRequirements(ctx, req); err == nil {
			t.Fatalf("SaveRequirements(%#v) succeeded", req)
		}
	}
	loaded, err = svc.GetRequirements(ctx, RequirementsGet{WorkspacePath: path, SessionID: id})
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(loaded.Requirements, []string{"replacement"}) {
		t.Fatalf("requirements changed after invalid save: %#v", loaded.Requirements)
	}

	empty, err := svc.SaveRequirements(ctx, RequirementsSave{
		WorkspacePath: path,
		SessionID:     id,
		Requirements:  []string{},
	})
	if err != nil {
		t.Fatal(err)
	}
	if empty.Requirements == nil || len(empty.Requirements) != 0 {
		t.Fatalf("empty requirements = %#v", empty.Requirements)
	}
	loaded, err = svc.GetRequirements(ctx, RequirementsGet{WorkspacePath: path, SessionID: id})
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Requirements == nil || len(loaded.Requirements) != 0 {
		t.Fatalf("loaded empty requirements = %#v", loaded.Requirements)
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
