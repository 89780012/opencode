package backtest

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"strategy-service/internal/db"
)

const columns = `id, workspace_path, session_id, plugin_id, request_key, bt_id, status, status_code, progress, revision, config_json, result_json, summary_json, data_files_json, log_path, error, started_at, finished_at, updated_at`

type Store struct {
	open func() (*sql.DB, error)
}

func (s *Store) db() (*sql.DB, error) {
	if s.open != nil {
		return s.open()
	}
	return db.Open()
}

func (s *Store) Load(ctx context.Context) (Config, error) {
	doc, err := s.db()
	if err != nil {
		return Default(), err
	}
	cfg := Default()
	var tick int
	var price int
	var log int
	err = doc.QueryRowContext(ctx, `select start_time, end_time, cash, sh_stock_sx, sh_stock_min_sx, sz_stock_sx, sz_stock_min_sx, sh_stock_gh, sz_stock_gh, buy_yh, sell_yh, rf, slippage, is_tick_mode, use_new_price, interval, close_log from backtest_config where id = 1`).
		Scan(&cfg.StartTime, &cfg.EndTime, &cfg.Cash, &cfg.ShStockSx, &cfg.ShStockMinSx, &cfg.SzStockSx, &cfg.SzStockMinSx, &cfg.ShStockGh, &cfg.SzStockGh, &cfg.BuyYh, &cfg.SellYh, &cfg.Rf, &cfg.Slippage, &tick, &price, &cfg.Interval, &log)
	if errors.Is(err, sql.ErrNoRows) {
		return s.Save(ctx, cfg)
	}
	if err != nil {
		return Default(), err
	}
	cfg.IsTickMode = tick != 0
	cfg.UseNewPrice = price != 0
	cfg.CloseLog = log != 0
	return Clean(cfg), nil
}

func (s *Store) Save(ctx context.Context, cfg Config) (Config, error) {
	doc, err := s.db()
	if err != nil {
		return Default(), err
	}
	cfg = Clean(cfg)
	_, err = doc.ExecContext(ctx, `insert into backtest_config(id, start_time, end_time, cash, sh_stock_sx, sh_stock_min_sx, sz_stock_sx, sz_stock_min_sx, sh_stock_gh, sz_stock_gh, buy_yh, sell_yh, rf, slippage, is_tick_mode, use_new_price, interval, close_log, updated_at) values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(id) do update set start_time = excluded.start_time, end_time = excluded.end_time, cash = excluded.cash, sh_stock_sx = excluded.sh_stock_sx, sh_stock_min_sx = excluded.sh_stock_min_sx, sz_stock_sx = excluded.sz_stock_sx, sz_stock_min_sx = excluded.sz_stock_min_sx, sh_stock_gh = excluded.sh_stock_gh, sz_stock_gh = excluded.sz_stock_gh, buy_yh = excluded.buy_yh, sell_yh = excluded.sell_yh, rf = excluded.rf, slippage = excluded.slippage, is_tick_mode = excluded.is_tick_mode, use_new_price = excluded.use_new_price, interval = excluded.interval, close_log = excluded.close_log, updated_at = excluded.updated_at`,
		cfg.StartTime, cfg.EndTime, cfg.Cash, cfg.ShStockSx, cfg.ShStockMinSx, cfg.SzStockSx, cfg.SzStockMinSx, cfg.ShStockGh, cfg.SzStockGh, cfg.BuyYh, cfg.SellYh, cfg.Rf, cfg.Slippage, bit(cfg.IsTickMode), bit(cfg.UseNewPrice), cfg.Interval, bit(cfg.CloseLog), time.Now().UnixMilli())
	if err != nil {
		return Default(), err
	}
	return cfg, nil
}

