package smartx

import (
	"bufio"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type LogFile struct {
	Path      string    `json:"path"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	UpdatedAt time.Time `json:"updated_at"`
	Match     bool      `json:"match,omitempty"`
}

type LogMeta struct {
	Name  string    `json:"name,omitempty"`
	Dir   string    `json:"dir"`
	Limit int       `json:"limit"`
	Files []LogFile `json:"files"`
}

type LogTail struct {
	Path  string   `json:"path"`
	Lines []string `json:"lines"`
}

type LogWatch struct {
	Name    string    `json:"name,omitempty"`
	Dir     string    `json:"dir"`
	Tail    int       `json:"tail"`
	Limit   int       `json:"limit"`
	Seconds int       `json:"seconds"`
	Files   []LogFile `json:"files"`
	Logs    []LogTail `json:"logs"`
}

type DebugResult struct {
	DebugID string   `json:"debugId"`
	State   string   `json:"state"`
	Live    bool     `json:"live"`
	Summary string   `json:"summary"`
	Issues  []string `json:"issues"`
	Logs    []string `json:"logs"`
}

type watch struct {
	off   int64
	part  string
	lines []string
}

func (s *Service) Meta(name string, limit int) (LogMeta, error) {
	dir, err := s.logDir()
	if err != nil {
		return LogMeta{}, err
	}

	limit = logLimit(limit)
	files, err := scanLogs(dir, limit, name)
	if err != nil {
		return LogMeta{}, err
	}

	return LogMeta{
		Name:  strings.TrimSpace(name),
		Dir:   dir,
		Limit: limit,
		Files: files,
	}, nil
}

func (s *Service) Watch(ctx context.Context, name string, tail int, limit int, span time.Duration) (LogWatch, error) {
	return s.watch(ctx, name, tail, limit, span, nil)
}

func (s *Service) WatchDebug(ctx context.Context, id string, tail int, limit int, span time.Duration) (DebugResult, error) {
	s.mu.RLock()
	run, ok := s.debug[strings.TrimSpace(id)]
	s.mu.RUnlock()
	if !ok {
		return DebugResult{}, errors.New("debug run not found")
	}
	watch, err := s.watch(ctx, run.Filter, tail, limit, span, run.Cursor)
	if err != nil {
		return DebugResult{}, err
	}
	issues := debugIssues(watch)
	live := s.Alive(ctx, run.Name)
	state := "passed"
	summary := "策略启动成功，增量日志未发现致命问题。"
	if !live {
		issues = append(issues, "策略进程未保持运行")
	}
	if len(issues) > 0 {
		state = "failed"
		summary = strings.Join(issues, "；")
	}
	return DebugResult{DebugID: run.ID, State: state, Live: live, Summary: summary, Issues: issues, Logs: s.safe(watch.lines())}, nil
}

func (s *Service) watch(ctx context.Context, name string, tail int, limit int, span time.Duration, cursor map[string]int64) (LogWatch, error) {
	dir, err := s.logDir()
	if err != nil {
		return LogWatch{}, err
	}

	tail = logTail(tail)
	limit = logLimit(limit)
	span = logSpan(span)
	item := map[string]*watch{}
	files, err := scanLogs(dir, limit, name)
	if err != nil {
		return LogWatch{}, err
	}
	load := func(next []LogFile) {
		for _, file := range next {
			cur, ok := item[file.Path]
			if !ok {
				if cursor != nil {
					off := cursor[file.Path]
					if file.Size < off {
						off = 0
					}
					lines, part, err := readLines(file.Path, off, "")
					if err != nil {
						continue
					}
					item[file.Path] = &watch{off: file.Size, part: part, lines: shrink(lines, tail)}
					continue
				}
				lines, err := tailFile(file.Path, tail)
				if err != nil {
					continue
				}
				item[file.Path] = &watch{
					off:   file.Size,
					lines: lines,
				}
				continue
			}
			if file.Size == cur.off {
				continue
			}
			if file.Size < cur.off {
				lines, err := tailFile(file.Path, tail)
				if err != nil {
					continue
				}
				cur.off = file.Size
				cur.part = ""
				cur.lines = lines
				continue
			}
			lines, part, err := readLines(file.Path, cur.off, cur.part)
			if err != nil {
				continue
			}
			cur.off = file.Size
			cur.part = part
			cur.lines = shrink(append(cur.lines, lines...), tail)
		}
	}

	load(files)

	deadline := time.NewTimer(span)
	defer deadline.Stop()
	tick := time.NewTicker(500 * time.Millisecond)
	defer tick.Stop()

	for {
		select {
		case <-ctx.Done():
			return LogWatch{}, ctx.Err()
		case <-deadline.C:
			return LogWatch{
				Name:    strings.TrimSpace(name),
				Dir:     dir,
				Tail:    tail,
				Limit:   limit,
				Seconds: int(span / time.Second),
				Files:   files,
				Logs:    packLogs(files, item),
			}, nil
		case <-tick.C:
			files, err = scanLogs(dir, limit, name)
			if err != nil {
				return LogWatch{}, err
			}
			load(files)
		}
	}
}

func debugIssues(watch LogWatch) []string {
	checks := []struct {
		name string
		text string
	}{
		{name: "Python 语法错误", text: "syntaxerror"},
		{name: "Python 运行异常", text: "traceback (most recent call last)"},
		{name: "模块导入失败", text: "modulenotfounderror"},
		{name: "模块导入失败", text: "importerror"},
		{name: "策略启动失败", text: "start extension failed"},
		{name: "策略启动失败", text: "startextension failed"},
		{name: "策略异常退出", text: "process exited"},
		{name: "策略异常退出", text: "extension stopped unexpectedly"},
	}
	body := strings.ToLower(strings.Join(watch.lines(), "\n"))
	out := []string{}
	for _, check := range checks {
		if strings.Contains(body, check.text) && !contains(out, check.name) {
			out = append(out, check.name)
		}
	}
	return out
}

func (w LogWatch) lines() []string {
	out := []string{}
	for _, log := range w.Logs {
		out = append(out, log.Lines...)
	}
	return out
}

func (s *Service) safe(lines []string) []string {
	home := strings.TrimSpace(os.Getenv("SMART_HOME"))
	dir := strings.TrimSpace(s.cfg.LogDir)
	out := make([]string, 0, len(lines))
	for _, line := range shrink(lines, 100) {
		if home != "" {
			line = strings.ReplaceAll(line, home, "<SMART_HOME>")
		}
		if dir != "" {
			line = strings.ReplaceAll(line, dir, "<LOG_DIR>")
		}
		out = append(out, line)
	}
	return out
}

func contains(list []string, text string) bool {
	for _, item := range list {
		if item == text {
			return true
		}
	}
	return false
}

func (s *Service) logDir() (string, error) {
	dir := strings.TrimSpace(s.cfg.LogDir)
	if dir == "" {
		return "", errors.New("smartx log dir is not configured")
	}
	dir = filepath.Clean(dir)
	info, err := os.Stat(dir)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", errors.New("smartx log dir is not a directory")
	}
	return dir, nil
}

func scanLogs(dir string, limit int, name string) ([]LogFile, error) {
	list, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	name = strings.ToLower(strings.TrimSpace(name))
	out := []LogFile{}
	for _, item := range list {
		if item.IsDir() {
			continue
		}
		info, err := item.Info()
		if err != nil {
			continue
		}
		path := filepath.Join(dir, item.Name())
		hit := name != "" && (strings.Contains(strings.ToLower(item.Name()), name) || strings.Contains(strings.ToLower(path), name))
		out = append(out, LogFile{
			Path:      path,
			Name:      item.Name(),
			Size:      info.Size(),
			UpdatedAt: info.ModTime(),
			Match:     hit,
		})
	}

	sort.Slice(out, func(i int, j int) bool {
		if out[i].Match != out[j].Match {
			return out[i].Match
		}
		if !out[i].UpdatedAt.Equal(out[j].UpdatedAt) {
			return out[i].UpdatedAt.After(out[j].UpdatedAt)
		}
		return out[i].Name < out[j].Name
	})

	if len(out) > limit {
		return append([]LogFile{}, out[:limit]...), nil
	}
	return out, nil
}

func tailFile(path string, tail int) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scan := bufio.NewScanner(file)
	scan.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	lines := []string{}
	for scan.Scan() {
		line := logLine(scan.Text())
		if line == "" {
			continue
		}
		lines = append(lines, line)
		lines = shrink(lines, tail)
	}
	if err := scan.Err(); err != nil {
		return nil, err
	}
	return lines, nil
}

func readLines(path string, off int64, part string) ([]string, string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, part, err
	}
	defer file.Close()

	_, err = file.Seek(off, io.SeekStart)
	if err != nil {
		return nil, part, err
	}

	body, err := io.ReadAll(file)
	if err != nil {
		return nil, part, err
	}

	text := part + string(body)
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	if text == "" {
		return nil, "", nil
	}

	hold := ""
	if !strings.HasSuffix(text, "\n") {
		idx := strings.LastIndex(text, "\n")
		if idx < 0 {
			return nil, text, nil
		}
		hold = text[idx+1:]
		text = text[:idx]
	}

	out := []string{}
	for _, line := range strings.Split(text, "\n") {
		line = logLine(line)
		if line == "" {
			continue
		}
		out = append(out, line)
	}

	return out, hold, nil
}

func shrink(lines []string, tail int) []string {
	if len(lines) <= tail {
		return lines
	}
	return append([]string{}, lines[len(lines)-tail:]...)
}

func packLogs(files []LogFile, item map[string]*watch) []LogTail {
	out := []LogTail{}
	for _, file := range files {
		cur := item[file.Path]
		if cur == nil || len(cur.lines) == 0 {
			continue
		}
		out = append(out, LogTail{
			Path:  file.Path,
			Lines: append([]string{}, cur.lines...),
		})
	}
	return out
}

func logLine(text string) string {
	text = strings.TrimRight(text, "\r")
	text = strings.Map(func(r rune) rune {
		if r == '\t' {
			return r
		}
		if r < 32 {
			return -1
		}
		return r
	}, text)
	return strings.TrimSpace(text)
}

func logTail(size int) int {
	if size <= 0 {
		return 200
	}
	if size > 1000 {
		return 1000
	}
	return size
}

func logLimit(size int) int {
	if size <= 0 {
		return 3
	}
	if size > 10 {
		return 10
	}
	return size
}

func logSpan(span time.Duration) time.Duration {
	if span <= 0 {
		return 10 * time.Second
	}
	if span > 30*time.Second {
		return 30 * time.Second
	}
	return span
}
