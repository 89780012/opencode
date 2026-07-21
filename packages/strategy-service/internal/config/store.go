package config

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

	"strategy-service/internal/db"
)

type Config struct {
	Theme     Theme     `json:"theme"`
	Logs      Logs      `json:"logs"`
	Workflow  Workflow  `json:"workflow"`
	Workbench Workbench `json:"workbench"`
}

type Theme struct {
	Mode   string `json:"mode"`   //模式
	Accent string `json:"accent"` //主题色
}

type Logs struct {
	Tail int `json:"tail"`
}

type Workflow struct {
	Baseline bool `json:"baseline"`
	Review   bool `json:"review"`
	Debug    bool `json:"debug"`
	Backtest bool `json:"backtest"`
}

type Workbench struct {
	Intake bool `json:"intake"`
}

type Store struct {
	doc *sql.DB
}

// Default 返回默认用户配置。
func Default() Config {
	return Config{
		Theme: Theme{
			Mode:   "dark",
			Accent: "graphite",
		},
		Logs: Logs{
			Tail: 200,
		},
		Workflow: Workflow{
			Baseline: false,
			Review:   false,
			Debug:    false,
			Backtest: false,
		},
		Workbench: Workbench{Intake: false},
	}
}

// Root 返回 strategy-service 状态目录。
func ServerRootDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".strategy-service")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}
	return dir, nil
}

// Load 读取持久化的用户配置。
func (s *Store) LoadUserConfig() (Config, error) {
	doc, err := s.open()
	if err != nil {
		return Default(), err
	}
	cfg := Default()
	err = doc.QueryRow("select theme_mode, theme_accent, logs_tail, workflow_baseline, workflow_review, workflow_debug, workflow_backtest, workbench_intake from config where id = 1").Scan(&cfg.Theme.Mode, &cfg.Theme.Accent, &cfg.Logs.Tail, &cfg.Workflow.Baseline, &cfg.Workflow.Review, &cfg.Workflow.Debug, &cfg.Workflow.Backtest, &cfg.Workbench.Intake)
	if errors.Is(err, sql.ErrNoRows) {
		return cfg, nil
	}
	if err != nil {
		return Default(), err
	}
	return clean(cfg), nil
}

// Save 在规范化后保存用户配置。
func (s *Store) Save(cfg Config) (Config, error) {
	doc, err := s.open()
	if err != nil {
		return Default(), err
	}
	cfg = clean(cfg)
	_, err = doc.Exec(`insert into config(id, theme_mode, theme_accent, logs_tail, workflow_baseline, workflow_review, workflow_debug, workflow_backtest, workbench_intake, updated_at) values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
on conflict(id) do update set theme_mode = excluded.theme_mode, theme_accent = excluded.theme_accent, logs_tail = excluded.logs_tail, workflow_baseline = excluded.workflow_baseline, workflow_review = excluded.workflow_review, workflow_debug = excluded.workflow_debug, workflow_backtest = excluded.workflow_backtest, workbench_intake = excluded.workbench_intake, updated_at = excluded.updated_at`, cfg.Theme.Mode, cfg.Theme.Accent, cfg.Logs.Tail, cfg.Workflow.Baseline, cfg.Workflow.Review, cfg.Workflow.Debug, cfg.Workflow.Backtest, cfg.Workbench.Intake, time.Now().UnixMilli())
	if err != nil {
		return Default(), err
	}
	return cfg, nil
}

func (s *Store) open() (*sql.DB, error) {
	if s != nil && s.doc != nil {
		return s.doc, nil
	}
	return db.Open()
}

func clean(cfg Config) Config {
	out := Default()

	mode := strings.ToLower(strings.TrimSpace(cfg.Theme.Mode))
	if mode == "system" || mode == "light" || mode == "dark" {
		out.Theme.Mode = mode
	}

	accent := strings.ToLower(strings.TrimSpace(cfg.Theme.Accent))
	if accent == "ocean" || accent == "forest" || accent == "ember" || accent == "rose" || accent == "graphite" {
		out.Theme.Accent = accent
	}

	if cfg.Logs.Tail > 0 {
		out.Logs.Tail = clamp(cfg.Logs.Tail)
	}
	out.Workflow.Baseline = cfg.Workflow.Baseline
	out.Workflow.Review = cfg.Workflow.Review
	out.Workflow.Debug = cfg.Workflow.Debug
	out.Workflow.Backtest = cfg.Workflow.Backtest
	out.Workbench.Intake = cfg.Workbench.Intake
	return out
}

func clamp(size int) int {
	if size <= 0 {
		return 200
	}
	if size > 1000 {
		return 1000
	}
	return size
}
