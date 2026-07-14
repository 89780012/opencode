package backtest

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/db"
	"strategy-service/internal/smartx"
)

const layout = "2006-01-02 15:04"

type Client interface {
	Backtest(context.Context, smartx.BacktestInput) (smartx.BacktestResult, error)
	BacktestProgress(context.Context, smartx.ProgressInput) (smartx.ProgressResult, error)
}

type repo interface {
	Load(context.Context) (Config, error)
	Save(context.Context, Config) (Config, error)
	Create(context.Context, Run) (Run, bool, error)
	Update(context.Context, Run) (Run, error)
	Get(context.Context, string) (Run, error)
	GetScoped(context.Context, ScopedReq) (Run, error)
	Owns(context.Context, string, string) error
	Find(context.Context, string, string, string) (Run, error)
	Active(context.Context) ([]Run, error)
	List(context.Context, ListReq) (List, error)
}

type Invalid struct {
	Code string
	Msg  string
}

func (e *Invalid) Error() string {
	return e.Msg
}

type Conflict struct {
	Run Run
}

func (e *Conflict) Error() string {
	return "an active backtest already exists"
}

type Service struct {
	doc repo
	sx  Client

	ctx    context.Context
	cancel context.CancelFunc
	life   sync.RWMutex
	mu     sync.Mutex
	wg     sync.WaitGroup
	jobs   map[string]struct{}
	event  func(context.Context, string, json.RawMessage)
	done   chan struct{}
	start  bool
	stop   bool
	wait   bool

	poll   time.Duration
	stable time.Duration
	retry  time.Duration
	max    time.Duration
	tries  int
}

func NewService(sx Client) *Service {
	ctx, cancel := context.WithCancel(context.Background())
	return &Service{
		doc:    &Store{},
		sx:     sx,
		ctx:    ctx,
		cancel: cancel,
		jobs:   map[string]struct{}{},
		done:   make(chan struct{}),
		poll:   2 * time.Second,
		stable: 5 * time.Second,
		retry:  2 * time.Second,
		max:    2 * time.Hour,
		tries:  5,
	}
}

func (s *Service) SetEvent(fn func(context.Context, string, json.RawMessage)) {
	s.mu.Lock()
	s.event = fn
	s.mu.Unlock()
}

func (s *Service) Start() error {
	s.mu.Lock()
	if s.stop {
		s.mu.Unlock()
		return errors.New("backtest service is closed")
	}
	if s.start {
		s.mu.Unlock()
		return nil
	}
	s.start = true
	s.mu.Unlock()

	rows, err := s.doc.Active(s.ctx)
	if err != nil {
		s.mu.Lock()
		s.start = false
		s.mu.Unlock()
		return err
	}
	ids := []string{}
	for _, row := range rows {
		if strings.TrimSpace(row.BtID) != "" {
			ids = append(ids, row.ID)
			continue
		}
		if _, err := s.fail(row, "backtest interrupted before the remote id was saved"); err != nil {
			return err
		}
	}
	for _, id := range ids {
		s.launch(id)
	}
	return nil
}

