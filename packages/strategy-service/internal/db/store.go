package db

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("db row not found")

var state struct {
	db   *sql.DB
	err  error
	once sync.Once
}

func Open() (*sql.DB, error) {
	state.once.Do(func() {
		path, err := Path()
		if err != nil {
			state.err = err
			return
		}
		db, err := sql.Open("sqlite", path)
		if err != nil {
			state.err = err
			return
		}
		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)
		if err := initdb(db); err != nil {
			_ = db.Close()
			state.err = err
			return
		}
		state.db = db
	})
	return state.db, state.err
}

func Path() (string, error) {
	dir, err := root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "strategy.db"), nil
}

func Close() error {
	if state.db == nil {
		return nil
	}
	return state.db.Close()
}

func initdb(db *sql.DB) error {
	ctx := context.Background()
	_, err := db.ExecContext(ctx, "pragma busy_timeout = 5000")
	if err != nil {
		return err
	}
	_, _ = db.ExecContext(ctx, "pragma journal_mode = wal")
	_, err = db.ExecContext(ctx, "pragma foreign_keys = on")
	if err != nil {
		return err
	}
	for _, stmt := range schema {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func root() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".strategy-service")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

var schema = []string{
	`create table if not exists config (
	id integer primary key check (id = 1),
	theme_mode text not null,
	theme_accent text not null,
	logs_tail integer not null,
	updated_at integer not null
)`,
	`create table if not exists workspaces (
	id text primary key,
	name text not null,
	path text not null unique,
	type text not null,
	template text not null,
	entry_file text not null,
	keywords text not null,
	source text not null,
	managed integer not null,
	updated_at integer not null
)`,
	`create table if not exists sessions (
	id text primary key,
	workspace_path text not null,
	title text not null,
	body text not null,
	analysis text not null default '',
	created_at integer not null,
	updated_at integer not null
)`,
	`create table if not exists workspace_requirements (
	workspace_path text primary key,
	items text not null,
	updated_at integer not null
)`,
	`create table if not exists workspace_analysis (
	workspace_path text not null,
	worktree_path text not null,
	items text not null,
	text text not null,
	updated_at integer not null,
	primary key(workspace_path, worktree_path)
)`,
	`create table if not exists questions (
	id text primary key,
	workspace_path text not null,
	session_id text not null,
	message_id text not null,
	text text not null,
	created_at integer not null
)`,
	`create index if not exists idx_questions_workspace_created on questions(workspace_path, created_at)`,
	`create table if not exists summaries (
	workspace_path text not null,
	session_id text not null,
	summary_session_id text not null,
	state text not null,
	text text not null,
	updated_at integer not null,
	err text not null,
	last_text text not null,
	last_updated_at integer not null,
	primary key(workspace_path, session_id)
)`,
	`create table if not exists model_chain (
	position integer primary key,
	provider_id text not null,
	model_id text not null,
	updated_at integer not null
)`,
}
