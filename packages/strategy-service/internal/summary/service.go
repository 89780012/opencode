package summary

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	oc "strategy-service/internal/opencode"
)

type Service struct {
	doc    *store
	op     *oc.Service
	client *http.Client
	mu     sync.Mutex
	runs   map[string]bool
	stops  map[string]bool
}

type session struct {
	ID       string `json:"id"`
	ParentID string `json:"parentID"`
	Title    string `json:"title"`
}

type record struct {
	Info struct {
		Role string `json:"role"`
	} `json:"info"`
	Parts []part `json:"parts"`
}

type part struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func NewService(op *oc.Service) *Service {
	return &Service{
		doc: &store{},
		op:  op,
		client: &http.Client{
			Timeout: 3 * time.Minute,
		},
		runs:  map[string]bool{},
		stops: map[string]bool{},
	}
}

// 获取该空间摘要信息
func (s *Service) Get(ws string, id string) (Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	idx, err := s.doc.load()
	if err != nil {
		return Entry{}, err
	}
	if entry, ok := find(idx, ws, id); ok {
		return entry, nil
	}
	return Entry{
		WorkspacePath: ws,
		SessionID:     id,
		State:         StateEmpty,
	}, nil
}

func (s *Service) Run(ctx context.Context, req Request) (Entry, error) {
	if req.WorkspacePath == "" {
		return Entry{}, fmt.Errorf("workspacePath is required")
	}
	if req.SessionID == "" {
		return Entry{}, fmt.Errorf("sessionId is required")
	}
	if req.ProviderID == "" {
		return Entry{}, fmt.Errorf("providerID is required")
	}
	if req.ModelID == "" {
		return Entry{}, fmt.Errorf("modelID is required")
	}

	// 获取全部消息
	msgs, err := s.messages(ctx, req.WorkspacePath, req.SessionID)

	if err != nil {
		return Entry{}, err
	}
	count := len(msgs)
	key := req.WorkspacePath + "\x00" + req.SessionID

	s.mu.Lock()
	idx, err := s.doc.load()
	if err != nil {
		s.mu.Unlock()
		return Entry{}, err
	}
	// 找到当前摘要信息
	entry, _ := find(idx, req.WorkspacePath, req.SessionID)
	if entry.State == StateReady && entry.MessageCount == count {
		s.mu.Unlock()
		return entry, nil
	}
	if s.runs[key] {
		if entry.State == "" {
			entry = Entry{WorkspacePath: req.WorkspacePath, SessionID: req.SessionID}
		}
		entry.State = StateRunning
		s.mu.Unlock()
		return entry, nil
	}
	entry.WorkspacePath = req.WorkspacePath
	entry.SessionID = req.SessionID
	entry.State = StateRunning
	entry.Err = ""
	entry.LastText = entry.Text
	entry.LastMessageCount = entry.MessageCount
	entry.LastUpdatedAt = entry.UpdatedAt
	entry.MessageCount = count
	entry.UpdatedAt = time.Now().UnixMilli()
	idx = put(idx, entry)
	if err := s.doc.save(idx); err != nil {
		s.mu.Unlock()
		return Entry{}, err
	}
	s.runs[key] = true
	delete(s.stops, key)
	s.mu.Unlock()

	go s.work(req, entry)
	return entry, nil
}

func (s *Service) Stop(ctx context.Context, ws string, id string) (Entry, error) {
	if ws == "" {
		return Entry{}, fmt.Errorf("workspacePath is required")
	}
	if id == "" {
		return Entry{}, fmt.Errorf("sessionId is required")
	}

	key := ws + "\x00" + id
	var child string

	s.mu.Lock()
	idx, err := s.doc.load()
	if err != nil {
		s.mu.Unlock()
		return Entry{}, err
	}
	entry, _ := find(idx, ws, id)
	if entry.State != StateRunning {
		s.mu.Unlock()
		return entry, nil
	}
	child = entry.SummarySessionID
	s.stops[key] = true
	entry = restore(entry)
	idx = put(idx, entry)
	if err := s.doc.save(idx); err != nil {
		s.mu.Unlock()
		return Entry{}, err
	}
	s.mu.Unlock()

	if child != "" {
		_ = s.post(ctx, s.addr(path("/session/"+url.PathEscape(child)+"/abort", ws)), nil, nil)
	}
	return entry, nil
}

func (s *Service) work(req Request, entry Entry) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	key := req.WorkspacePath + "\x00" + req.SessionID
	defer func() {
		s.mu.Lock()
		delete(s.runs, key)
		delete(s.stops, key)
		s.mu.Unlock()
	}()

	child := entry.SummarySessionID
	if child == "" {
		item, err := s.create(ctx, req.WorkspacePath, req.SessionID)
		if err != nil {
			s.fail(entry, err)
			return
		}
		child = item.ID
		entry.SummarySessionID = child
		s.save(entry)
	}

	msgs, err := s.messages(ctx, req.WorkspacePath, req.SessionID)
	if err != nil {
		s.fail(entry, err)
		return
	}
	text, err := s.prompt(ctx, req, child, msgs)
	if err != nil {
		s.fail(entry, err)
		return
	}
	if s.stopped(key) {
		return
	}
	entry.State = StateReady
	entry.Text = text
	entry.Err = ""
	entry.LastText = ""
	entry.LastMessageCount = 0
	entry.LastUpdatedAt = 0
	entry.UpdatedAt = time.Now().UnixMilli()
	s.save(entry)
}

