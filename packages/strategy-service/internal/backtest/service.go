package backtest

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"strategy-service/internal/smartx"
)

type Service struct {
	doc *Store
	sx  *smartx.Service
}

func NewService(sx *smartx.Service) *Service {
	return &Service{
		doc: &Store{},
		sx:  sx,
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
		return List{}, fmt.Errorf("workspacePath is required")
	}
	return s.doc.List(ctx, req)
}

func (s *Service) Get(ctx context.Context, req IDReq) (Run, error) {
	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		return Run{}, fmt.Errorf("id is required")
	}
	return s.doc.Get(ctx, req.ID)
}

func (s *Service) Run(ctx context.Context, req RunReq) (Run, error) {
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.SessionID = strings.TrimSpace(req.SessionID)
	req.PluginID = strings.TrimSpace(req.PluginID)
	if req.WorkspacePath == "" {
		return Run{}, fmt.Errorf("workspacePath is required")
	}
	if req.PluginID == "" {
		req.PluginID = strings.TrimSuffix(filepath.Base(req.WorkspacePath), "-local")
	}
	if req.PluginID == "" || req.PluginID == "." {
		return Run{}, fmt.Errorf("pluginId is required")
	}
	cfg, err := s.doc.Load(ctx)
	if err != nil {
		return Run{}, err
	}
	if req.Config != nil {
		cfg = Clean(*req.Config)
	}
	if cfg.StartTime == "" {
		return Run{}, fmt.Errorf("startTime is required")
	}
	if cfg.EndTime == "" {
		return Run{}, fmt.Errorf("endTime is required")
	}
	now := time.Now().UnixMilli()
	row := Run{
		ID:            next(),
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		PluginID:      req.PluginID,
		Status:        "pending",
		Config:        cfg,
		Result:        json.RawMessage("{}"),
		Summary:       json.RawMessage("{}"),
		DataFiles:     json.RawMessage("{}"),
		StartedAt:     now,
		UpdatedAt:     now,
	}
	row, err = s.doc.Insert(ctx, row)
	if err != nil {
		return Run{}, err
	}
	out, err := s.sx.Backtest(ctx, smartx.BacktestInput{PluginID: req.PluginID, Config: payload(cfg)})
	if err != nil {
		row.Status = "failed"
		row.Error = err.Error()
		row.UpdatedAt = time.Now().UnixMilli()
		row.FinishedAt = row.UpdatedAt
		_, _ = s.doc.Update(context.Background(), row)
		return row, err
	}
	row.BtID = out.BtID
	row.PluginID = strings.TrimSuffix(out.PluginID, "-local")
	row.LogPath = out.LogPath
	row.Result = out.Raw
	row.Status = "running"
	row.Progress = 0
	row.UpdatedAt = time.Now().UnixMilli()
	return s.doc.Update(ctx, row)
}

func (s *Service) Refresh(ctx context.Context, req IDReq) (Run, error) {
	row, err := s.Get(ctx, req)
	if err != nil {
		return Run{}, err
	}
	if row.Status == "done" || row.Status == "failed" {
		return row, nil
	}
	out, err := s.sx.BacktestProgress(ctx, smartx.ProgressInput{PluginID: row.PluginID, BtID: row.BtID})
	if err != nil {
		row.Status = "failed"
		row.Error = err.Error()
		row.FinishedAt = time.Now().UnixMilli()
		row.UpdatedAt = row.FinishedAt
		_, _ = s.doc.Update(context.Background(), row)
		return row, err
	}
	row.StatusCode = out.Status
	row.Progress = out.Progress
	row.Result = out.Raw
	row.Summary = out.Summary
	row.DataFiles = out.DataFiles
	row.Error = ""
	row.UpdatedAt = time.Now().UnixMilli()
	if out.Finished {
		row.Status = "done"
		row.FinishedAt = row.UpdatedAt
	} else if out.Running {
		row.Status = "running"
	} else {
		row.Status = "failed"
		row.Error = fmt.Sprintf("backtest failed: status %.2f", out.Status)
		row.FinishedAt = row.UpdatedAt
	}
	return s.doc.Update(ctx, row)
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