func (s *Service) Close(ctx context.Context) error {
	s.life.Lock()
	s.mu.Lock()
	if !s.stop {
		s.stop = true
		s.cancel()
	}
	if !s.wait {
		s.wait = true
		go func() {
			s.wg.Wait()
			close(s.done)
		}()
	}
	done := s.done
	s.mu.Unlock()
	s.life.Unlock()

	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func Default() Config {
	now := time.Now()
	return Config{
		StartTime:    now.AddDate(-1, 0, 0).Format(layout),
		EndTime:      now.Format(layout),
		Cash:         10000000,
		ShStockSx:    1.5,
		ShStockMinSx: 5,
		SzStockSx:    1.5,
		SzStockMinSx: 5,
		SellYh:       5,
		Rf:           0.025,
		Interval:     "1d",
	}
}

func Clean(cfg Config) Config {
	out := Default()
	out.StartTime = strings.TrimSpace(cfg.StartTime)
	out.EndTime = strings.TrimSpace(cfg.EndTime)
	out.Cash = positive(cfg.Cash, out.Cash)
	out.ShStockSx = zero(cfg.ShStockSx)
	out.ShStockMinSx = zero(cfg.ShStockMinSx)
	out.SzStockSx = zero(cfg.SzStockSx)
	out.SzStockMinSx = zero(cfg.SzStockMinSx)
	out.ShStockGh = zero(cfg.ShStockGh)
	out.SzStockGh = zero(cfg.SzStockGh)
	out.BuyYh = zero(cfg.BuyYh)
	out.SellYh = zero(cfg.SellYh)
	out.Rf = zero(cfg.Rf)
	out.Slippage = zero(cfg.Slippage)
	out.IsTickMode = cfg.IsTickMode
	out.UseNewPrice = cfg.IsTickMode && cfg.UseNewPrice
	out.CloseLog = cfg.CloseLog
	bar := strings.TrimSpace(cfg.Interval)
	if cfg.IsTickMode {
		out.Interval = ""
		if bar != "" && bar != "1d" && bar != "1m" {
			out.Interval = bar
		}
		return out
	}
	if bar != "" && bar != "1d" {
		out.Interval = bar
	}
	return out
}

func Merge(cfg Config, patch ConfigPatch) Config {
	if patch.StartTime != nil {
		cfg.StartTime = *patch.StartTime
	}
	if patch.EndTime != nil {
		cfg.EndTime = *patch.EndTime
	}
	if patch.Cash != nil {
		cfg.Cash = *patch.Cash
	}
	if patch.ShStockSx != nil {
		cfg.ShStockSx = *patch.ShStockSx
	}
	if patch.ShStockMinSx != nil {
		cfg.ShStockMinSx = *patch.ShStockMinSx
	}
	if patch.SzStockSx != nil {
		cfg.SzStockSx = *patch.SzStockSx
	}
	if patch.SzStockMinSx != nil {
		cfg.SzStockMinSx = *patch.SzStockMinSx
	}
	if patch.ShStockGh != nil {
		cfg.ShStockGh = *patch.ShStockGh
	}
	if patch.SzStockGh != nil {
		cfg.SzStockGh = *patch.SzStockGh
	}
	if patch.BuyYh != nil {
		cfg.BuyYh = *patch.BuyYh
	}
	if patch.SellYh != nil {
		cfg.SellYh = *patch.SellYh
	}
	if patch.Rf != nil {
		cfg.Rf = *patch.Rf
	}
	if patch.Slippage != nil {
		cfg.Slippage = *patch.Slippage
	}
	if patch.IsTickMode != nil {
		cfg.IsTickMode = *patch.IsTickMode
		if cfg.IsTickMode {
			cfg.Interval = ""
		} else {
			cfg.UseNewPrice = false
			if strings.TrimSpace(cfg.Interval) == "" {
				cfg.Interval = "1d"
			}
		}
	}
	if patch.UseNewPrice != nil {
		cfg.UseNewPrice = *patch.UseNewPrice
	}
	if patch.Interval != nil {
		cfg.Interval = strings.TrimSpace(*patch.Interval)
		if cfg.Interval != "" {
			cfg.IsTickMode = false
			cfg.UseNewPrice = false
		}
	}
	if patch.CloseLog != nil {
		cfg.CloseLog = *patch.CloseLog
	}
	return cfg
}

func compatible(patch ConfigPatch) error {
	tick := patch.IsTickMode != nil && *patch.IsTickMode
	bar := patch.Interval != nil && strings.TrimSpace(*patch.Interval) != ""
	price := patch.UseNewPrice != nil && *patch.UseNewPrice
	if tick && bar {
		return issue("invalid_config", "isTickMode and interval cannot be selected together")
	}
	if price && (bar || patch.IsTickMode != nil && !*patch.IsTickMode) {
		return issue("invalid_config", "useNewPrice requires tick mode")
	}
	return nil
}

func (s *Service) Config(ctx context.Context) (Config, error) {
	return s.doc.Load(ctx)
}

func (s *Service) ConfigFor(ctx context.Context, workspace string, session string) (Config, error) {
	workspace = strings.TrimSpace(workspace)
	session = strings.TrimSpace(session)
	if workspace == "" {
		return Config{}, invalid("workspacePath is required")
	}
	if session == "" {
		return Config{}, invalid("sessionId is required")
	}
	if err := s.doc.Owns(ctx, workspace, session); err != nil {
		return Config{}, err
	}
	return s.doc.Load(ctx)
}

func (s *Service) Save(ctx context.Context, cfg Config) (Config, error) {
	cfg = Clean(cfg)
	if err := check(cfg); err != nil {
		return Config{}, err
	}
	return s.doc.Save(ctx, cfg)
}

func (s *Service) List(ctx context.Context, req ListReq) (List, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" {
		return List{}, invalid("workspacePath is required")
	}
	return s.doc.List(ctx, req)
}

