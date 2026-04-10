package workflow

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type waitKind string

const (
	waitDone    waitKind = "done"
	waitFailed  waitKind = "failed"
	waitWaiting waitKind = "waiting"
	waitTimeout waitKind = "timeout"
)

type waitResult struct {
	Kind      waitKind
	WaitKind  string
	Mode      WaitMode
	Error     string
	RequestID string
	Schema    json.RawMessage
}

type event struct {
	Type       string          `json:"type"`
	Properties json.RawMessage `json:"properties"`
}

func (s *Service) waitSession(dir string, sid string, row NodeRun, timeout time.Duration) waitResult {
	if done, err := s.completed(row); err == nil && done {
		return waitResult{Kind: waitDone}
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	u := *s.op.Target()
	u.Path = "/event"
	q := url.Values{}
	q.Set("directory", dir)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return waitResult{Kind: waitFailed, Error: err.Error()}
	}
	req.Header.Set("Accept", "text/event-stream")

	res, err := s.stream.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return waitResult{Kind: waitTimeout}
		}
		return waitResult{Kind: waitFailed, Error: err.Error()}
	}
	defer res.Body.Close()

	scan := bufio.NewScanner(res.Body)
	scan.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scan.Scan() {
		line := strings.TrimSpace(scan.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}

		raw := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if raw == "" {
			continue
		}

		var evt event
		if err := json.Unmarshal([]byte(raw), &evt); err != nil {
			continue
		}

		switch evt.Type {
		case "session.idle":
			var body struct {
				SessionID string `json:"sessionID"`
			}
			if json.Unmarshal(evt.Properties, &body) == nil && body.SessionID == sid {
				return waitResult{Kind: waitDone}
			}
		case "session.error":
			var body struct {
				SessionID string `json:"sessionID"`
				Error     struct {
					Data map[string]any `json:"data"`
				} `json:"error"`
			}
			if json.Unmarshal(evt.Properties, &body) == nil && body.SessionID == sid {
				msg := "session failed"
				if text, ok := body.Error.Data["message"].(string); ok && strings.TrimSpace(text) != "" {
					msg = strings.TrimSpace(text)
				}
				return waitResult{Kind: waitFailed, Error: msg}
			}
		case "permission.asked":
			var body struct {
				ID        string `json:"id"`
				SessionID string `json:"sessionID"`
			}
			if json.Unmarshal(evt.Properties, &body) == nil && body.SessionID == sid {
				return waitResult{Kind: waitWaiting, WaitKind: "permission", Mode: WaitApproval, RequestID: body.ID, Schema: evt.Properties}
			}
		case "question.asked":
			var body struct {
				ID        string `json:"id"`
				SessionID string `json:"sessionID"`
			}
			if json.Unmarshal(evt.Properties, &body) == nil && body.SessionID == sid {
				return waitResult{Kind: waitWaiting, WaitKind: "question", Mode: WaitForm, RequestID: body.ID, Schema: evt.Properties}
			}
		}
	}

	if errors.Is(scan.Err(), context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return waitResult{Kind: waitTimeout}
	}
	if scan.Err() != nil {
		return waitResult{Kind: waitFailed, Error: scan.Err().Error()}
	}
	return waitResult{Kind: waitTimeout}
}