func (s *Store) Create(ctx context.Context, row Run) (Run, bool, error) {
	doc, err := s.db()
	if err != nil {
		return Run{}, false, err
	}
	tx, err := doc.BeginTx(ctx, nil)
	if err != nil {
		return Run{}, false, err
	}
	defer tx.Rollback()

	old, err := scan(tx.QueryRowContext(ctx, `select `+columns+` from backtest_runs where workspace_path = ? and session_id = ? and request_key = ?`, row.WorkspacePath, row.SessionID, row.RequestKey))
	if err == nil {
		return old, true, nil
	}
	if !errors.Is(err, db.ErrNotFound) {
		return Run{}, false, err
	}

	old, err = scan(tx.QueryRowContext(ctx, `select `+columns+` from backtest_runs where status in ('pending', 'running') and ((workspace_path = ? and session_id = ?) or plugin_id = ?) order by updated_at desc limit 1`, row.WorkspacePath, row.SessionID, row.PluginID))
	if err == nil {
		return Run{}, false, &Conflict{Run: old}
	}
	if !errors.Is(err, db.ErrNotFound) {
		return Run{}, false, err
	}

	cfg, err := json.Marshal(row.Config)
	if err != nil {
		return Run{}, false, err
	}
	_, err = tx.ExecContext(ctx, `insert into backtest_runs(id, workspace_path, session_id, plugin_id, request_key, bt_id, status, status_code, progress, revision, config_json, result_json, summary_json, data_files_json, log_path, error, started_at, finished_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		row.ID, row.WorkspacePath, row.SessionID, row.PluginID, row.RequestKey, row.BtID, row.Status, row.StatusCode, row.Progress, row.Revision, string(cfg), string(safe(row.Result)), string(safe(row.Summary)), string(safe(row.DataFiles)), row.LogPath, row.Error, row.StartedAt, row.FinishedAt, row.UpdatedAt)
	if err != nil {
		return Run{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return Run{}, false, err
	}
	return row, false, nil
}

func (s *Store) Update(ctx context.Context, row Run) (Run, error) {
	doc, err := s.db()
	if err != nil {
		return Run{}, err
	}
	cfg, err := json.Marshal(row.Config)
	if err != nil {
		return Run{}, err
	}
	res, err := doc.ExecContext(ctx, `update backtest_runs set plugin_id = ?, bt_id = ?, status = ?, status_code = ?, progress = ?, revision = ?, config_json = ?, result_json = ?, summary_json = ?, data_files_json = ?, log_path = ?, error = ?, finished_at = ?, updated_at = ? where id = ?`,
		row.PluginID, row.BtID, row.Status, row.StatusCode, row.Progress, row.Revision, string(cfg), string(safe(row.Result)), string(safe(row.Summary)), string(safe(row.DataFiles)), row.LogPath, row.Error, row.FinishedAt, row.UpdatedAt, row.ID)
	if err != nil {
		return Run{}, err
	}
	count, err := res.RowsAffected()
	if err != nil {
		return Run{}, err
	}
	if count == 0 {
		return Run{}, db.ErrNotFound
	}
	return row, nil
}

func (s *Store) Get(ctx context.Context, id string) (Run, error) {
	doc, err := s.db()
	if err != nil {
		return Run{}, err
	}
	return scan(doc.QueryRowContext(ctx, `select `+columns+` from backtest_runs where id = ?`, id))
}

func (s *Store) Find(ctx context.Context, workspace string, session string, key string) (Run, error) {
	doc, err := s.db()
	if err != nil {
		return Run{}, err
	}
	return scan(doc.QueryRowContext(ctx, `select `+columns+` from backtest_runs where workspace_path = ? and session_id = ? and request_key = ?`, workspace, session, key))
}

func (s *Store) Active(ctx context.Context) ([]Run, error) {
	doc, err := s.db()
	if err != nil {
		return nil, err
	}
	rows, err := doc.QueryContext(ctx, `select `+columns+` from backtest_runs where status in ('pending', 'running') order by updated_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Run{}
	for rows.Next() {
		row, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Store) List(ctx context.Context, req ListReq) (List, error) {
	doc, err := s.db()
	if err != nil {
		return List{}, err
	}
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	var rows *sql.Rows
	if req.SessionID == "" {
		rows, err = doc.QueryContext(ctx, `select `+columns+` from backtest_runs where workspace_path = ? order by updated_at desc limit ?`, req.WorkspacePath, limit)
	} else {
		rows, err = doc.QueryContext(ctx, `select `+columns+` from backtest_runs where workspace_path = ? and session_id = ? order by updated_at desc limit ?`, req.WorkspacePath, req.SessionID, limit)
	}
	if err != nil {
		return List{}, err
	}
	defer rows.Close()
	out := List{WorkspacePath: req.WorkspacePath, SessionID: req.SessionID}
	for rows.Next() {
		row, err := scan(rows)
		if err != nil {
			return List{}, err
		}
		out.Runs = append(out.Runs, row)
	}
	return out, rows.Err()
}

func scan(row interface {
	Scan(dest ...any) error
}) (Run, error) {
	var out Run
	var cfg string
	var result string
	var summary string
	var files string
	err := row.Scan(&out.ID, &out.WorkspacePath, &out.SessionID, &out.PluginID, &out.RequestKey, &out.BtID, &out.Status, &out.StatusCode, &out.Progress, &out.Revision, &cfg, &result, &summary, &files, &out.LogPath, &out.Error, &out.StartedAt, &out.FinishedAt, &out.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Run{}, db.ErrNotFound
	}
	if err != nil {
		return Run{}, err
	}
	_ = json.Unmarshal([]byte(cfg), &out.Config)
	out.Config = Clean(out.Config)
	out.Result = safe(json.RawMessage(result))
	out.Summary = safe(json.RawMessage(summary))
	out.DataFiles = safe(json.RawMessage(files))
	return out, nil
}

func safe(body json.RawMessage) json.RawMessage {
	if len(body) == 0 || !json.Valid(body) {
		return json.RawMessage("{}")
	}
	return body
}

func bit(value bool) int {
	if value {
		return 1
	}
	return 0
}