func (s *Service) Briefs(ctx context.Context, req ListReq) (BriefList, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.WorkspacePath == "" {
		return BriefList{}, invalid("workspacePath is required")
	}
	if req.SessionID == "" {
		return BriefList{}, invalid("sessionId is required")
	}
	if err := s.doc.Owns(ctx, req.WorkspacePath, req.SessionID); err != nil {
		return BriefList{}, err
	}
	if req.Limit <= 0 {
		req.Limit = 5
	}
	if req.Limit > 20 {
		req.Limit = 20
	}
	rows, err := s.doc.List(ctx, req)
	if err != nil {
		return BriefList{}, err
	}
	out := BriefList{WorkspacePath: req.WorkspacePath, SessionID: req.SessionID, Runs: make([]Brief, 0, len(rows.Runs))}
	for _, row := range rows.Runs {
		out.Runs = append(out.Runs, row.Brief())
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, req IDReq) (Run, error) {
	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return Run{}, invalid("id is required")
	}
	return s.doc.Get(ctx, req.ID)
}

func (s *Service) Detail(ctx context.Context, req ScopedReq) (Detail, error) {
	row, err := s.GetScoped(ctx, req)
	if err != nil {
		return Detail{}, err
	}
	return row.Detail(), nil
}

func (s *Service) GetScoped(ctx context.Context, req ScopedReq) (Run, error) {
	req.ID = strings.TrimSpace(req.ID)
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	if req.ID == "" {
		return Run{}, invalid("id is required")
	}
	if req.WorkspacePath == "" {
		return Run{}, invalid("workspacePath is required")
	}
	if req.SessionID == "" {
		return Run{}, invalid("sessionId is required")
	}
	if err := s.doc.Owns(ctx, req.WorkspacePath, req.SessionID); err != nil {
		return Run{}, err
	}
	row, err := s.doc.GetScoped(ctx, req)
	if err != nil {
		return Run{}, err
	}
	return row, nil
}

func (s *Service) Run(ctx context.Context, req RunReq) (Run, error) {
	row, _, err := s.run(ctx, req, nil)
	return row, err
}

func (s *Service) RunPatch(ctx context.Context, req PatchReq) (Run, string, error) {
	patch := req.Config
	if patch == nil {
		patch = &ConfigPatch{}
	}
	return s.run(ctx, RunReq{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		RequestKey:    req.RequestKey,
	}, patch)
}

func (s *Service) run(ctx context.Context, req RunReq, patch *ConfigPatch) (Run, string, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.PluginID = strings.TrimSpace(req.PluginID)
	req.RequestKey = strings.TrimSpace(req.RequestKey)
	if req.WorkspacePath == "" {
		return Run{}, "", invalid("workspacePath is required")
	}
	if req.SessionID == "" {
		return Run{}, "", invalid("sessionId is required")
	}
	if req.RequestKey == "" {
		return Run{}, "", invalid("requestKey is required")
	}
	if err := s.doc.Owns(ctx, req.WorkspacePath, req.SessionID); err != nil {
		return Run{}, "", err
	}
	if patch != nil {
		req.PluginID = plugin(req.WorkspacePath)
	} else {
		if req.PluginID == "" {
			req.PluginID = plugin(req.WorkspacePath)
		}
		req.PluginID = strings.TrimSuffix(req.PluginID, "-local")
	}
	if req.PluginID == "" || req.PluginID == "." {
		return Run{}, "", invalid("pluginId is required")
	}
	s.life.RLock()
	defer s.life.RUnlock()
	if err := s.alive(); err != nil {
		return Run{}, "", err
	}

	row, err := s.doc.Find(ctx, req.WorkspacePath, req.SessionID, req.RequestKey)
	if err == nil {
		if active(row) && strings.TrimSpace(row.BtID) != "" {
			s.launch(row.ID)
		}
		return row, "idempotent", nil
	}
	if !errors.Is(err, db.ErrNotFound) {
		return Run{}, "", err
	}

	cfg := Default()
	if patch != nil {
		if err := compatible(*patch); err != nil {
			return Run{}, "", err
		}
		cfg, err = s.doc.Load(ctx)
		if err != nil {
			return Run{}, "", err
		}
		cfg = Merge(cfg, *patch)
	} else if req.Config == nil {
		cfg, err = s.doc.Load(ctx)
		if err != nil {
			return Run{}, "", err
		}
	} else {
		cfg = Clean(*req.Config)
	}
	if err := check(cfg); err != nil {
		return Run{}, "", err
	}
	cfg = Clean(cfg)
	now := time.Now().UnixMilli()
	row = Run{
		ID:            next(),
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		PluginID:      req.PluginID,
		RequestKey:    req.RequestKey,
		Status:        "pending",
		Config:        cfg,
		Result:        json.RawMessage("{}"),
		Summary:       json.RawMessage("{}"),
		DataFiles:     json.RawMessage("{}"),
		StartedAt:     now,
		UpdatedAt:     now,
	}
	row, same, err := s.doc.Create(ctx, row)
	if err != nil {
		return Run{}, "", err
	}
	if !same {
		s.emit(row)
	}
	if active(row) && (!same || strings.TrimSpace(row.BtID) != "") {
		s.launch(row.ID)
	}
	if same {
		return row, "idempotent", nil
	}
	return row, "created", nil
}

