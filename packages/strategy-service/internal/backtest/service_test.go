package backtest

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"sync"
	"testing"
	"time"

	"strategy-service/internal/smartx"

	_ "modernc.org/sqlite"
)

type step struct {
	row smartx.ProgressResult
	err error
}

type client struct {
	mu     sync.Mutex
	start  smartx.BacktestResult
	err    error
	steps  []step
	starts int
	polls  int
	block  bool
}

type broken struct {
	*Store
	id string
}

func (b *broken) Update(ctx context.Context, row Run) (Run, error) {
	if row.ID == b.id {
		return Run{}, errors.New("update failed")
	}
	return b.Store.Update(ctx, row)
}

func (c *client) Backtest(ctx context.Context, _ smartx.BacktestInput) (smartx.BacktestResult, error) {
	c.mu.Lock()
	c.starts++
	block := c.block
	row := c.start
	err := c.err
	c.mu.Unlock()
	if block {
		<-ctx.Done()
		return smartx.BacktestResult{}, ctx.Err()
	}
	return row, err
}

func (c *client) BacktestProgress(ctx context.Context, _ smartx.ProgressInput) (smartx.ProgressResult, error) {
	c.mu.Lock()
	c.polls++
	if len(c.steps) == 0 {
		c.mu.Unlock()
		<-ctx.Done()
		return smartx.ProgressResult{}, ctx.Err()
	}
	next := c.steps[0]
	c.steps = c.steps[1:]
	c.mu.Unlock()
	return next.row, next.err
}

func TestStoreCreateIsIdempotentAndRejectsActiveConflicts(t *testing.T) {
	doc, store := memory(t)
	now := time.Now().UnixMilli()
	row := run("one", "workspace", "session", "plugin", "key", now)
	got, same, err := store.Create(context.Background(), row)
	if err != nil || same || got.ID != row.ID {
		t.Fatalf("create = (%s, %t, %v)", got.ID, same, err)
	}
	got, same, err = store.Create(context.Background(), run("two", "workspace", "session", "plugin", "key", now+1))
	if err != nil || !same || got.ID != row.ID {
		t.Fatalf("idempotent create = (%s, %t, %v)", got.ID, same, err)
	}

	_, _, err = store.Create(context.Background(), run("three", "workspace", "session", "other", "other", now+2))
	var conflict *Conflict
	if !errors.As(err, &conflict) || conflict.Run.ID != row.ID {
		t.Fatalf("session conflict = %#v", err)
	}
	_, _, err = store.Create(context.Background(), run("four", "other", "other", "plugin", "other", now+3))
	if !errors.As(err, &conflict) || conflict.Run.ID != row.ID {
		t.Fatalf("plugin conflict = %#v", err)
	}

	if err := doc.Ping(); err != nil {
		t.Fatal(err)
	}
}

