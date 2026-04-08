package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type messageList []messageRecord

type messageRecord struct {
	Info  messageInfo   `json:"info"`
	Parts []messagePart `json:"parts"`
}

type messageInfo struct {
	ID   string `json:"id"`
	Role string `json:"role"`
	Time struct {
		Created   int64 `json:"created"`
		Completed int64 `json:"completed"`
	} `json:"time"`
}

type messagePart struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func parse(kind Kind, text string) (Result, error) {
	raw := strings.TrimSpace(text)
	res := Result{
		Raw:  raw,
		Text: raw,
	}
	if kind != Review && kind != Judge {
		return res, nil
	}
	if raw == "" {
		return Result{}, errors.New(string(kind) + " output is empty")
	}

	var body struct {
		Pass       *bool    `json:"pass"`
		Summary    string   `json:"summary"`
		NextPrompt string   `json:"next_prompt"`
		Issues     []string `json:"issues"`
	}
	if err := json.Unmarshal([]byte(raw), &body); err != nil {
		return Result{}, errors.New(string(kind) + " output must be valid JSON")
	}
	if body.Pass == nil {
		return Result{}, errors.New(string(kind) + " output must include boolean pass")
	}

	res.Structured = raw
	res.NextPrompt = strings.TrimSpace(body.NextPrompt)
	res.Pass = body.Pass
	if strings.TrimSpace(body.Summary) != "" {
		res.Text = strings.TrimSpace(body.Summary)
	}
	return res, nil
}

func (s *Service) resolve(dir string, sid string, row NodeRun, node Node) (Result, error) {
	list, err := s.messages(dir, sid)
	if err != nil {
		return Result{}, err
	}

	out := []string{}
	past := row.Anchor.LastMessageID == ""
	for _, item := range list {
		if !past {
			if item.Info.ID == row.Anchor.LastMessageID {
				past = true
			}
			continue
		}
		if item.Info.Role != "assistant" {
			continue
		}
		if row.Anchor.LastMessageID == "" && item.Info.Time.Created < row.Anchor.StartedAt {
			continue
		}
		part := strings.TrimSpace(joinParts(item.Parts))
		if part != "" {
			out = append(out, part)
		}
	}

	return parse(node.Kind, strings.TrimSpace(strings.Join(out, "\n\n")))
}

func (s *Service) completed(row NodeRun) (bool, error) {
	list, err := s.messages("", row.SessionID)
	if err != nil {
		return false, err
	}
	past := row.Anchor.LastMessageID == ""
	for _, item := range list {
		if !past {
			if item.Info.ID == row.Anchor.LastMessageID {
				past = true
			}
			continue
		}
		if item.Info.Role != "assistant" {
			continue
		}
		if row.Anchor.LastMessageID == "" && item.Info.Time.Created < row.Anchor.StartedAt {
			continue
		}
		if item.Info.Time.Completed > 0 {
			return true, nil
		}
	}
	return false, nil
}

func (s *Service) messages(dir string, sid string) (messageList, error) {
	u := *s.op.Target()
	u.Path = "/session/" + sid + "/message"
	q := url.Values{}
	if dir != "" {
		q.Set("directory", dir)
	}
	u.RawQuery = q.Encode()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, errors.New("opencode message list failed")
	}

	var data messageList
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return nil, err
	}
	return data, nil
}

func (s *Service) anchor(dir string, sid string) Anchor {
	list, err := s.messages(dir, sid)
	if err != nil || len(list) == 0 {
		return Anchor{StartedAt: time.Now().UnixMilli()}
	}
	last := list[len(list)-1]
	return Anchor{
		StartedAt:     time.Now().UnixMilli(),
		LastMessageID: last.Info.ID,
	}
}

func joinParts(parts []messagePart) string {
	list := []string{}
	for _, item := range parts {
		if item.Type != "text" {
			continue
		}
		if strings.TrimSpace(item.Text) == "" {
			continue
		}
		list = append(list, item.Text)
	}
	return strings.TrimSpace(strings.Join(list, "\n"))
}
