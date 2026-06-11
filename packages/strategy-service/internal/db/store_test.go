package db

import (
	"context"
	"database/sql"
	"testing"
)

func TestInitMigratesWorkspaceReviews(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()

	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table workspace_reviews (
	workspace_path text not null,
	worktree_path text not null,
	state text not null,
	summary text not null,
	updated_at integer not null,
	primary key(workspace_path, worktree_path)
)`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(workspace_path, worktree_path, state, summary, updated_at) values (?, ?, ?, ?, ?)`,
		"workspace", "worktree", "passed", "summary", int64(1))
	if err != nil {
		t.Fatal(err)
	}

	if err := initdb(doc); err != nil {
		t.Fatal(err)
	}

	var items string
	var tips string
	err = doc.QueryRowContext(ctx, "select items, suggestions from workspace_reviews where workspace_path = ? and worktree_path = ?", "workspace", "worktree").Scan(&items, &tips)
	if err != nil {
		t.Fatal(err)
	}
	if items != "[]" {
		t.Fatalf("items = %q, want []", items)
	}
	if tips != "[]" {
		t.Fatalf("suggestions = %q, want []", tips)
	}

	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(workspace_path, worktree_path, state, summary, items, suggestions, updated_at) values (?, ?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set state = excluded.state, summary = excluded.summary, items = excluded.items, suggestions = excluded.suggestions, updated_at = excluded.updated_at`,
		"workspace", "worktree", "failed", "next", `[{"title":"风险","detail":"说明","severity":"high"}]`, `["处理建议"]`, int64(2))
	if err != nil {
		t.Fatal(err)
	}
}

func TestInitRebuildsWorkspaceReviewsWithoutKey(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()

	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table workspace_reviews (
	workspace_path text not null,
	worktree_path text not null,
	state text not null,
	summary text not null,
	items text not null,
	suggestions text not null,
	updated_at integer not null
)`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(workspace_path, worktree_path, state, summary, items, suggestions, updated_at) values
	(?, ?, ?, ?, ?, ?, ?),
	(?, ?, ?, ?, ?, ?, ?)`,
		"workspace", "worktree", "failed", "old", "[]", "[]", int64(1),
		"workspace", "worktree", "passed", "new", "[]", "[]", int64(2))
	if err != nil {
		t.Fatal(err)
	}

	if err := initdb(doc); err != nil {
		t.Fatal(err)
	}

	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(workspace_path, worktree_path, state, summary, items, suggestions, updated_at) values (?, ?, ?, ?, ?, ?, ?)
on conflict(workspace_path, worktree_path) do update set state = excluded.state, summary = excluded.summary, items = excluded.items, suggestions = excluded.suggestions, updated_at = excluded.updated_at`,
		"workspace", "worktree", "failed", "next", "[]", "[]", int64(3))
	if err != nil {
		t.Fatal(err)
	}

	var count int
	var summary string
	err = doc.QueryRowContext(ctx, "select count(*), max(summary) from workspace_reviews where workspace_path = ? and worktree_path = ?", "workspace", "worktree").Scan(&count, &summary)
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("count = %d, want 1", count)
	}
	if summary != "next" {
		t.Fatalf("summary = %q, want next", summary)
	}
}
