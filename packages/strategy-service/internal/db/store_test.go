package db

import (
	"context"
	"database/sql"
	"testing"
)

func TestInitCreatesWorkspaceReviews(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()

	if err := initdb(doc); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(id, workspace_path, worktree_path, state, summary, items, suggestions, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
		"review_1", "workspace", "worktree", "passed", "one", "[]", "[]", int64(1))
	if err != nil {
		t.Fatal(err)
	}
}

func TestWorkspaceReviewsKeepHistory(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()

	if err := initdb(doc); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(id, workspace_path, worktree_path, state, summary, items, suggestions, updated_at) values
	(?, ?, ?, ?, ?, ?, ?, ?),
	(?, ?, ?, ?, ?, ?, ?, ?)`,
		"review_1", "workspace", "worktree", "failed", "old", "[]", "[]", int64(1),
		"review_2", "workspace", "worktree", "passed", "new", "[]", "[]", int64(2))
	if err != nil {
		t.Fatal(err)
	}

	var count int
	err = doc.QueryRowContext(ctx, "select count(*) from workspace_reviews where workspace_path = ? and worktree_path = ?", "workspace", "worktree").Scan(&count)
	if err != nil {
		t.Fatal(err)
	}
	if count != 2 {
		t.Fatalf("count = %d, want 2", count)
	}
}
