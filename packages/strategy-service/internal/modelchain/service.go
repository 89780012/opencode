package modelchain

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Service struct {
	op      target
	client  *http.Client
	store   db
	mu      sync.Mutex
	prompts map[string]Prompt
	used    map[string]map[string]bool
	swap    map[string]bool
}

var errNil = errors.New("model chain service is nil")

type target interface {
	Target() *url.URL
}

type db interface {
	load() (Config, error)
	save(Config) (Config, error)
}

func NewService(op target) *Service {
	return &Service{
		op:      op,
		client:  &http.Client{},
		store:   &store{},
		prompts: map[string]Prompt{},
		used:    map[string]map[string]bool{},
		swap:    map[string]bool{},
	}
}

func (s *Service) Get() (Config, error) {
	if s == nil {
		return Default(), errNil
	}
	if s.store == nil {
		s.store = &store{}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.store.load()
}

func (s *Service) Save(cfg Config) (Config, error) {
	if s == nil {
		return Default(), errNil
	}
	if s.store == nil {
		s.store = &store{}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	cfg.UpdatedAt = time.Now().UnixMilli()
	return s.store.save(cfg)
}

func (s *Service) Prompt(ctx context.Context, req Prompt) error {
	if s == nil {
		return errNil
	}
	if req.WorkspacePath == "" {
		return fmt.Errorf("workspacePath is required")
	}
	if req.SessionID == "" {
		return fmt.Errorf("sessionId is required")
	}
	if len(req.Parts) == 0 {
		return fmt.Errorf("parts is required")
	}

	cfg, err := s.Get()
	if err != nil {
		return err
	}
	if empty(req.Model) {
		if len(cfg.Chain) == 0 {
			return fmt.Errorf("model chain is required")
		}
		req.Model = cfg.Chain[0]
	}
	if len(cfg.Chain) > 0 {
		req.Model = pick(cfg.Chain, req.Model)
	}
	if empty(req.Model) {
		return fmt.Errorf("model is required")
	}

	s.track(req)
	return s.post(ctx, req, req.Model)
}

func (s *Service) track(req Prompt) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	s.prompts[req.SessionID] = req
	s.used[req.SessionID] = map[string]bool{ref(req.Model): true}
	s.swap[req.SessionID] = false
}

func (s *Service) Event(data []byte) {
	if s == nil {
		return
	}
	var evt event
	if json.Unmarshal(data, &evt) != nil {
		return
	}
	go s.handle(context.Background(), evt)
}

func (s *Service) handle(ctx context.Context, evt event) {
	if s == nil {
		return
	}
	//slog.Info("event session", "event", evt)

	if evt.Type == "session.status" {
		state, ok := evt.Properties["status"].(map[string]any)
		if !ok {
			return
		}
		id := sid(evt.Properties)
		if state["type"] == "busy" {
			s.ready(id)
			return
		}
		msg := fmt.Sprint(state["message"])
		if retry(state) {
			s.fail(ctx, id, msg, true)
		}
		return
	}

	if evt.Type != "session.error" {
		return
	}
	id := sid(evt.Properties)
	err, ok := evt.Properties["error"].(map[string]any)
	if !ok || halted(err) {
		return
	}
	s.fail(ctx, id, text(err), false)
}

func (s *Service) fail(ctx context.Context, sessionID string, msg string, cut bool) {
	if s == nil {
		return
	}
	if sessionID == "" {
		return
	}

	cfg, err := s.Get()
	if err != nil {
		return
	}

	s.mu.Lock()
	req, ok := s.prompts[sessionID]
	used := s.used[sessionID]
	if !ok || s.swap[sessionID] {
		s.mu.Unlock()
		return
	}
	if used == nil {
		used = map[string]bool{}
		s.used[sessionID] = used
	}
	model, ok := next(cfg.Chain, used)
	if !ok {
		s.mu.Unlock()
		slog.Warn("model chain fallback exhausted", "session", sessionID, "error", msg)
		return
	}
	out := Prompt{
		WorkspacePath: req.WorkspacePath,
		SessionID:     req.SessionID,
		Agent:         req.Agent,
		Model:         model,
		Variant:       req.Variant,
		Parts: []map[string]any{{
			"type": "text",
			"text": "继续【模型异常, 切换新模型继续, 当前模型是 "+ref(model)+"】",
		}},
	}
	s.swap[sessionID] = true
	s.used[sessionID][ref(model)] = true
	s.prompts[sessionID] = out
	s.mu.Unlock()

	//发起重试，请求是
	slog.Info("model chain fallback, next", "session", sessionID, "model", ref(model), "swap", s.swap[sessionID], "prompt", s.prompts[sessionID] )

	if cut {
		if err := s.abort(ctx, req); err != nil {
			slog.Warn("model chain abort failed", "session", sessionID, "error", err)
		}
	}

	slog.Info("model chain switch", "session", sessionID, "model", out.Model.ModelID, "provider", out.Model.ProviderID, "error", msg)
	if err := s.post(ctx, out, model); err != nil {
		s.mu.Lock()
		s.swap[sessionID] = false
		s.mu.Unlock()
		slog.Warn("model chain fallback continue failed", "session", sessionID, "model", ref(model), "error", err)
	}
}

func (s *Service) ready(id string) {
	if s == nil {
		return
	}
	if id == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.swap[id] = false
}

func (s *Service) abort(ctx context.Context, req Prompt) error {
	if s == nil || s.op == nil {
		return errNil
	}
	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		s.addr(path("/session/"+url.PathEscape(req.SessionID)+"/abort", req.WorkspacePath)),
		nil,
	)
	if err != nil {
		return err
	}

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("abort failed: %s %s", resp.Status, strings.TrimSpace(string(body)))
	}
	return nil
}

