package workbench

import (
	"testing"
	"time"

	"strategy-service/internal/db"
)

func TestGetReviewRestoresMatchingSession(t *testing.T) {
	workspace := t.TempDir()
	svc := &Service{}
	doc, err := db.Open()
	if err != nil {
		t.Fatal(err)
	}
	one := "review-session-one-" + hash(workspace)
	for _, session := range []string{one, "review-session-two-" + hash(workspace)} {
		now := time.Now().UnixNano()
		worktree := workspace
		if session == one {
			worktree = "/"
		}
		_, err = doc.ExecContext(t.Context(), `insert into sessions(id, workspace_path, title, body, analysis, created_at, updated_at) values (?, ?, ?, '{}', '', ?, ?)`, session, workspace, "review recovery", now, now)
		if err != nil {
			t.Fatal(err)
		}
		_, err = svc.SaveReview(t.Context(), ReviewReq{
			WorkspacePath: workspace,
			WorktreePath:  worktree,
			ReviewID:      session,
			SessionID:     session,
			State:         "failed",
			Summary:       session,
			Items:         []ReviewItem{{Name: "风险控制", Status: "failed", Detail: "缺少止损"}},
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	row, err := svc.GetReview(t.Context(), ReviewGet{WorkspacePath: workspace, SessionID: one})
	if err != nil {
		t.Fatal(err)
	}
	if row.SessionID != one || row.Summary != one {
		t.Fatalf("review = %#v", row)
	}
	list, err := svc.ListReviews(t.Context(), ReviewGet{WorkspacePath: workspace, SessionID: one})
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].SessionID != one || list[0].WorktreePath != "/" {
		t.Fatalf("reviews = %#v", list)
	}
}