// Refresh 保留旧接口兼容性，任务进度由后台 Manager 持续更新。
func (s *Service) Refresh(ctx context.Context, req IDReq) (Run, error) {
	return s.Get(ctx, req)
}

func (s *Service) alive() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stop {
		return errors.New("backtest service is closed")
	}
	return nil
}

func (s *Service) launch(id string) {
	s.mu.Lock()
	if s.stop {
		s.mu.Unlock()
		return
	}
	if _, ok := s.jobs[id]; ok {
		s.mu.Unlock()
		return
	}
	s.jobs[id] = struct{}{}
	s.wg.Add(1)
	s.mu.Unlock()

	go func() {
		defer func() {
			s.mu.Lock()
			delete(s.jobs, id)
			s.mu.Unlock()
			s.wg.Done()
		}()
		s.work(id)
	}()
}

func (s *Service) work(id string) {
	row, err := s.doc.Get(s.ctx, id)
	if err != nil || !active(row) {
		return
	}
	end := time.UnixMilli(row.StartedAt).Add(s.max)
	if row.StartedAt == 0 {
		end = time.Now().Add(s.max)
	}
	ctx, cancel := context.WithDeadline(s.ctx, end)
	defer cancel()

	if row.BtID == "" {
		out, err := s.sx.Backtest(ctx, smartx.BacktestInput{PluginID: row.PluginID, Config: payload(row.Config)})
		if err != nil {
			s.failed(ctx, row, err.Error())
			return
		}
		row.BtID = strings.TrimSpace(out.BtID)
		if row.BtID == "" {
			s.failed(ctx, row, "SmartX returned an empty backtest id")
			return
		}
		if name := strings.TrimSuffix(strings.TrimSpace(out.PluginID), "-local"); name != "" {
			row.PluginID = name
		}
		row.LogPath = out.LogPath
		row.Result = safe(out.Raw)
		row.Status = "running"
		row.Error = ""
		row, err = s.change(row)
		if err != nil {
			slog.Error("backtest start persistence failed", "id", row.ID, "error", err)
			return
		}
	} else if row.Status != "running" {
		row.Status = "running"
		row.Error = ""
		row, err = s.change(row)
		if err != nil {
			slog.Error("backtest recovery persistence failed", "id", row.ID, "error", err)
			return
		}
	}
	s.polling(ctx, row)
}

func (s *Service) polling(ctx context.Context, row Run) {
	delay := s.poll
	errs := 0
	count := 0
	for {
		if !sleep(ctx, delay) {
			s.failed(ctx, row, "backtest timed out")
			return
		}
		out, err := s.sx.BacktestProgress(ctx, smartx.ProgressInput{PluginID: row.PluginID, BtID: row.BtID})
		if err != nil {
			if ctx.Err() != nil {
				s.failed(ctx, row, "backtest timed out")
				return
			}
			errs++
			count = 0
			if errs >= s.tries {
				s.failed(ctx, row, err.Error())
				return
			}
			row.Error = err.Error()
			var save error
			row, save = s.change(row)
			if save != nil {
				slog.Error("backtest retry persistence failed", "id", row.ID, "error", save)
				return
			}
			delay = s.retry * time.Duration(1<<(errs-1))
			continue
		}

		errs = 0
		count++
		row.StatusCode = out.Status
		row.Progress = math.Max(row.Progress, clamp(out.Progress))
		row.Result = safe(out.Raw)
		row.Summary = safe(out.Summary)
		row.DataFiles = safe(out.DataFiles)
		row.Error = ""
		if out.Finished {
			row.Status = "done"
			row.Progress = 100
			row.FinishedAt = time.Now().UnixMilli()
		} else if out.Running {
			row.Status = "running"
		} else {
			row.Status = "failed"
			row.Error = fmt.Sprintf("backtest failed: status %.2f", out.Status)
			row.FinishedAt = time.Now().UnixMilli()
		}
		var save error
		row, save = s.change(row)
		if save != nil {
			slog.Error("backtest progress persistence failed", "id", row.ID, "error", save)
			return
		}
		if !active(row) {
			return
		}
		delay = s.poll
		if count >= 3 {
			delay = s.stable
		}
	}
}

