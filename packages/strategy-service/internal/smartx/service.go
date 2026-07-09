package smartx

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"
)

type Config struct {
	Platform string
	Account  string
	WindowId string
	Password string
	LogDir   string
	Timeout  time.Duration
}

type Service struct {
	cfg Config
}

type Input struct {
	Name string `json:"name"`
}

type Result struct {
	Name     string `json:"name"`
	Account  string `json:"account"`
	WindowId string `json:"window_id"`
	Output   string `json:"output"`
}

type BacktestInput struct {
	PluginID string         `json:"pluginId"`
	Config   map[string]any `json:"config"`
}

type BacktestResult struct {
	BtID     string          `json:"btId"`
	LogPath  string          `json:"logPath"`
	PluginID string          `json:"pluginId"`
	Raw      json.RawMessage `json:"raw"`
	Output   string          `json:"output"`
}

type ProgressInput struct {
	PluginID string `json:"pluginId"`
	BtID     string `json:"btId"`
}

type ProgressResult struct {
	BtID      string          `json:"btId"`
	Status    float64         `json:"status"`
	Progress  float64         `json:"progress"`
	Running   bool            `json:"isRunning"`
	Finished  bool            `json:"isFinished"`
	Summary   json.RawMessage `json:"summary"`
	DataFiles json.RawMessage `json:"dataFiles"`
	Raw       json.RawMessage `json:"raw"`
	Output    string          `json:"output"`
}

type feed struct {
	mu  sync.RWMutex
	buf bytes.Buffer
}

var vt = regexp.MustCompile(`\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]`)

func New(cfg Config) *Service {
	cfg.Platform = norm(cfg.Platform)
	if strings.TrimSpace(cfg.Password) == "" {
		cfg.Password = "123456"
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = 30 * time.Second
	}

	return &Service{cfg: cfg}
}

func (s *Service) Dir() (string, error) {
	return s.logDir()
}

func (s *Service) Start(ctx context.Context, in Input) (Result, error) {
	slog.Info("start strategy", "name", in.Name)
	plat := s.cfg.Platform
	if plat != "windows" && plat != "darwin" {
		return Result{}, fmt.Errorf("unsupported platform: %s", plat)
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return Result{}, errors.New("name is required")
	}
	name = name + "-local"

	account := strings.TrimSpace(s.cfg.Account)
	id := strings.TrimSpace(s.cfg.WindowId)
	//pass := strings.TrimSpace(s.cfg.Password)
	pass := "123456" //登录状态随便写密码

	slog.Info("start strategy", "name", name, "account", account, "id", id, "pass", pass)
	out, err := s.run(ctx, name, account, id, pass)
	if err != nil {
		return Result{}, err
	}

	result := Result{
		Name:     name,
		Account:  account,
		WindowId: id,
		Output:   out,
	}
	slog.Info("start strategy run", "result", result)
	return result, nil
}

func (s *Service) Backtest(ctx context.Context, in BacktestInput) (BacktestResult, error) {
	name := module(in.PluginID)
	if name == "" {
		return BacktestResult{}, errors.New("pluginId is required")
	}
	body, err := json.Marshal(in.Config)
	if err != nil {
		return BacktestResult{}, err
	}
	out, err := s.backtest(ctx, name, string(body))
	if err != nil {
		return BacktestResult{}, err
	}
	raw, err := data(out)
	if err != nil {
		return BacktestResult{}, err
	}
	row := BacktestResult{Raw: raw, Output: out}
	if err := json.Unmarshal(raw, &row); err != nil {
		return BacktestResult{}, err
	}
	return row, nil
}

func (s *Service) BacktestProgress(ctx context.Context, in ProgressInput) (ProgressResult, error) {
	name := module(in.PluginID)
	if name == "" {
		return ProgressResult{}, errors.New("pluginId is required")
	}
	out, err := s.progress(ctx, name, strings.TrimSpace(in.BtID))
	if err != nil {
		return ProgressResult{}, err
	}
	raw, err := data(out)
	if err != nil {
		return ProgressResult{}, err
	}
	row := progressDoc{}
	if err := json.Unmarshal(raw, &row); err != nil {
		return ProgressResult{}, err
	}
	return ProgressResult{
		BtID:      row.BtID,
		Status:    row.Status,
		Progress:  row.Progress,
		Running:   row.Running,
		Finished:  row.Finished || row.Status == 200,
		Summary:   safe(row.Performance.Summary),
		DataFiles: safe(row.Performance.DataFiles),
		Raw:       raw,
		Output:    out,
	}, nil
}

func (f *feed) add(text string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, _ = f.buf.WriteString(text)
}

