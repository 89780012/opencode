package workflow

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"time"
)

func (s *Service) Steps(runID string) (StepList, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	runID = text(runID)
	if runID == "" {
		return StepList{}, errors.New("run_id is required")
	}
	list, err := s.store.loadSteps()
	if err != nil {
		return StepList{}, err
	}
	out := make([]Step, 0, len(list))
	for _, item := range list {
		if item.RunID == runID {
			out = append(out, item)
		}
	}
	return StepList{Items: out}, nil
}

func (s *Service) Waits(runID string) (WaitList, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	runID = text(runID)
	if runID == "" {
		return WaitList{}, errors.New("run_id is required")
	}
	list, err := s.store.loadWaits()
	if err != nil {
		return WaitList{}, err
	}
	out := make([]Wait, 0, len(list))
	for _, item := range list {
		if item.RunID == runID {
			out = append(out, item)
		}
	}
	return WaitList{Items: out}, nil
}

func (s *Service) Reply(runID string, waitID string, payload json.RawMessage, key string) (Reply, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	runID = text(runID)
	waitID = text(waitID)
	key = text(key)
	if runID == "" {
		return Reply{}, errors.New("run_id is required")
	}
	if waitID == "" {
		return Reply{}, errors.New("wait_id is required")
	}
	if key == "" {
		return Reply{}, errors.New("idempotency_key is required")
	}
	if len(payload) > 0 && !json.Valid(payload) {
		return Reply{}, errors.New("payload must be valid JSON")
	}

	run, err := s.run(runID)
	if err != nil {
		return Reply{}, err
	}
	if run.Status != RunWaiting {
		return Reply{}, errors.New("workflow run is not waiting")
	}

	waits, err := s.store.loadWaits()
	if err != nil {
		return Reply{}, err
	}
	idx := -1
	for i, item := range waits {
		if item.ID == waitID && item.RunID == runID && item.Status == WaitOpen {
			idx = i
			break
		}
	}
	if idx < 0 {
		return Reply{}, errors.New("open wait not found")
	}
	if err := s.respondWait(waits[idx], payload); err != nil {
		return Reply{}, err
	}

	list, err := s.store.loadReplies()
	if err != nil {
		return Reply{}, err
	}
	for _, item := range list {
		if item.WaitID == waitID && item.IdempotencyKey == key {
			return item, nil
		}
	}

	now := time.Now().UnixMilli()
	item := Reply{
		ID:             id("reply"),
		WaitID:         waitID,
		RunID:          runID,
		StepID:         waits[idx].StepID,
		Actor:          ReplyUser,
		Payload:        payload,
		IdempotencyKey: key,
		CreatedAt:      now,
	}
	list = append(list, item)
	waits[idx].Status = WaitAnswered
	waits[idx].AnsweredAt = now
	run.Status = RunRunning
	run.Error = ""
	row, ok := s.lastNodeRun(run.ID, run.CurrentNodeID)
	if ok && row.Status == NodeWaiting {
		row.Status = NodeRunning
		row.Error = ""
		_ = s.putNodeRun(row)
	}

	if err := s.store.saveReplies(list); err != nil {
		return Reply{}, err
	}
	if err := s.store.saveWaits(waits); err != nil {
		return Reply{}, err
	}
	if err := s.putRun(run); err != nil {
		return Reply{}, err
	}
	if err := s.appendTimeline(Timeline{
		ID:        id("event"),
		RunID:     runID,
		StepID:    item.StepID,
		WaitID:    waitID,
		ReplyID:   item.ID,
		Kind:      TimelineReply,
		CreatedAt: now,
	}); err != nil {
		return Reply{}, err
	}
	if s.op != nil {
		s.kick(run.ID)
	}
	return item, nil
}

func (s *Service) respondWait(wait Wait, payload json.RawMessage) error {
	if wait.Source != WaitRuntime || wait.SourceRequestID == "" {
		return nil
	}
	if wait.Kind == "permission" {
		return s.replyPermission(wait.SourceRequestID, payload)
	}
	if wait.Kind == "question" {
		return s.replyQuestion(wait.SourceRequestID, payload)
	}
	return nil
}

func (s *Service) replyPermission(id string, payload json.RawMessage) error {
	u := *s.op.Target()
	u.Path = "/permission/" + id + "/reply"
	req, err := requestJSON(http.MethodPost, u, payload)
	if err != nil {
		return err
	}
	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	return errors.New("opencode permission reply failed")
}

func (s *Service) replyQuestion(id string, payload json.RawMessage) error {
	u := *s.op.Target()
	u.Path = "/question/" + id + "/reply"
	req, err := requestJSON(http.MethodPost, u, payload)
	if err != nil {
		return err
	}
	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	return errors.New("opencode question reply failed")
}

func requestJSON(method string, u url.URL, payload json.RawMessage) (*http.Request, error) {
	body := payload
	if len(body) == 0 {
		body = []byte(`{}`)
	}
	ctx, _ := context.WithTimeout(context.Background(), 20*time.Second)
	req, err := http.NewRequestWithContext(ctx, method, u.String(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

func (s *Service) appendTimeline(item Timeline) error {
	list, err := s.store.loadTimeline()
	if err != nil {
		return err
	}
	return s.store.saveTimeline(append(list, item))
}