func (s *Service) failed(ctx context.Context, row Run, msg string) {
	if s.ctx.Err() != nil {
		return
	}
	if ctx.Err() != nil && !errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return
	}
	if _, err := s.fail(row, msg); err != nil {
		slog.Error("backtest failure persistence failed", "id", row.ID, "error", err)
	}
}

func (s *Service) fail(row Run, msg string) (Run, error) {
	row.Status = "failed"
	row.Error = strings.TrimSpace(msg)
	row.FinishedAt = time.Now().UnixMilli()
	return s.change(row)
}

func (s *Service) change(row Run) (Run, error) {
	row.Progress = clamp(row.Progress)
	row.Revision++
	row.UpdatedAt = time.Now().UnixMilli()
	out, err := s.doc.Update(s.ctx, row)
	if err != nil {
		return Run{}, err
	}
	s.emit(out)
	return out, nil
}

func (s *Service) emit(row Run) {
	s.mu.Lock()
	fn := s.event
	s.mu.Unlock()
	if fn == nil {
		return
	}
	body, err := json.Marshal(Update{
		ID:            row.ID,
		WorkspacePath: row.WorkspacePath,
		SessionID:     row.SessionID,
		Status:        row.Status,
		StatusCode:    row.StatusCode,
		Progress:      row.Progress,
		Error:         row.Error,
		Revision:      row.Revision,
		UpdatedAt:     row.UpdatedAt,
		HasResult:     row.Status == "done",
	})
	if err == nil {
		fn(context.Background(), "backtest.updated", body)
	}
}

func payload(cfg Config) map[string]any {
	bar := cfg.Interval
	// 保持 SmartX 旧版入参结构，由 isTickMode 决定是否使用快照行情。
	if bar == "" {
		bar = "1d"
	}
	return map[string]any{
		"startTime":    cfg.StartTime,
		"endTime":      cfg.EndTime,
		"cash":         cfg.Cash,
		"shStockSx":    cfg.ShStockSx,
		"shStockMinSx": cfg.ShStockMinSx,
		"szStockSx":    cfg.SzStockSx,
		"szStockMinSx": cfg.SzStockMinSx,
		"shStockGh":    cfg.ShStockGh,
		"szStockGh":    cfg.SzStockGh,
		"buyYh":        cfg.BuyYh,
		"sellYh":       cfg.SellYh,
		"rf":           cfg.Rf,
		"slippage":     cfg.Slippage,
		"isTickMode":   cfg.IsTickMode,
		"useNewPrice":  cfg.UseNewPrice,
		"interval":     bar,
		"closeLog":     cfg.CloseLog,
	}
}

func (r Run) Brief() Brief {
	err := ""
	if r.Status == "failed" {
		err = "backtest failed"
	}
	return Brief{
		ID:            r.ID,
		WorkspacePath: r.WorkspacePath,
		SessionID:     r.SessionID,
		Status:        r.Status,
		StatusCode:    r.StatusCode,
		Progress:      r.Progress,
		Revision:      r.Revision,
		Error:         err,
		StartedAt:     r.StartedAt,
		FinishedAt:    r.FinishedAt,
		UpdatedAt:     r.UpdatedAt,
	}
}

func (r Run) Detail() Detail {
	summary := json.RawMessage("{}")
	if r.Status == "done" {
		summary = clip(r.Summary)
	}
	return Detail{
		Brief:     r.Brief(),
		Config:    r.Config,
		Summary:   summary,
		HasResult: r.Status == "done",
	}
}

