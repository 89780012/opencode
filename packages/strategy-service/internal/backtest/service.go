package backtest

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/db"
	"strategy-service/internal/smartx"
)

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
	Find(context.Context, string, string, string) (Run, error)
	Active(context.Context) ([]Run, error)
	List(context.Context, ListReq) (List, error)
}

type Invalid struct {
	Msg string
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
	return Config{
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
	out.UseNewPrice = cfg.UseNewPrice
	out.CloseLog = cfg.CloseLog
	if cfg.Interval == "1m" {
		out.Interval = "1m"
	}
	return out
}

func (s *Service) Config(ctx context.Context) (Config, error) {
	return s.doc.Load(ctx)
}

func (s *Service) Save(ctx context.Context, cfg Config) (Config, error) {
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

func (s *Service) Get(ctx context.Context, req IDReq) (Run, error) {
	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return Run{}, invalid("id is required")
	}
	return s.doc.Get(ctx, req.ID)
}

func (s *Service) Run(ctx context.Context, req RunReq) (Run, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.PluginID = strings.TrimSpace(req.PluginID)
	req.RequestKey = strings.TrimSpace(req.RequestKey)
	if req.WorkspacePath == "" {
		return Run{}, invalid("workspacePath is required")
	}
	if req.SessionID == "" {
		return Run{}, invalid("sessionId is required")
	}
	if req.RequestKey == "" {
		return Run{}, invalid("requestKey is required")
	}
	if req.PluginID == "" {
		req.PluginID = strings.TrimSuffix(filepath.Base(req.WorkspacePath), "-local")
	}
	req.PluginID = strings.TrimSuffix(req.PluginID, "-local")
	if req.PluginID == "" || req.PluginID == "." {
		return Run{}, invalid("pluginId is required")
	}
	s.life.RLock()
	defer s.life.RUnlock()
	if err := s.alive(); err != nil {
		return Run{}, err
	}

	row, err := s.doc.Find(ctx, req.WorkspacePath, req.SessionID, req.RequestKey)
	if err == nil {
		if active(row) && strings.TrimSpace(row.BtID) != "" {
			s.launch(row.ID)
		}
		return row, nil
	}
	if !errors.Is(err, db.ErrNotFound) {
		return Run{}, err
	}

	cfg := Default()
	if req.Config == nil {
		cfg, err = s.doc.Load(ctx)
		if err != nil {
			return Run{}, err
		}
	} else {
		cfg = Clean(*req.Config)
	}
	if cfg.StartTime == "" {
		return Run{}, invalid("startTime is required")
	}
	if cfg.EndTime == "" {
		return Run{}, invalid("endTime is required")
	}
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
		return Run{}, err
	}
	if !same {
		s.emit(row)
	}
	if active(row) && (!same || strings.TrimSpace(row.BtID) != "") {
		s.launch(row.ID)
	}
	return row, nil
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
		"interval":     cfg.Interval,
	}
}

func invalid(msg string) error {
	return &Invalid{Msg: msg}
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
