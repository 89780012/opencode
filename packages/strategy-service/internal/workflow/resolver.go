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
	Type   string       `json:"type"`
	Text   string       `json:"text,omitempty"`
	CallID string       `json:"callID,omitempty"`
	Tool   string       `json:"tool,omitempty"`
	State  messageState `json:"state,omitempty"`
}

type messageState struct {
	Status string          `json:"status,omitempty"`
	Input  json.RawMessage `json:"input,omitempty"`
	Output string          `json:"output,omitempty"`
	Error  string          `json:"error,omitempty"`
}

type contractError struct {
	msg string
}

func (e contractError) Error() string {
	return e.msg
}

func retryable(err error) bool {
	var out contractError
	return errors.As(err, &out)
}

func parseTool(kind Kind, raw json.RawMessage) (Result, error) {
	raw = json.RawMessage(strings.TrimSpace(string(raw)))
	if len(raw) == 0 {
		return Result{}, contractError{msg: "tool input is empty"}
	}

	var body struct {
		Kind         string   `json:"kind"`
		Summary      string   `json:"summary"`
		Handoff      string   `json:"handoff"`
		Route        string   `json:"route"`
		Pass         *bool    `json:"pass"`
		Issues       []string `json:"issues"`
		Steps        []string `json:"steps"`
		Deliverables []string `json:"deliverables"`
		Risks        []string `json:"risks"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		return Result{}, contractError{msg: "tool input must be valid JSON"}
	}

	body.Kind = strings.TrimSpace(body.Kind)
	if body.Kind != "" && body.Kind != string(kind) {
		return Result{}, contractError{msg: "tool kind must match workflow node kind"}
	}

	res := Result{
		Raw:          string(raw),
		Text:         strings.TrimSpace(body.Summary),
		Structured:   string(raw),
		Handoff:      strings.TrimSpace(body.Handoff),
		Route:        strings.TrimSpace(body.Route),
		Issues:       cleanList(body.Issues),
		Steps:        cleanList(body.Steps),
		Deliverables: cleanList(body.Deliverables),
		Risks:        cleanList(body.Risks),
	}
	if res.Text == "" && len(res.Steps) > 0 {
		res.Text = strings.Join(res.Steps, "\n")
	}
	if res.Text == "" && len(res.Issues) > 0 {
		res.Text = strings.Join(res.Issues, "\n")
	}

	if kind == Router {
		if res.Route != string(PlanTo) && res.Route != string(ExecuteTo) && res.Route != string(CheckTo) {
			return Result{}, contractError{msg: `router tool input must include route = "plan" | "execute" | "check"`}
		}
		if res.Text == "" {
			res.Text = res.Route
		}
	}

	if kind == Plan && len(res.Steps) == 0 {
		return Result{}, contractError{msg: "plan tool input must include steps"}
	}

	if kind == Check {
		if body.Pass == nil {
			return Result{}, contractError{msg: "check tool input must include boolean pass"}
		}
		res.Pass = body.Pass
	}

	if res.Text == "" {
		return Result{}, contractError{msg: string(kind) + " tool input must include summary or structured items"}
	}
	return res, nil
}

func cleanList(list []string) []string {
	out := make([]string, 0, len(list))
	for _, item := range list {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func (s *Service) resolve(dir string, sid string, row NodeRun, node Node) (Result, error) {
	if strings.TrimSpace(node.ToolID) == "" {
		return Result{}, errors.New("workflow node tool_id is required")
	}

	list, err := s.messages(dir, sid)
	if err != nil {
		return Result{}, err
	}

	past := row.Anchor.LastMessageID == ""
	var done *messagePart
	var fail *messagePart
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
		for _, part := range item.Parts {
			if part.Type != "tool" || strings.TrimSpace(part.Tool) != node.ToolID {
				continue
			}
			part := part
			if part.State.Status == "completed" {
				done = &part
			}
			if part.State.Status == "error" {
				fail = &part
			}
		}
	}

	if done != nil {
		return parseTool(node.Kind, done.State.Input)
	}
	if fail != nil {
		msg := strings.TrimSpace(fail.State.Error)
		if msg == "" {
			msg = "tool execution failed"
		}
		return Result{}, contractError{msg: "required tool " + node.ToolID + " failed: " + msg}
	}
	return Result{}, contractError{msg: "required tool " + node.ToolID + " was not called"}
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
