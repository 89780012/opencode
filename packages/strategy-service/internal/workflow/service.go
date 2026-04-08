package workflow

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/oprun"
)

type Service struct {
	op     *oprun.Manager
	store  *store
	client *http.Client
	stream *http.Client
	mu     sync.Mutex
	live   map[string]bool
}

func New(op *oprun.Manager) *Service {
	return &Service{
		op:    op,
		store: &store{},
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
		stream: &http.Client{},
		live:   map[string]bool{},
	}
}

func (s *Service) List() (List, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	list, err := s.store.loadFlows()
	if err != nil {
		return List{}, err
	}
	return List{Items: list}, nil
}

func (s *Service) Get(id string) (Workflow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.get(id)
}

func (s *Service) Save(item Workflow) (Workflow, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	list, err := s.store.loadFlows()
	if err != nil {
		return Workflow{}, err
	}

	item.ID = text(item.ID)
	if item.ID == "" {
		item.ID = id("wf")
	}
	item.UpdatedAt = time.Now().UnixMilli()
	item = cleanFlows([]Workflow{item})[0]
	if err := validate(item); err != nil {
		return Workflow{}, err
	}

	hit := false
	next := make([]Workflow, 0, len(list)+1)
	for _, row := range list {
		if row.ID != item.ID {
			next = append(next, row)
			continue
		}
		next = append(next, item)
		hit = true
	}
	if !hit {
		next = append(next, item)
	}
	if err := s.store.saveFlows(next); err != nil {
		return Workflow{}, err
	}
	return item, nil
}

func (s *Service) Runs(workflowID string) (RunList, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	list, err := s.store.loadRuns()
	if err != nil {
		return RunList{}, err
	}
	if workflowID == "" {
		return RunList{Items: list}, nil
	}

	out := make([]Run, 0, len(list))
	for _, item := range list {
		if item.WorkflowID == workflowID {
			out = append(out, item)
		}
	}
	return RunList{Items: out}, nil
}

func (s *Service) Run(id string) (Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.run(id)
}

func (s *Service) NodeRuns(runID string) (NodeRunList, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.nodeRuns(runID)
}

func (s *Service) Start(wid string, input string) (StartResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	flow, err := s.get(wid)
	if err != nil {
		return StartResult{}, err
	}
	if err := validate(flow); err != nil {
		return StartResult{}, err
	}
	node, ok := pickNode(flow, flow.RootNodeID)
	if !ok {
		return StartResult{}, errors.New("workflow root node not found")
	}
	if text(flow.WorkspacePath) == "" {
		return StartResult{}, errors.New("workflow workspace_path is required")
	}

	run := Run{
		ID:            id("run"),
		WorkflowID:    flow.ID,
		WorkspacePath: flow.WorkspacePath,
		Status:        RunRunning,
		CurrentNodeID: node.ID,
		Input:         strings.TrimSpace(input),
		StartedAt:     time.Now().UnixMilli(),
	}

	if err := s.putRun(run); err != nil {
		return StartResult{}, err
	}
	row, err := s.queue(flow, &run, node, 0, run.Input, "", "")
	if err != nil {
		run.Status = RunFailed
		run.Error = err.Error()
		run.EndedAt = time.Now().UnixMilli()
		_ = s.putRun(run)
		return StartResult{}, err
	}

	if run.Status == RunRunning {
		s.kick(run.ID)
	}
	return StartResult{Run: run, NodeRun: row}, nil
}

func (s *Service) Continue(id string) (ContinueResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	run, err := s.run(id)
	if err != nil {
		return ContinueResult{}, err
	}
	if run.Status != RunBlocked && run.Status != RunRunning {
		return ContinueResult{}, errors.New("workflow run is not resumable")
	}
	if run.Status == RunBlocked {
		run.Status = RunRunning
		run.Error = ""
		if err := s.putRun(run); err != nil {
			return ContinueResult{}, err
		}
	}
	s.kick(run.ID)
	return ContinueResult{Run: run}, nil
}

func (s *Service) kick(runID string) {
	if s.live[runID] {
		return
	}
	s.live[runID] = true
	go s.exec(runID)
}

