package backtest

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"sync"
	"testing"
	"time"

	"strategy-service/internal/db"
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
	input  smartx.BacktestInput
}

type broken struct {
	*Store
	id string
}

func TestDefaultUsesPreviousYear(t *testing.T) {
	cfg := Default()
	start, ok := stamp(cfg.StartTime)
	if !ok {
		t.Fatalf("startTime = %q", cfg.StartTime)
	}
	end, ok := stamp(cfg.EndTime)
	if !ok {
		t.Fatalf("endTime = %q", cfg.EndTime)
	}
	if !start.Equal(end.AddDate(-1, 0, 0)) {
		t.Fatalf("window = %q to %q", cfg.StartTime, cfg.EndTime)
	}
}

func TestConfigModesAreExclusive(t *testing.T) {
	legacy := Default()
	legacy.IsTickMode = true
	legacy.UseNewPrice = true
	legacy.Interval = "1d"
	legacy = Clean(legacy)
	if legacy.Interval != "" || !legacy.UseNewPrice {
		t.Fatalf("legacy tick config = %#v", legacy)
	}

	yes := true
	tick := Merge(Default(), ConfigPatch{IsTickMode: &yes, UseNewPrice: &yes})
	if tick.Interval != "" || !tick.IsTickMode || !tick.UseNewPrice {
		t.Fatalf("tick config = %#v", tick)
	}
	if payload(tick)["interval"] != "1d" {
		t.Fatalf("tick payload = %#v", payload(tick))
	}

	bar := "1m"
	next := Merge(tick, ConfigPatch{Interval: &bar})
	if next.Interval != "1m" || next.IsTickMode || next.UseNewPrice {
		t.Fatalf("bar config = %#v", next)
	}

	next = Default()
	next.UseNewPrice = true
	if err := check(next); err == nil {
		t.Fatal("latest price without tick mode was accepted")
	}

	day := "1d"
	if err := compatible(ConfigPatch{IsTickMode: &yes, Interval: &day}); err == nil {
		t.Fatal("conflicting mode patch was accepted")
	}
}

