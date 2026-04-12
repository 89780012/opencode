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

	"strategy-service/internal/asset"
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
	if err := validateSave(item); err != nil {
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

func (s *Service) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	list, err := s.store.loadFlows()
	if err != nil {
		return err
	}

	hit := false
	flows := make([]Workflow, 0, len(list))
	for _, item := range list {
		if item.ID == id {
			hit = true
			continue
		}
		flows = append(flows, item)
	}
	if !hit {
		return errors.New("workflow not found")
	}

	runs, err := s.store.loadRuns()
	if err != nil {
		return err
	}
	keep := make([]Run, 0, len(runs))
	ids := map[string]bool{}
	for _, item := range runs {
		if item.WorkflowID == id {
			ids[item.ID] = true
			continue
		}
		keep = append(keep, item)
	}

	rows, err := s.store.loadNodeRuns()
	if err != nil {
		return err
	}
	nodes := make([]NodeRun, 0, len(rows))
	for _, item := range rows {
		if ids[item.RunID] {
			continue
		}
		nodes = append(nodes, item)
	}

	if err := s.store.saveFlows(flows); err != nil {
		return err
	}
	if err := s.store.saveRuns(keep); err != nil {
		return err
	}
	return s.store.saveNodeRuns(nodes)
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

func (s *Service) Start(wid string, path string, input string) (StartResult, error) {
	return s.StartWith(wid, path, input, "")
}

func (s *Service) StartWith(wid string, path string, input string, sid string) (StartResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.start(wid, path, input, sid)
}

func (s *Service) WorkspaceState(path string) (WorkspaceSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, _, err := s.workspaceState(path)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	run, err := s.syncState(&item)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	return WorkspaceSnapshot{
		State: item,
		Run:   run,
	}, nil
}

func (s *Service) BindWorkspace(path string, wid string, pid string, mid string, variant string) (WorkspaceSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	path = text(path)
	if path == "" {
		return WorkspaceSnapshot{}, errors.New("workspace_path is required")
	}
	wid = text(wid)
	if wid == "" {
		return WorkspaceSnapshot{}, errors.New("workflow_id is required")
	}
	pid = text(pid)
	mid = text(mid)
	variant = text(variant)
	if (pid == "") != (mid == "") {
		return WorkspaceSnapshot{}, errors.New("workspace default model requires both default_model_provider_id and default_model_id")
	}
	if pid == "" {
		variant = ""
	}
	if _, err := s.get(wid); err != nil {
		return WorkspaceSnapshot{}, err
	}

	item, _, err := s.workspaceState(path)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	item.WorkflowID = wid
	item.DefaultModelProviderID = pid
	item.DefaultModelID = mid
	item.DefaultVariant = variant
	item.UpdatedAt = time.Now().UnixMilli()
	if err := s.putWorkspaceState(item); err != nil {
		return WorkspaceSnapshot{}, err
	}
	run, err := s.syncState(&item)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	return WorkspaceSnapshot{
		State: item,
		Run:   run,
	}, nil
}

func (s *Service) DispatchWorkspace(path string, input string) (WorkspaceSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	path = text(path)
	if path == "" {
		return WorkspaceSnapshot{}, errors.New("workspace_path is required")
	}

	item, _, err := s.workspaceState(path)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	if item.WorkflowID == "" {
		return WorkspaceSnapshot{}, errors.New("workflow_id is required")
	}
	if item.RunID != "" {
		if err := s.interruptRun(item.RunID); err != nil {
			return WorkspaceSnapshot{}, err
		}
		item.RunID = ""
	}
	out, err := s.start(item.WorkflowID, path, input, item.SessionID)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	item.WorkspacePath = path
	item.WorkflowID = out.Run.WorkflowID
	item.RunID = out.Run.ID
	item.SessionID = text(out.Run.SessionID)
	item.Status = workspaceStatusOf(out.Run.Status)
	item.UpdatedAt = time.Now().UnixMilli()
	if err := s.putWorkspaceState(item); err != nil {
		return WorkspaceSnapshot{}, err
	}
	run, err := s.syncState(&item)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	return WorkspaceSnapshot{
		State: item,
		Run:   run,
	}, nil
}

func (s *Service) InterruptWorkspace(path string) (WorkspaceSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, _, err := s.workspaceState(path)
	if err != nil {
		return WorkspaceSnapshot{}, err
	}
	if item.RunID != "" {
		if err := s.interruptRun(item.RunID); err != nil {
			return WorkspaceSnapshot{}, err
		}
		item.RunID = ""
		item.Status = WorkspaceInterrupted
		item.UpdatedAt = time.Now().UnixMilli()
		if err := s.putWorkspaceState(item); err != nil {
			return WorkspaceSnapshot{}, err
		}
	}
	return WorkspaceSnapshot{
		State: item,
		Run:   nil,
	}, nil
}

func (s *Service) start(wid string, path string, input string, sid string) (StartResult, error) {
	flow, err := s.get(wid)
	if err != nil {
		return StartResult{}, err
	}
	if err := validateStart(flow); err != nil {
		return StartResult{}, err
	}
	node, ok := pickNode(flow, flow.RootNodeID)
	if !ok {
		return StartResult{}, errors.New("workflow root node not found")
	}
	state, _, err := s.workspaceState(path)
	if err != nil {
		return StartResult{}, err
	}

	run := Run{
		ID:              id("run"),
		WorkflowID:      flow.ID,
		WorkspacePath:   text(path),
		SessionID:       text(sid),
		ModelProviderID: state.DefaultModelProviderID,
		ModelID:         state.DefaultModelID,
		Variant:         state.DefaultVariant,
		Status:          RunRunning,
		CurrentNodeID:   node.ID,
		Input:           strings.TrimSpace(input),
		StartedAt:       time.Now().UnixMilli(),
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
		if run.Status == RunFailed || run.Status == RunDone || run.Status == RunPending || run.Status == RunInterrupted {
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

		if row.Status == NodeRunning || row.Status == NodeWaiting {
			wait := s.waitSession(run.WorkspacePath, row.SessionID, row, timeout(node))
			s.mu.Lock()
			run, err = s.run(runID)
			if err != nil {
				s.mu.Unlock()
				return
			}
			if run.Status == RunInterrupted {
				s.mu.Unlock()
				return
			}
			row, ok = s.lastNodeRun(run.ID, run.CurrentNodeID)
			if !ok {
				s.mu.Unlock()
				return
			}
			switch wait.Kind {
			case waitWaiting:
				item, openErr := s.openWait(run, row, wait)
				if openErr != nil {
					row.Status = NodeFailed
					row.Error = openErr.Error()
					row.EndedAt = time.Now().UnixMilli()
					_ = s.putNodeRun(row)
					run.Status = RunFailed
					run.Error = openErr.Error()
					run.EndedAt = row.EndedAt
					_ = s.putRun(run)
					s.mu.Unlock()
					return
				}
				row.Status = NodeWaiting
				row.Error = wait.WaitKind
				_ = s.putNodeRun(row)
				run.Status = RunWaiting
				run.Error = item.ID
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
					if retryable(err) {
						row.Status = NodeFailed
						row.Error = err.Error()
						row.EndedAt = time.Now().UnixMilli()
						_ = s.putNodeRun(row)
						if _, retryErr := s.queue(flow, &run, node, row.Turn+1, run.Input, "", retryPrompt(node, err)); retryErr == nil {
							s.mu.Unlock()
							continue
						}
					}
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

				nextID, _ := next(flow, node, res)
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

				if _, err := s.queue(flow, &run, nextNode, row.Turn+1, run.Input, carry(node, row.Result), ""); err != nil {
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

func (s *Service) rows(runID string) ([]NodeRun, error) {
	list, err := s.store.loadNodeRuns()
	if err != nil {
		return nil, err
	}
	out := make([]NodeRun, 0, len(list))
	for _, item := range list {
		if item.RunID == runID {
			out = append(out, item)
		}
	}
	return out, nil
}

func (s *Service) workspaceState(path string) (WorkspaceState, bool, error) {
	list, err := s.store.loadWorkspaceStates()
	if err != nil {
		return WorkspaceState{}, false, err
	}
	path = text(path)
	for _, item := range list {
		if item.WorkspacePath == path {
			return item, true, nil
		}
	}
	return WorkspaceState{
		WorkspacePath: path,
		Status:        WorkspaceIdle,
	}, false, nil
}

func (s *Service) putWorkspaceState(item WorkspaceState) error {
	list, err := s.store.loadWorkspaceStates()
	if err != nil {
		return err
	}
	hit := false
	next := make([]WorkspaceState, 0, len(list)+1)
	for _, row := range list {
		if row.WorkspacePath != item.WorkspacePath {
			next = append(next, row)
			continue
		}
		next = append(next, item)
		hit = true
	}
	if !hit {
		next = append(next, item)
	}
	return s.store.saveWorkspaceStates(next)
}

func workspaceStatusOf(status RunStatus) WorkspaceStatus {
	if status == RunRunning {
		return WorkspaceRunning
	}
	if status == RunWaiting {
		return WorkspaceWaiting
	}
	if status == RunDone {
		return WorkspaceDone
	}
	if status == RunInterrupted {
		return WorkspaceInterrupted
	}
	if status == RunFailed {
		return WorkspaceFailed
	}
	return WorkspaceIdle
}

func (s *Service) syncState(item *WorkspaceState) (*Run, error) {
	if item == nil {
		return nil, nil
	}
	if item.WorkspacePath == "" {
		return nil, errors.New("workspace_path is required")
	}
	if item.RunID == "" {
		if item.Status == "" {
			item.Status = WorkspaceIdle
		}
		return nil, nil
	}

	run, err := s.run(item.RunID)
	if err != nil {
		item.RunID = ""
		item.Status = WorkspaceIdle
		if err := s.putWorkspaceState(*item); err != nil {
			return nil, err
		}
		return nil, nil
	}
	item.Status = workspaceStatusOf(run.Status)
	item.WorkflowID = text(run.WorkflowID)
	if item.SessionID == "" && run.SessionID != "" {
		item.SessionID = text(run.SessionID)
	}
	item.UpdatedAt = time.Now().UnixMilli()
	if err := s.putWorkspaceState(*item); err != nil {
		return nil, err
	}
	return &run, nil
}

func count(list []NodeRun, nodeID string) int {
	out := 0
	for _, item := range list {
		if nodeID != "" && item.NodeID != nodeID {
			continue
		}
		out++
	}
	return out
}

func entry(flow Workflow, list []NodeRun) bool {
	for _, row := range list {
		node, ok := pickNode(flow, row.NodeID)
		if !ok || auto(node.Kind) {
			continue
		}
		return false
	}
	return true
}

func carry(node Node, res Result) string {
	if text := strings.TrimSpace(res.Handoff); text != "" {
		return text
	}
	if node.Kind == Router {
		return ""
	}
	return strings.TrimSpace(res.Text)
}

func auto(kind Kind) bool {
	return kind == Start || kind == End
}

func (s *Service) session(dir string, run *Run, node Node) (string, error) {
	if err := asset.EnsureWorkspace(dir); err != nil {
		return "", err
	}
	if run.SessionID != "" {
		return run.SessionID, nil
	}
	if err := s.ensure(); err != nil {
		return "", err
	}
	sid, err := s.createSession(dir)
	if err != nil {
		return "", err
	}
	run.SessionID = sid
	return sid, nil
}

func (s *Service) interruptRun(id string) error {
	run, err := s.run(id)
	if err != nil {
		return err
	}
	if run.Status != RunRunning && run.Status != RunWaiting {
		return nil
	}
	if run.Status == RunRunning && run.WorkspacePath != "" && run.SessionID != "" {
		if err := s.abortSession(run.WorkspacePath, run.SessionID); err != nil {
			return err
		}
	}
	run.Status = RunInterrupted
	run.Error = ""
	run.EndedAt = time.Now().UnixMilli()
	if err := s.putRun(run); err != nil {
		return err
	}
	row, ok := s.lastNodeRun(run.ID, run.CurrentNodeID)
	if !ok {
		return nil
	}
	if row.Status != NodeRunning && row.Status != NodeWaiting {
		return nil
	}
	row.Status = NodeInterrupted
	row.Error = ""
	row.EndedAt = run.EndedAt
	return s.putNodeRun(row)
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
		list, err := s.rows(run.ID)
		if err != nil {
			return NodeRun{}, err
		}
		if count(list, "") >= 64 {
			return NodeRun{}, errors.New("workflow step limit reached")
		}
		if count(list, node.ID) > node.RetryLimit {
			return NodeRun{}, errors.New("workflow node retry limit reached")
		}
		if count(list, node.ID) > 0 {
			run.Loop++
		}

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

			nextID, _ := next(flow, node, row.Result)
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

			upstream = carry(node, row.Result)
			feedback = ""
			node = nextNode
			turn++
			continue
		}

		sid, err := s.session(run.WorkspacePath, run, node)
		if err != nil {
			return NodeRun{}, err
		}
		prompt := buildPrompt(flow, node, input, upstream, feedback, entry(flow, list))
		row := NodeRun{
			ID:        id("node"),
			RunID:     run.ID,
			NodeID:    node.ID,
			SessionID: sid,
			Status:    NodeRunning,
			Turn:      turn,
			Input:     prompt,
			StartedAt: now,
			Anchor:    s.anchor(run.WorkspacePath, sid),
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
		if err := s.sendPrompt(run.WorkspacePath, sid, node, *run, prompt); err != nil {
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

func buildPrompt(flow Workflow, node Node, input string, upstream string, feedback string, root bool) string {
	parts := []string{}
	if root && input != "" {
		parts = append(parts, "User objective:\n"+input)
	}
	if upstream != "" {
		parts = append(parts, "Workflow handoff:\n"+upstream)
	}
	if feedback != "" {
		parts = append(parts, "Workflow feedback:\n"+feedback)
	}
	parts = append(parts, "Workflow node:\n"+node.Title)
	if len(node.Skills) > 0 {
		parts = append(parts, "Requested skills:\n- "+strings.Join(node.Skills, "\n- "))
	}
	if node.Prompt != "" {
		parts = append(parts, "Node instructions:\n"+node.Prompt)
	}
	parts = append(parts, toolPrompt(node))
	if flow.Name != "" {
		parts = append(parts, "Workflow:\n"+flow.Name)
	}
	return strings.TrimSpace(strings.Join(parts, "\n\n"))
}

func toolPrompt(node Node) string {
	head := []string{
		"结构化输出约定：",
		"完成当前节点后，必须且只调用一次工具 `" + node.ToolID + "`。",
		"不要在助手文本中粘贴原始 JSON。",
		"将 \"kind\" 设为 \"" + string(node.Kind) + "\"，并填写当前节点要求的字段。",
	}
	if node.Kind == Router {
		head = append(head, `对于 router 节点，请提供 route = "plan" | "execute" | "check"。summary 和 handoff 保持可选且尽量简短。`)
	}
	if node.Kind == Plan {
		head = append(head, "对于 plan 节点，请提供 summary、steps、deliverables、risks 和 handoff。")
	}
	if node.Kind == Check {
		head = append(head, "对于 check 节点，请提供 summary、pass、issues 和 handoff。")
	}
	if node.Kind == Execute {
		head = append(head, "对于 execute 节点，至少提供 summary，并可按需补充 handoff。")
	}
	return strings.Join(head, "\n")
}

func retryPrompt(node Node, err error) string {
	return strings.TrimSpace(strings.Join([]string{
		"上一轮响应未满足工作流约定。",
		"原因：" + err.Error(),
		"请重新执行当前节点，并调用工具 `" + node.ToolID + "`，其中 kind 使用 `" + string(node.Kind) + "`。",
		"不要在助手文本中回复原始 JSON。",
	}, "\n"))
}

func body(node Node, run Run, prompt string) map[string]any {
	out := map[string]any{
		"agent": node.Agent,
		"parts": []map[string]any{
			{
				"type": "text",
				"text": prompt,
			},
		},
	}
	pid := run.ModelProviderID
	mid := run.ModelID
	if node.ModelProviderID != "" && node.ModelID != "" {
		pid = node.ModelProviderID
		mid = node.ModelID
	}
	if pid != "" && mid != "" {
		out["model"] = map[string]string{
			"providerID": pid,
			"modelID":    mid,
		}
	}
	variant := run.Variant
	if node.Variant != "" {
		variant = node.Variant
	}
	if variant != "" {
		out["variant"] = variant
	}
	return out
}

func next(flow Workflow, node Node, res Result) (string, string) {
	check := Always
	if node.Kind == Router {
		check = PlanTo
		if res.Route == string(ExecuteTo) {
			check = ExecuteTo
		}
		if res.Route == string(CheckTo) {
			check = CheckTo
		}
	}
	if node.Kind == Check {
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
			return item.To, res.Handoff
		}
	}
	for _, item := range flow.Edges {
		if item.From == node.ID && item.Cond == Always {
			return item.To, res.Handoff
		}
	}
	return "", res.Handoff
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

func (s *Service) sendPrompt(dir string, sid string, node Node, run Run, prompt string) error {
	u := *s.op.Target()
	u.Path = "/session/" + sid + "/prompt_async"
	q := url.Values{}
	q.Set("directory", dir)
	u.RawQuery = q.Encode()

	buf, err := json.Marshal(body(node, run, prompt))
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

func (s *Service) abortSession(dir string, sid string) error {
	u := *s.op.Target()
	u.Path = "/session/" + sid + "/abort"
	q := url.Values{}
	q.Set("directory", dir)
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, u.String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")

	res, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 200 && res.StatusCode < 300 {
		return nil
	}
	return errors.New("opencode session abort failed")
}