func TestRunReturnsPendingAndUsesSingleWorker(t *testing.T) {
	_, store := memory(t)
	sx := &client{block: true}
	svc := service(store, sx)
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	req := request("key")
	first, err := svc.Run(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if first.Status != "pending" || first.BtID != "" {
		t.Fatalf("first = %#v", first)
	}
	second, err := svc.Run(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if second.ID != first.ID {
		t.Fatalf("idempotent id = %s, want %s", second.ID, first.ID)
	}

	_, err = svc.Run(context.Background(), request("other"))
	var conflict *Conflict
	if !errors.As(err, &conflict) || conflict.Run.ID != first.ID {
		t.Fatalf("conflict = %#v", err)
	}
	time.Sleep(10 * time.Millisecond)
	sx.mu.Lock()
	starts := sx.starts
	sx.mu.Unlock()
	if starts != 1 {
		t.Fatalf("starts = %d, want 1", starts)
	}
}

func TestRunDoesNotRestartIdempotentPendingWithoutRemoteID(t *testing.T) {
	_, store := memory(t)
	sx := &client{block: true}
	svc := service(store, sx)
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	want := run("uncertain", "workspace", "session", "plugin", "key", time.Now().UnixMilli())
	if _, _, err := store.Create(context.Background(), want); err != nil {
		t.Fatal(err)
	}
	got, err := svc.Run(context.Background(), request("key"))
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != want.ID || got.BtID != "" || got.Status != "pending" {
		t.Fatalf("run = %#v", got)
	}

	svc.mu.Lock()
	jobs := len(svc.jobs)
	svc.mu.Unlock()
	if jobs != 0 {
		t.Fatalf("jobs = %d, want 0", jobs)
	}
	sx.mu.Lock()
	starts := sx.starts
	sx.mu.Unlock()
	if starts != 0 {
		t.Fatalf("starts = %d, want 0", starts)
	}
}

func TestManagerRetriesAndKeepsProgressMonotonic(t *testing.T) {
	_, store := memory(t)
	sx := &client{
		start: smartx.BacktestResult{BtID: "remote", PluginID: "plugin-local", Raw: json.RawMessage(`{"btId":"remote"}`)},
		steps: []step{
			{row: smartx.ProgressResult{Status: 0, Progress: 50, Running: true, Raw: json.RawMessage(`{"progress":50}`)}},
			{err: errors.New("temporary query failure")},
			{row: smartx.ProgressResult{Status: 0, Progress: 20, Running: true, Raw: json.RawMessage(`{"progress":20}`)}},
			{row: smartx.ProgressResult{Status: 200, Progress: 99, Finished: true, Raw: json.RawMessage(`{"progress":99}`), Summary: json.RawMessage(`{"return":1}`)}},
		},
	}
	svc := service(store, sx)
	svc.poll = time.Millisecond
	svc.stable = time.Millisecond
	svc.retry = time.Millisecond
	svc.tries = 3
	var mu sync.Mutex
	revisions := []int64{}
	svc.SetEvent(func(ctx context.Context, kind string, body json.RawMessage) {
		if kind != "backtest.updated" {
			t.Errorf("event kind = %s", kind)
			return
		}
		var evt Update
		if err := json.Unmarshal(body, &evt); err != nil {
			t.Error(err)
			return
		}
		row, err := store.Get(ctx, evt.ID)
		if err != nil || row.Revision < evt.Revision {
			t.Errorf("event emitted before persistence: row=%#v err=%v event=%#v", row, err, evt)
		}
		mu.Lock()
		revisions = append(revisions, evt.Revision)
		mu.Unlock()
	})
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	row, err := svc.Run(context.Background(), request("retry"))
	if err != nil {
		t.Fatal(err)
	}
	row = await(t, store, row.ID, "done")
	if row.Progress != 100 {
		t.Fatalf("progress = %v, want 100", row.Progress)
	}
	if row.Error != "" {
		t.Fatalf("error = %q", row.Error)
	}
	sx.mu.Lock()
	polls := sx.polls
	sx.mu.Unlock()
	if polls != 4 {
		t.Fatalf("polls = %d, want 4", polls)
	}
	mu.Lock()
	defer mu.Unlock()
	for idx := 1; idx < len(revisions); idx++ {
		if revisions[idx] <= revisions[idx-1] {
			t.Fatalf("revisions are not increasing: %v", revisions)
		}
	}
}

func TestManagerFailsEmptyRemoteID(t *testing.T) {
	_, store := memory(t)
	svc := service(store, &client{})
	svc.poll = time.Millisecond
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	row, err := svc.Run(context.Background(), request("empty"))
	if err != nil {
		t.Fatal(err)
	}
	row = await(t, store, row.ID, "failed")
	if row.Error != "SmartX returned an empty backtest id" {
		t.Fatalf("error = %q", row.Error)
	}
}

func TestManagerTimesOut(t *testing.T) {
	_, store := memory(t)
	sx := &client{start: smartx.BacktestResult{BtID: "remote"}}
	svc := service(store, sx)
	svc.poll = time.Millisecond
	svc.max = 10 * time.Millisecond
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	row, err := svc.Run(context.Background(), request("timeout"))
	if err != nil {
		t.Fatal(err)
	}
	row = await(t, store, row.ID, "failed")
	if row.Error != "backtest timed out" {
		t.Fatalf("error = %q", row.Error)
	}
}

func TestClampRejectsInvalidProgress(t *testing.T) {
	for value, want := range map[float64]float64{
		math.NaN():   0,
		math.Inf(1):  100,
		math.Inf(-1): 0,
		-1:           0,
		101:          100,
	} {
		if got := clamp(value); got != want {
			t.Fatalf("clamp(%v) = %v, want %v", value, got, want)
		}
	}
}

func TestStartRecoversRemoteRunsAndFailsUncertainPendingRuns(t *testing.T) {
	_, store := memory(t)
	now := time.Now().UnixMilli()
	running := run("running", "workspace-a", "session-a", "plugin-a", "key-a", now)
	running.Status = "running"
	running.BtID = "remote"
	pending := run("pending", "workspace-b", "session-b", "plugin-b", "key-b", now)
	if _, _, err := store.Create(context.Background(), running); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Create(context.Background(), pending); err != nil {
		t.Fatal(err)
	}
	sx := &client{steps: []step{{row: smartx.ProgressResult{Status: 200, Finished: true}}}}
	svc := service(store, sx)
	svc.poll = time.Millisecond
	if err := svc.Start(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { shutdown(t, svc) })

	await(t, store, running.ID, "done")
	failed := await(t, store, pending.ID, "failed")
	if failed.Error == "" {
		t.Fatal("pending recovery error is empty")
	}
	sx.mu.Lock()
	starts := sx.starts
	polls := sx.polls
	sx.mu.Unlock()
	if starts != 0 || polls != 1 {
		t.Fatalf("calls = start:%d poll:%d", starts, polls)
	}
}

func TestStartDoesNotLaunchRecoveryBeforeClassificationCompletes(t *testing.T) {
	_, store := memory(t)
	now := time.Now().UnixMilli()
	running := run("running", "workspace-a", "session-a", "plugin-a", "key-a", now)
	running.Status = "running"
	running.BtID = "remote"
	pending := run("pending", "workspace-b", "session-b", "plugin-b", "key-b", now+1)
	if _, _, err := store.Create(context.Background(), running); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Create(context.Background(), pending); err != nil {
		t.Fatal(err)
	}

	svc := NewService(&client{})
	svc.doc = &broken{Store: store, id: pending.ID}
	if err := svc.Start(); err == nil {
		t.Fatal("start succeeded after recovery persistence failure")
	}
	svc.mu.Lock()
	jobs := len(svc.jobs)
	svc.mu.Unlock()
	if jobs != 0 {
		t.Fatalf("jobs = %d, want 0", jobs)
	}
	shutdown(t, svc)
}

func service(store *Store, sx Client) *Service {
	svc := NewService(sx)
	svc.doc = store
	svc.max = time.Second
	return svc
}

func memory(t *testing.T) (*sql.DB, *Store) {
	t.Helper()
	doc, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	doc.SetMaxOpenConns(1)
	_, err = doc.Exec(`create table backtest_runs (
		id text primary key,
		workspace_path text not null,
		session_id text not null,
		plugin_id text not null,
		request_key text not null,
		bt_id text not null default '',
		status text not null,
		status_code real not null default 0,
		progress real not null default 0,
		revision integer not null default 0,
		config_json text not null default '{}',
		result_json text not null default '{}',
		summary_json text not null default '{}',
		data_files_json text not null default '{}',
		log_path text not null default '',
		error text not null default '',
		started_at integer not null,
		finished_at integer not null default 0,
		updated_at integer not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = doc.Close() })
	return doc, &Store{open: func() (*sql.DB, error) { return doc, nil }}
}

func request(key string) RunReq {
	cfg := Default()
	cfg.StartTime = "2026-01-01"
	cfg.EndTime = "2026-02-01"
	return RunReq{WorkspacePath: "workspace", SessionID: "session", PluginID: "plugin", RequestKey: key, Config: &cfg}
}

func run(id string, workspace string, session string, plugin string, key string, now int64) Run {
	return Run{
		ID: id, WorkspacePath: workspace, SessionID: session, PluginID: plugin, RequestKey: key,
		Status: "pending", Config: Default(), Result: json.RawMessage("{}"), Summary: json.RawMessage("{}"),
		DataFiles: json.RawMessage("{}"), StartedAt: now, UpdatedAt: now,
	}
}

func await(t *testing.T, store *Store, id string, status string) Run {
	t.Helper()
	end := time.Now().Add(time.Second)
	for time.Now().Before(end) {
		row, err := store.Get(context.Background(), id)
		if err == nil && row.Status == status {
			return row
		}
		time.Sleep(time.Millisecond)
	}
	row, err := store.Get(context.Background(), id)
	t.Fatalf("run %s = %#v, err=%v, want status %s", id, row, err, status)
	return Run{}
}

func shutdown(t *testing.T, svc *Service) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := svc.Close(ctx); err != nil {
		t.Error(err)
	}
}