func (s *Service) exec(runID string) {
	defer func() {
		s.mu.Lock()
		delete(s.live, runID)
		s.mu.Unlock()
	}()

	for {
		s.mu.Lock()
		run, err := s.run(runID)
		if err != nil {
			s.mu.Unlock()
			return
		}
		if run.Status == RunFailed || run.Status == RunDone || run.Status == RunPending {
			s.mu.Unlock()
			return
		}

		flow, err := s.get(run.WorkflowID)
		if err != nil {
			run.Status = RunFailed
			run.Error = err.Error()
			run.EndedAt = time.Now().UnixMilli()
			_ = s.putRun(run)
			s.mu.Unlock()
			return
		}
		node, ok := pickNode(flow, run.CurrentNodeID)
		if !ok {
			run.Status = RunFailed
			run.Error = "workflow node not found"
			run.EndedAt = time.Now().UnixMilli()
			_ = s.putRun(run)
			s.mu.Unlock()
			return
		}
		row, ok := s.lastNodeRun(run.ID, run.CurrentNodeID)
		if !ok {
			run.Status = RunFailed
			run.Error = "workflow node run not found"
			run.EndedAt = time.Now().UnixMilli()
			_ = s.putRun(run)
			s.mu.Unlock()
			return
		}
		s.mu.Unlock()

		if row.Status == NodeRunning || row.Status == NodeBlocked {
			wait := s.waitSession(run.WorkspacePath, row.SessionID, row, timeout(node))
			s.mu.Lock()
			run, err = s.run(runID)
			if err != nil {
				s.mu.Unlock()
				return
			}
			row, ok = s.lastNodeRun(run.ID, run.CurrentNodeID)
			if !ok {
				s.mu.Unlock()
				return
			}
			switch wait.Kind {
			case waitBlocked:
				row.Status = NodeBlocked
				row.Error = wait.Reason
				_ = s.putNodeRun(row)
				run.Status = RunBlocked
				run.Error = wait.Reason
				_ = s.putRun(run)
				s.mu.Unlock()
				return
			case waitFailed:
				row.Status = NodeFailed
				row.Error = wait.Error
				row.EndedAt = time.Now().UnixMilli()
				_ = s.putNodeRun(row)
				run.Status = RunFailed
				run.Error = wait.Error
				run.EndedAt = row.EndedAt
				_ = s.putRun(run)
				s.mu.Unlock()
				return
			case waitTimeout:
				row.Status = NodeTimeout
				row.Error = "node timed out"
				row.EndedAt = time.Now().UnixMilli()
				_ = s.putNodeRun(row)
				run.Status = RunFailed
				run.Error = row.Error
				run.EndedAt = row.EndedAt
				_ = s.putRun(run)
				s.mu.Unlock()
				return
			default:
				res, err := s.resolve(run.WorkspacePath, row.SessionID, row, node)
				if err != nil {
					row.Status = NodeFailed
					row.Error = err.Error()
					row.EndedAt = time.Now().UnixMilli()
					_ = s.putNodeRun(row)
					run.Status = RunFailed
					run.Error = err.Error()
					run.EndedAt = row.EndedAt
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}
				row.Status = NodeDone
				row.Result = res
				row.Output = res.Raw
				row.Error = ""
				row.EndedAt = time.Now().UnixMilli()
				_ = s.putNodeRun(row)

				nextID, feedback := next(flow, node, res)
				if nextID == "" {
					run.Status = RunDone
					run.EndedAt = time.Now().UnixMilli()
					run.Error = ""
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}

				nextNode, ok := pickNode(flow, nextID)
				if !ok {
					run.Status = RunFailed
					run.Error = "next workflow node not found"
					run.EndedAt = time.Now().UnixMilli()
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}

				if nextNode.Kind == Build && (node.Kind == Review || node.Kind == Judge) && row.Result.Pass != nil && !*row.Result.Pass {
					run.Loop++
				}
				if run.Loop > 3 {
					run.Status = RunFailed
					run.Error = "review loop limit reached"
					run.EndedAt = time.Now().UnixMilli()
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}
				if _, err := s.queue(flow, &run, nextNode, row.Turn+1, run.Input, row.Result.Text, feedback); err != nil {
					run.Status = RunFailed
					run.Error = err.Error()
					run.EndedAt = time.Now().UnixMilli()
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}
				s.mu.Unlock()
				continue
			}
		}

		if row.Status == NodeDone {
			s.mu.Lock()
			run.Status = RunDone
			run.EndedAt = time.Now().UnixMilli()
			_ = s.putRun(run)
			s.mu.Unlock()
			return
		}
		return
	}
}

