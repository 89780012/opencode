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

func TestWorkspaceReviewMigrationAddsIdentity(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table workspace_reviews (
		id text primary key,
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
	if err := migrate(ctx, doc); err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatalf("second migration failed: %v", err)
	}
	for _, name := range []string{"review_id", "session_id"} {
		var count int
		if err := doc.QueryRowContext(ctx, `select count(*) from pragma_table_info('workspace_reviews') where name = ?`, name).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("column %s count = %d", name, count)
		}
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at) values
		('one', 'workspace', 'worktree', 'request', 'session', 'passed', 'one', '[]', '[]', 1)`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into workspace_reviews(id, workspace_path, worktree_path, review_id, session_id, state, summary, items, suggestions, updated_at) values
		('two', 'workspace', 'worktree', 'request', 'session', 'passed', 'two', '[]', '[]', 2)`)
	if err == nil {
		t.Fatal("duplicate scoped review id was accepted")
	}
}

func TestBacktestMigrationAddsIdempotencyColumnsAndIndex(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table backtest_runs (
		id text primary key,
		workspace_path text not null,
		session_id text not null,
		plugin_id text not null,
		status text not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatalf("second migration failed: %v", err)
	}
	for _, name := range []string{"request_key", "revision"} {
		var count int
		if err := doc.QueryRowContext(ctx, `select count(*) from pragma_table_info('backtest_runs') where name = ?`, name).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("column %s count = %d", name, count)
		}
	}
	_, err = doc.ExecContext(ctx, `insert into backtest_runs(id, workspace_path, session_id, plugin_id, status, request_key) values
		('one', 'workspace', 'session', 'plugin', 'done', ''),
		('two', 'workspace', 'session', 'plugin', 'done', '')`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into backtest_runs(id, workspace_path, session_id, plugin_id, status, request_key) values ('three', 'workspace', 'session', 'plugin', 'done', 'key')`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into backtest_runs(id, workspace_path, session_id, plugin_id, status, request_key) values ('four', 'workspace', 'session', 'plugin', 'done', 'key')`)
	if err == nil {
		t.Fatal("duplicate scoped request key was accepted")
	}
	_, err = doc.ExecContext(ctx, `insert into backtest_runs(id, workspace_path, session_id, plugin_id, status, request_key) values ('five', 'workspace', 'other', 'plugin', 'done', 'key')`)
	if err != nil {
		t.Fatalf("request key in another session failed: %v", err)
	}
}

func TestConfigMigrationAddsWorkflowSwitches(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table config (
		id integer primary key,
		theme_mode text not null,
		theme_accent text not null,
		logs_tail integer not null,
		updated_at integer not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatalf("second migration failed: %v", err)
	}
	for _, name := range []string{"workflow_baseline", "workflow_review", "workflow_debug", "workflow_backtest", "workbench_intake"} {
		var count int
		if err := doc.QueryRowContext(ctx, `select count(*) from pragma_table_info('config') where name = ?`, name).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("column %s count = %d", name, count)
		}
	}
}

func TestWorkflowMigrationAddsDebugIdentity(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table workflow_runs (
		id text primary key,
		workspace_path text not null,
		session_id text not null,
		code_revision text not null,
		updated_at integer not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatalf("second migration failed: %v", err)
	}
	for _, name := range []string{"debug_cursor", "debug_request_key"} {
		var count int
		if err := doc.QueryRowContext(ctx, `select count(*) from pragma_table_info('workflow_runs') where name = ?`, name).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("column %s count = %d", name, count)
		}
	}
}

func TestConfigMigrationAddsWorkflowBaseline(t *testing.T) {
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer doc.Close()
	ctx := context.Background()
	_, err = doc.ExecContext(ctx, `create table config (
		id integer primary key check (id = 1),
		theme_mode text not null,
		theme_accent text not null,
		logs_tail integer not null,
		updated_at integer not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.ExecContext(ctx, `insert into config(id, theme_mode, theme_accent, logs_tail, updated_at) values (1, 'dark', 'graphite', 200, 1)`)
	if err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatal(err)
	}
	if err := migrate(ctx, doc); err != nil {
		t.Fatalf("second migration failed: %v", err)
	}
	var count int
	if err := doc.QueryRowContext(ctx, `select count(*) from pragma_table_info('config') where name = 'workflow_baseline'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("workflow_baseline column count = %d", count)
	}
	var baseline bool
	var intake bool
	if err := doc.QueryRowContext(ctx, `select workflow_baseline, workbench_intake from config where id = 1`).Scan(&baseline, &intake); err != nil {
		t.Fatal(err)
	}
	if baseline {
		t.Fatal("migrated workflow baseline is enabled")
	}
	if intake {
		t.Fatal("migrated workbench intake is enabled")
	}
}