func clip(body json.RawMessage) json.RawMessage {
	body = safe(body)
	const limit = 16 << 10
	if len(body) <= limit {
		return body
	}
	data := map[string]json.RawMessage{}
	if err := json.Unmarshal(body, &data); err != nil {
		return json.RawMessage(`{"truncated":true}`)
	}
	keys := make([]string, 0, len(data))
	for key := range data {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := map[string]json.RawMessage{"truncated": json.RawMessage("true")}
	for _, key := range keys {
		value := bytes.TrimSpace(data[key])
		if len(value) == 0 || len(value) > 1024 || value[0] == '{' || value[0] == '[' {
			continue
		}
		out[key] = value
		next, err := json.Marshal(out)
		if err != nil || len(next) > limit {
			delete(out, key)
			break
		}
	}
	next, err := json.Marshal(out)
	if err != nil {
		return json.RawMessage(`{"truncated":true}`)
	}
	return next
}

func check(cfg Config) error {
	start := strings.TrimSpace(cfg.StartTime)
	end := strings.TrimSpace(cfg.EndTime)
	if start == "" {
		return issue("needs_config", "startTime is required")
	}
	if end == "" {
		return issue("needs_config", "endTime is required")
	}
	from, ok := stamp(start)
	if !ok {
		return issue("invalid_config", "startTime is invalid")
	}
	to, ok := stamp(end)
	if !ok {
		return issue("invalid_config", "endTime is invalid")
	}
	if !from.Before(to) {
		return issue("invalid_config", "endTime must be later than startTime")
	}
	if math.IsNaN(cfg.Cash) || math.IsInf(cfg.Cash, 0) || cfg.Cash <= 0 {
		return issue("invalid_config", "cash must be greater than zero")
	}
	values := []struct {
		name  string
		value float64
	}{
		{"shStockSx", cfg.ShStockSx},
		{"shStockMinSx", cfg.ShStockMinSx},
		{"szStockSx", cfg.SzStockSx},
		{"szStockMinSx", cfg.SzStockMinSx},
		{"shStockGh", cfg.ShStockGh},
		{"szStockGh", cfg.SzStockGh},
		{"buyYh", cfg.BuyYh},
		{"sellYh", cfg.SellYh},
		{"rf", cfg.Rf},
		{"slippage", cfg.Slippage},
	}
	for _, item := range values {
		if math.IsNaN(item.value) || math.IsInf(item.value, 0) || item.value < 0 {
			return issue("invalid_config", item.name+" must be zero or greater")
		}
	}
	if cfg.IsTickMode {
		if strings.TrimSpace(cfg.Interval) != "" {
			return issue("invalid_config", "interval must be empty in tick mode")
		}
		return nil
	}
	if cfg.UseNewPrice {
		return issue("invalid_config", "useNewPrice requires tick mode")
	}
	if cfg.Interval != "1d" && cfg.Interval != "1m" {
		return issue("invalid_config", "interval must be 1d or 1m")
	}
	return nil
}

func stamp(value string) (time.Time, bool) {
	for _, layout := range []string{
		time.DateOnly,
		"2006-01-02 15:04",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04",
		"2006-01-02T15:04:05",
		time.RFC3339,
	} {
		out, err := time.Parse(layout, value)
		if err == nil {
			return out, true
		}
	}
	return time.Time{}, false
}

func plugin(workspace string) string {
	path := strings.TrimRight(strings.ReplaceAll(strings.TrimSpace(workspace), "\\", "/"), "/")
	return strings.TrimSuffix(filepath.Base(path), "-local")
}

func invalid(msg string) error {
	return issue("invalid_input", msg)
}

func issue(code string, msg string) error {
	return &Invalid{Code: code, Msg: msg}
}

func active(row Run) bool {
	return row.Status == "pending" || row.Status == "running"
}

func clamp(value float64) float64 {
	if math.IsNaN(value) {
		return 0
	}
	if value < 0 {
		return 0
	}
	if value > 100 || math.IsInf(value, 1) {
		return 100
	}
	return value
}

func sleep(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func positive(value float64, fallback float64) float64 {
	if value > 0 {
		return value
	}
	return fallback
}

func zero(value float64) float64 {
	if value > 0 {
		return value
	}
	return 0
}

func next() string {
	body := make([]byte, 8)
	_, _ = rand.Read(body)
	return "bt_" + hex.EncodeToString(body)
}