func (s *Service) messages(ctx context.Context, ws string, id string) ([]record, error) {
	var list []record
	if err := s.get(ctx, s.addr(path("/session/"+url.PathEscape(id)+"/message", ws)), &list); err != nil {
		return nil, err
	}
	return list, nil
}

func (s *Service) create(ctx context.Context, ws string, parent string) (session, error) {
	var out session
	err := s.post(ctx, s.addr(path("/session", ws)), map[string]string{
		"parentID": parent,
		"title":    "__summary__",
	}, &out)
	return out, err
}

func (s *Service) prompt(ctx context.Context, req Request, child string, msgs []record) (string, error) {
	body := map[string]any{
		"agent": "smartx-helper",
		"model": map[string]string{
			"providerID": req.ProviderID,
			"modelID":    req.ModelID,
		},
		"parts": []map[string]string{{
			"type": "text",
			"text": prompt(transcript(msgs)),
		}},
	}
	if req.Variant != "" {
		body["variant"] = req.Variant
	}
	var out record
	if err := s.post(ctx, s.addr(path("/session/"+url.PathEscape(child)+"/message", req.WorkspacePath)), body, &out); err != nil {
		return "", err
	}
	text := strings.TrimSpace(parts(out.Parts))
	if text == "" {
		return "", fmt.Errorf("summary result is empty")
	}
	return text, nil
}

func (s *Service) get(ctx context.Context, addr string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, addr, nil)
	if err != nil {
		return err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return decode(resp, out)
}

func (s *Service) post(ctx context.Context, addr string, body any, out any) error {
	data, err := json.Marshal(body)
	slog.Info(string(data))
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, addr, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return decode(resp, out)
}

func (s *Service) fail(entry Entry, err error) {
	if s.stopped(entry.WorkspacePath + "\x00" + entry.SessionID) {
		return
	}
	entry.State = StateError
	entry.Err = err.Error()
	entry.UpdatedAt = time.Now().UnixMilli()
	s.save(entry)
}

func (s *Service) stopped(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.stops[key]
}

func restore(entry Entry) Entry {
	if entry.LastText == "" {
		entry.State = StateEmpty
		entry.Text = ""
		entry.MessageCount = 0
		entry.UpdatedAt = time.Now().UnixMilli()
		entry.Err = ""
		return entry
	}
	entry.State = StateReady
	entry.Text = entry.LastText
	entry.MessageCount = entry.LastMessageCount
	entry.UpdatedAt = entry.LastUpdatedAt
	entry.Err = ""
	entry.LastText = ""
	entry.LastMessageCount = 0
	entry.LastUpdatedAt = 0
	return entry
}

func (s *Service) save(entry Entry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx, err := s.doc.load()
	if err != nil {
		return
	}
	_ = s.doc.save(put(idx, entry))
}

func (s *Service) addr(path string) string {
	u := *s.op.Target()
	ref, err := url.Parse(path)
	if err != nil {
		u.Path = strings.TrimRight(u.Path, "/") + path
		return u.String()
	}
	return u.ResolveReference(ref).String()
}

func path(p string, ws string) string {
	q := url.Values{}
	q.Set("directory", ws)
	return p + "?" + q.Encode()
}

func prompt(text string) string {
	return strings.TrimSpace(`下面是父业务会话的完整可读内容，请只基于这段内容生成中文总结。

父会话内容：
` + text + `

要求：
- 直接总结上面的父业务会话内容，不要说无法访问父会话。
- 不要调用工具，不要读取 session-log，不要修改文件。
- 按「已完成」「关键结论」「后续建议」分段。
- 如果父会话内容较少，就说明当前会话内容较少。`)
}

func transcript(list []record) string {
	out := make([]string, 0, len(list))
	for _, item := range list {
		text := strings.TrimSpace(parts(item.Parts))
		if text == "" {
			continue
		}
		out = append(out, item.Info.Role+":\n"+text)
	}
	if len(out) == 0 {
		return "（父会话暂无可总结文本内容）"
	}
	return strings.Join(out, "\n\n---\n\n")
}

func parts(list []part) string {
	out := make([]string, 0, len(list))
	for _, item := range list {
		if item.Type == "text" && item.Text != "" {
			out = append(out, item.Text)
		}
	}
	return strings.Join(out, "\n")
}

func decode(resp *http.Response, out any) error {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("opencode request failed: %s", strings.TrimSpace(string(body)))
	}
	if len(body) == 0 || out == nil {
		return nil
	}
	return json.Unmarshal(body, out)
}

func find(idx Index, ws string, id string) (Entry, bool) {
	for _, entry := range idx.Summaries {
		if entry.WorkspacePath == ws && entry.SessionID == id {
			return entry, true
		}
	}
	return Entry{}, false
}

func put(idx Index, entry Entry) Index {
	for i, item := range idx.Summaries {
		if item.WorkspacePath == entry.WorkspacePath && item.SessionID == entry.SessionID {
			idx.Summaries[i] = entry
			return idx
		}
	}
	idx.Summaries = append(idx.Summaries, entry)
	return idx
}