func (s *Service) ensure() error {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	return s.op.Ensure(ctx)
}

func (s *Service) get(id string) (Workflow, error) {
	list, err := s.store.loadFlows()
	if err != nil {
		return Workflow{}, err
	}
	for _, item := range list {
		if item.ID == id {
			return item, nil
		}
	}
	return Workflow{}, errors.New("workflow not found")
}

func (s *Service) run(id string) (Run, error) {
	list, err := s.store.loadRuns()
	if err != nil {
		return Run{}, err
	}
	for _, item := range list {
		if item.ID == id {
			return item, nil
		}
	}
	return Run{}, errors.New("workflow run not found")
}

func (s *Service) nodeRuns(runID string) (NodeRunList, error) {
	list, err := s.store.loadNodeRuns()
	if err != nil {
		return NodeRunList{}, err
	}
	out := make([]NodeRun, 0, len(list))
	for _, item := range list {
		if item.RunID == runID {
			out = append(out, item)
		}
	}
	return NodeRunList{Items: out}, nil
}

func (s *Service) lastNodeRun(runID string, nodeID string) (NodeRun, bool) {
	list, err := s.store.loadNodeRuns()
	if err != nil {
		return NodeRun{}, false
	}
	var out NodeRun
	hit := false
	for _, item := range list {
		if item.RunID != runID || item.NodeID != nodeID {
			continue
		}
		if !hit || item.StartedAt >= out.StartedAt {
			out = item
			hit = true
		}
	}
	return out, hit
}

func auto(kind Kind) bool {
	return kind == Start || kind == End
}

func (s *Service) session(dir string, run *Run, node Node) (string, error) {
	if node.Session == Shared && run.RootSessionID != "" {
		return run.RootSessionID, nil
	}
	if err := s.ensure(); err != nil {
		return "", err
	}
	sid, err := s.createSession(dir)
	if err != nil {
		return "", err
	}
	if node.Session == Shared {
		run.RootSessionID = sid
	}
	return sid, nil
}

func (s *Service) queue(
	flow Workflow,
	run *Run,
	node Node,
	turn int,
	input string,
	upstream string,
	feedback string,
) (NodeRun, error) {
	for {
		now := time.Now().UnixMilli()
		if auto(node.Kind) {
			row := NodeRun{
				ID:        id("node"),
				RunID:     run.ID,
				NodeID:    node.ID,
				Status:    NodeDone,
				Turn:      turn,
				StartedAt: now,
				EndedAt:   now,
			}
			if err := s.putNodeRun(row); err != nil {
				return NodeRun{}, err
			}

			run.CurrentNodeID = node.ID
			run.Error = ""
			if node.Kind == End {
				run.Status = RunDone
				run.EndedAt = now
				if err := s.putRun(*run); err != nil {
					return NodeRun{}, err
				}
				return row, nil
			}

			nextID, nextFeedback := next(flow, node, row.Result)
			if nextID == "" {
				run.Status = RunDone
				run.EndedAt = now
				if err := s.putRun(*run); err != nil {
					return NodeRun{}, err
				}
				return row, nil
			}

			nextNode, ok := pickNode(flow, nextID)
			if !ok {
				return NodeRun{}, errors.New("next workflow node not found")
			}

			run.Status = RunRunning
			run.CurrentNodeID = nextNode.ID
			if err := s.putRun(*run); err != nil {
				return NodeRun{}, err
			}

			node = nextNode
			turn++
			upstream = row.Result.Text
			feedback = nextFeedback
			continue
		}

		sid, err := s.session(flow.WorkspacePath, run, node)
		if err != nil {
			return NodeRun{}, err
		}
		prompt := buildPrompt(flow, node, input, upstream, feedback)
		row := NodeRun{
			ID:        id("node"),
			RunID:     run.ID,
			NodeID:    node.ID,
			SessionID: sid,
			Status:    NodeRunning,
			Turn:      turn,
			Input:     prompt,
			StartedAt: now,
			Anchor:    s.anchor(flow.WorkspacePath, sid),
		}

		run.Status = RunRunning
		run.CurrentNodeID = node.ID
		run.Error = ""
		run.EndedAt = 0
		if err := s.putRun(*run); err != nil {
			return NodeRun{}, err
		}
		if err := s.putNodeRun(row); err != nil {
			return NodeRun{}, err
		}
		if err := s.sendPrompt(flow.WorkspacePath, sid, node, prompt); err != nil {
			row.Status = NodeFailed
			row.Error = err.Error()
			row.EndedAt = time.Now().UnixMilli()
			run.Status = RunFailed
			run.Error = err.Error()
			run.EndedAt = row.EndedAt
			_ = s.putNodeRun(row)
			_ = s.putRun(*run)
			return NodeRun{}, err
		}
		return row, nil
	}
}