func (s *Service) post(ctx context.Context, req Prompt, model Model) error {
	if s == nil || s.op == nil {
		return errNil
	}
	body := map[string]any{
		"agent": req.Agent,
		"model": model,
		"parts": req.Parts,
	}
	if req.MessageID != "" {
		body["messageID"] = req.MessageID
	}
	if req.Variant != "" {
		body["variant"] = req.Variant
	}

	data, err := json.Marshal(body)
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		s.addr(path("/session/"+url.PathEscape(req.SessionID)+"/prompt_async", req.WorkspacePath)),
		bytes.NewReader(data),
	)
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("prompt failed: %s %s", resp.Status, strings.TrimSpace(string(body)))
	}
	return nil
}

func (s *Service) addr(p string) string {
	if s == nil || s.op == nil {
		return ""
	}
	u := *s.op.Target()
	ref, err := url.Parse(p)
	if err != nil {
		u.Path = strings.TrimRight(u.Path, "/") + p
		return u.String()
	}
	return u.ResolveReference(ref).String()
}

func pick(chain []Model, model Model) Model {
	if empty(model) {
		return chain[0]
	}
	for _, item := range chain {
		if ref(item) == ref(model) {
			return item
		}
	}
	return chain[0]
}

func next(chain []Model, used map[string]bool) (Model, bool) {
	for _, model := range chain {
		if used[ref(model)] {
			continue
		}
		return model, true
	}
	return Model{}, false
}

func path(p string, ws string) string {
	q := url.Values{}
	q.Set("directory", ws)
	return p + "?" + q.Encode()
}

func empty(model Model) bool {
	return model.ProviderID == "" || model.ModelID == ""
}

func ref(model Model) string {
	return model.ProviderID + "/" + model.ModelID
}

func sid(props map[string]any) string {
	return val(props["sessionID"])
}

func text(err map[string]any) string {
	out := []string{}
	if msg := val(err["message"]); msg != "" {
		out = append(out, msg)
	}
	data, ok := err["data"].(map[string]any)
	if !ok {
		return strings.Join(out, " ")
	}
	if msg := val(data["message"]); msg != "" {
		out = append(out, msg)
	}
	if msg := val(data["responseBody"]); msg != "" {
		out = append(out, msg)
	}
	return strings.Join(out, " ")
}

func halted(err map[string]any) bool {
	if strings.Contains(strings.ToLower(val(err["name"])), "aborted") {
		return true
	}
	return strings.Contains(strings.ToLower(text(err)), "aborted")
}

func val(v any) string {
	msg := strings.TrimSpace(fmt.Sprint(v))
	if msg == "<nil>" {
		return ""
	}
	return msg
}

func retry(state map[string]any) bool {
	if val(state["type"]) != "retry" {
		return false
	}
	return attempt(state["attempt"]) == 3
}

func attempt(v any) int {
	n, err := strconv.Atoi(val(v))
	if err != nil {
		return 0
	}
	return n
}