func TestStoreLoadRepairsIncompleteWindow(t *testing.T) {
	_, store := memory(t)
	cfg := Default()
	cfg.StartTime = ""
	cfg.EndTime = "2020-01-01"
	if _, err := store.Save(context.Background(), cfg); err != nil {
		t.Fatal(err)
	}
	cfg, err := store.Load(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	start, _ := stamp(cfg.StartTime)
	end, _ := stamp(cfg.EndTime)
	if !start.Equal(end.AddDate(-1, 0, 0)) {
		t.Fatalf("repaired window = %q to %q", cfg.StartTime, cfg.EndTime)
	}
}

func (b *broken) Update(ctx context.Context, row Run) (Run, error) {
	if row.ID == b.id {
		return Run{}, errors.New("update failed")
	}
	return b.Store.Update(ctx, row)
}

func (c *client) Backtest(ctx context.Context, input smartx.BacktestInput) (smartx.BacktestResult, error) {
	c.mu.Lock()
	c.starts++
	c.input = input
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

func TestRunKeepsManualPluginAndForwardsCompleteConfig(t *testing.T) {
	_, store := memory(t)
	sx := &client{block: true}
	svc := service(store, sx)
	t.Cleanup(func() { shutdown(t, svc) })

	req := request("manual-plugin")
	req.PluginID = "custom-local"
	req.Config.CloseLog = true
	row, err := svc.Run(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if row.PluginID != "custom" {
		t.Fatalf("pluginId = %q", row.PluginID)
	}
	end := time.Now().Add(time.Second)
	for time.Now().Before(end) {
		sx.mu.Lock()
		input := sx.input
		sx.mu.Unlock()
		if input.PluginID != "" {
			if input.PluginID != "custom" || input.Config["closeLog"] != true {
				t.Fatalf("input = %#v", input)
			}
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("backtest input was not captured")
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

func TestRunPatchMergesSavedConfigWithoutPersisting(t *testing.T) {
	_, store := memory(t)
	base := Default()
	base.StartTime = "2026-01-01 09:30"
	base.EndTime = "2026-02-01 15:00"
	base.ShStockSx = 3
	if _, err := store.Save(context.Background(), base); err != nil {
		t.Fatal(err)
	}
	svc := service(store, &client{block: true})
	t.Cleanup(func() { shutdown(t, svc) })

	zero := float64(0)
	yes := true
	row, reason, err := svc.RunPatch(context.Background(), PatchReq{
		WorkspacePath: "workspace",
		SessionID:     "session",
		RequestKey:    "ai:patch",
		Config:        &ConfigPatch{ShStockSx: &zero, CloseLog: &yes},
	})
	if err != nil {
		t.Fatal(err)
	}
	if reason != "created" || row.Status != "pending" {
		t.Fatalf("run = %#v, reason = %q", row, reason)
	}
	if row.Config.ShStockSx != 0 || !row.Config.CloseLog || row.Config.Cash != base.Cash {
		t.Fatalf("merged config = %#v", row.Config)
	}
	saved, err := store.Load(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if saved.ShStockSx != base.ShStockSx || saved.CloseLog {
		t.Fatalf("saved config changed = %#v", saved)
	}
	second, reason, err := svc.RunPatch(context.Background(), PatchReq{
		WorkspacePath: "workspace",
		SessionID:     "session",
		RequestKey:    "ai:patch",
	})
	if err != nil || reason != "idempotent" || second.ID != row.ID {
		t.Fatalf("idempotent run = %#v, reason = %q, err = %v", second, reason, err)
	}
}

func TestRunRejectsMissingOrMismatchedSession(t *testing.T) {
	_, store := memory(t)
	svc := service(store, &client{})
	t.Cleanup(func() { shutdown(t, svc) })

	for _, req := range []RunReq{
		{WorkspacePath: "workspace", SessionID: "missing", RequestKey: "missing", Config: request("x").Config},
		{WorkspacePath: "other", SessionID: "session", RequestKey: "mismatch", Config: request("x").Config},
	} {
		if _, err := svc.Run(context.Background(), req); !errors.Is(err, db.ErrNotFound) {
			t.Fatalf("Run(%#v) error = %v", req, err)
		}
	}
}

func TestDetailIsScopedAndOmitsLargeInternalFields(t *testing.T) {
	_, store := memory(t)
	now := time.Now().UnixMilli()
	row := run("detail", "workspace", "session", "workspace", "detail", now)
	row.Status = "done"
	row.Progress = 100
	row.Config = *request("x").Config
	row.Result = json.RawMessage(`{"large":"result"}`)
	row.Summary = json.RawMessage(`{"total_return":12}`)
	row.DataFiles = json.RawMessage(`{"secret":"file"}`)
	row.LogPath = `C:\\private\\backtest.log`
	if _, _, err := store.Create(context.Background(), row); err != nil {
		t.Fatal(err)
	}
	svc := service(store, &client{})
	t.Cleanup(func() { shutdown(t, svc) })

	detail, err := svc.Detail(context.Background(), ScopedReq{ID: row.ID, WorkspacePath: row.WorkspacePath, SessionID: row.SessionID})
	if err != nil {
		t.Fatal(err)
	}
	if !detail.HasResult || string(detail.Summary) != string(row.Summary) {
		t.Fatalf("detail = %#v", detail)
	}
	body, err := json.Marshal(detail)
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range []string{"large", "secret", "private", "requestKey", "pluginId", "btId"} {
		if strings.Contains(string(body), value) {
			t.Fatalf("detail leaked %q: %s", value, body)
		}
	}
	if _, err := svc.Detail(context.Background(), ScopedReq{ID: row.ID, WorkspacePath: "other", SessionID: row.SessionID}); !errors.Is(err, db.ErrNotFound) {
		t.Fatalf("cross-scope detail error = %v", err)
	}
}

func TestDetailBoundsLargeSummaryAndConfigScope(t *testing.T) {
	_, store := memory(t)
	now := time.Now().UnixMilli()
	row := run("large-summary", "workspace", "session", "workspace", "large-summary", now)
	row.Status = "done"
	row.Summary = json.RawMessage(`{"total_return":"12%","curve":"` + strings.Repeat("x", 32<<10) + `"}`)
	if _, _, err := store.Create(context.Background(), row); err != nil {
		t.Fatal(err)
	}
	svc := service(store, &client{})
	t.Cleanup(func() { shutdown(t, svc) })

	detail, err := svc.Detail(context.Background(), ScopedReq{ID: row.ID, WorkspacePath: row.WorkspacePath, SessionID: row.SessionID})
	if err != nil {
		t.Fatal(err)
	}
	if len(detail.Summary) > 16<<10 || !strings.Contains(string(detail.Summary), `"total_return":"12%"`) || !strings.Contains(string(detail.Summary), `"truncated":true`) {
		t.Fatalf("bounded summary = %s", detail.Summary)
	}
	if _, err := svc.ConfigFor(context.Background(), "workspace", "session"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ConfigFor(context.Background(), "other", "session"); !errors.Is(err, db.ErrNotFound) {
		t.Fatalf("cross-scope config error = %v", err)
	}
}

func TestBriefsCapsListAndOmitsHeavyFields(t *testing.T) {
	_, store := memory(t)
	now := time.Now().UnixMilli()
	for idx := 0; idx < 25; idx++ {
		row := run(fmt.Sprintf("brief-%02d", idx), "workspace", "session", "workspace", fmt.Sprintf("brief-%02d", idx), now+int64(idx))
		row.Status = "done"
		row.Result = json.RawMessage(`{"private":"result"}`)
		row.DataFiles = json.RawMessage(`{"private":"file"}`)
		row.LogPath = `C:\\private\\backtest.log`
		if _, _, err := store.Create(context.Background(), row); err != nil {
			t.Fatal(err)
		}
	}
	svc := service(store, &client{})
	t.Cleanup(func() { shutdown(t, svc) })

	list, err := svc.Briefs(context.Background(), ListReq{WorkspacePath: "workspace", SessionID: "session", Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	if len(list.Runs) != 20 {
		t.Fatalf("brief count = %d", len(list.Runs))
	}
	body, err := json.Marshal(list)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(body), "private") {
		t.Fatalf("brief list leaked heavy fields: %s", body)
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
	_, err = doc.Exec(`create table sessions (
		id text primary key,
		workspace_path text not null
	)`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.Exec(`insert into sessions(id, workspace_path) values ('session', 'workspace')`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = doc.Exec(`create table backtest_config (
		id integer primary key,
		start_time text not null,
		end_time text not null,
		cash real not null,
		sh_stock_sx real not null,
		sh_stock_min_sx real not null,
		sz_stock_sx real not null,
		sz_stock_min_sx real not null,
		sh_stock_gh real not null,
		sz_stock_gh real not null,
		buy_yh real not null,
		sell_yh real not null,
		rf real not null,
		slippage real not null,
		is_tick_mode integer not null,
		use_new_price integer not null,
		interval text not null,
		close_log integer not null,
		updated_at integer not null
	)`)
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