func (s *Service) putRun(item Run) error {
	list, err := s.store.loadRuns()
	if err != nil {
		return err
	}
	hit := false
	next := make([]Run, 0, len(list)+1)
	for _, row := range list {
		if row.ID != item.ID {
			next = append(next, row)
			continue
		}
		next = append(next, item)
		hit = true
	}
	if !hit {
		next = append(next, item)
	}
	return s.store.saveRuns(next)
}

func (s *Service) putNodeRun(item NodeRun) error {
	list, err := s.store.loadNodeRuns()
	if err != nil {
		return err
	}
	hit := false
	next := make([]NodeRun, 0, len(list)+1)
	for _, row := range list {
		if row.ID != item.ID {
			next = append(next, row)
			continue
		}
		next = append(next, item)
		hit = true
	}
	if !hit {
		next = append(next, item)
	}
	return s.store.saveNodeRuns(next)
}

func pickNode(flow Workflow, id string) (Node, bool) {
	for _, item := range flow.Nodes {
		if item.ID == id {
			return item, true
		}
	}
	return Node{}, false
}

func buildPrompt(flow Workflow, node Node, input string, upstream string, feedback string) string {
	parts := []string{}
	if input != "" {
		parts = append(parts, "User objective:\n"+input)
	}
	if upstream != "" {
		parts = append(parts, "Upstream summary:\n"+upstream)
	}
	if feedback != "" {
		parts = append(parts, "Review feedback:\n"+feedback)
	}
	parts = append(parts, "Workflow node:\n"+node.Title)
	if node.Prompt != "" {
		parts = append(parts, "Node instructions:\n"+node.Prompt)
	}
	if node.Kind == Review || node.Kind == Judge {
		parts = append(parts, `Output contract:
Return JSON with keys pass, summary, issues, next_prompt.`)
	}
	if flow.Name != "" {
		parts = append(parts, "Workflow:\n"+flow.Name)
	}
	return strings.TrimSpace(strings.Join(parts, "\n\n"))
}

func next(flow Workflow, node Node, res Result) (string, string) {
	check := Always
	if node.Kind == Review || node.Kind == Judge {
		check = Pass
		if res.Pass != nil && !*res.Pass {
			check = Fail
		}
	}

	for _, item := range flow.Edges {
		if item.From != node.ID {
			continue
		}
		if item.Cond == check {
			return item.To, res.NextPrompt
		}
	}
	for _, item := range flow.Edges {
		if item.From == node.ID && item.Cond == Always {
			return item.To, res.NextPrompt
		}
	}
	return "", res.NextPrompt
}

func timeout(node Node) time.Duration {
	if node.TimeoutMS > 0 {
		return time.Duration(node.TimeoutMS) * time.Millisecond
	}
	return 30 * time.Minute
}

func (s *Service) createSession(dir string) (string, error) {
	u := *s.op.Target()
	u.Path = "/session"
	q := url.Values{}
	q.Set("directory", dir)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, u.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", errors.New("opencode session create failed")
	}

	var data struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return "", err
	}
	if data.ID == "" {
		return "", errors.New("opencode session id missing")
	}
	return data.ID, nil
}

func (s *Service) sendPrompt(dir string, sid string, node Node, prompt string) error {
	u := *s.op.Target()
	u.Path = "/session/" + sid + "/prompt_async"
	q := url.Values{}
	q.Set("directory", dir)
	u.RawQuery = q.Encode()

	body := map[string]any{
		"agent": node.Agent,
		"parts": []map[string]any{
			{
				"type": "text",
				"text": prompt,
			},
		},
	}
	buf, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, u.String(), bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	return errors.New("opencode prompt submit failed")
}