func (f *feed) text() string {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.buf.String()
}

func (f *feed) size() int {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.buf.Len()
}

func read(buf *feed, src io.Reader) {
	part := make([]byte, 256)
	for {
		n, err := src.Read(part)
		if n > 0 {
			buf.add(string(part[:n]))
		}
		if err != nil {
			return
		}
	}
}

func wait(ctx context.Context, buf *feed, ok []string, bad []string, msg string) error {
	tick := time.NewTicker(100 * time.Millisecond)
	defer tick.Stop()

	for {
		body := strings.ToLower(buf.text())

		for _, item := range bad {
			if strings.Contains(body, strings.ToLower(item)) {
				return errors.New(tidy(buf.text()))
			}
		}

		for _, item := range ok {
			if strings.Contains(body, strings.ToLower(item)) {
				return nil
			}
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("%s: %s", msg, tidy(buf.text()))
		case <-tick.C:
		}
	}
}

func waitTail(ctx context.Context, buf *feed, n int, ok []string, bad []string, msg string) error {
	tick := time.NewTicker(100 * time.Millisecond)
	defer tick.Stop()

	for {
		all := buf.text()
		body := ""
		if n < len(all) {
			body = all[n:]
		}
		body = strings.ToLower(body)

		for _, item := range bad {
			if strings.Contains(body, strings.ToLower(item)) {
				return errors.New(tidy(all))
			}
		}

		for _, item := range ok {
			if strings.Contains(body, strings.ToLower(item)) {
				return nil
			}
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("%s: %s", msg, tidy(all))
		case <-tick.C:
		}
	}
}

func tidy(text string) string {
	text = vt.ReplaceAllString(text, "")
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	text = strings.Map(func(r rune) rune {
		if r == '\n' || r == '\t' {
			return r
		}
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, text)
	return strings.TrimSpace(text)
}

func norm(text string) string {
	text = strings.ToLower(strings.TrimSpace(text))
	if text == "" || text == "windows" || text == "win" || text == "win32" {
		return "windows"
	}
	if text == "darwin" || text == "mac" || text == "macos" || text == "osx" {
		return "darwin"
	}
	return text
}

func module(name string) string {
	name = strings.TrimSpace(name)
	name = strings.TrimSuffix(name, "-local")
	if name == "" {
		return ""
	}
	return name + "-local"
}

func data(text string) (json.RawMessage, error) {
	body := tidy(text)
	idx := strings.LastIndex(body, "data:")
	if idx < 0 {
		return nil, fmt.Errorf("smartx response data not found: %s", body)
	}
	raw := strings.TrimSpace(body[idx+len("data:"):])
	start := strings.Index(raw, "{")
	if start < 0 {
		return nil, fmt.Errorf("smartx response json not found: %s", body)
	}
	raw = raw[start:]
	depth := 0
	end := -1
	for idx, char := range raw {
		if char == '{' {
			depth++
		}
		if char == '}' {
			depth--
			if depth == 0 {
				end = idx + 1
				break
			}
		}
	}
	if end < 0 {
		return nil, fmt.Errorf("smartx response json incomplete: %s", body)
	}
	raw = raw[:end]
	if !json.Valid([]byte(raw)) {
		return nil, fmt.Errorf("smartx response json invalid: %s", raw)
	}
	return json.RawMessage(raw), nil
}

func safe(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 || !json.Valid(raw) {
		return json.RawMessage("{}")
	}
	return raw
}

func login(account string, id string) string {
	return fmt.Sprintf("login %s %s", account, id)
}

func state(name string) string {
	return fmt.Sprintf("status extension %s", name)
}

func halt(name string) string {
	return fmt.Sprintf("closeExtension %s", name)
}

func live(text string) bool {
	body := tidy(text)
	body = strings.ToLower(body)
	body = strings.NewReplacer(" ", "", "\n", "", "\t", "").Replace(body)
	return strings.Contains(body, "extension正在运行") || strings.Contains(body, "extensionisrunning")
}

func startBacktest(name string, body string) string {
	return fmt.Sprintf("startBackTest %s %s", name, body)
}

func queryBacktest(name string, id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Sprintf("queryBackTestProgress %s", name)
	}
	return fmt.Sprintf("queryBackTestProgress %s %s", name, id)
}

type progressDoc struct {
	BtID        string `json:"btId"`
	Status      float64
	Progress    float64 `json:"progress"`
	Running     bool    `json:"isRunning"`
	Finished    bool    `json:"isFinished"`
	Performance struct {
		Summary   json.RawMessage `json:"summary"`
		DataFiles json.RawMessage `json:"dataFiles"`
	} `json:"performance"`
}
