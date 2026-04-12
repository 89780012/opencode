package workflow

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"

	cfg "strategy-service/internal/config"
)

type store struct{}

func (s *store) path(name string) (string, error) {
	dir, err := cfg.Root()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, name), nil
}

func (s *store) loadFlows() ([]Workflow, error) {
	return load[Workflow](s, "workflows.json", cleanFlows)
}

func (s *store) saveFlows(list []Workflow) error {
	return save(s, "workflows.json", cleanFlows(list))
}

func (s *store) loadRuns() ([]Run, error) {
	return load[Run](s, "workflow-runs.json", cleanRuns)
}

func (s *store) saveRuns(list []Run) error {
	return save(s, "workflow-runs.json", cleanRuns(list))
}

func (s *store) loadNodeRuns() ([]NodeRun, error) {
	return load[NodeRun](s, "workflow-node-runs.json", cleanNodeRuns)
}

func (s *store) saveNodeRuns(list []NodeRun) error {
	return save(s, "workflow-node-runs.json", cleanNodeRuns(list))
}

func (s *store) loadWorkspaceStates() ([]WorkspaceState, error) {
	return load[WorkspaceState](s, "workflow-workspace-states.json", cleanWorkspaceStates)
}

func (s *store) saveWorkspaceStates(list []WorkspaceState) error {
	return save(s, "workflow-workspace-states.json", cleanWorkspaceStates(list))
}

func load[T any](s *store, name string, clean func([]T) []T) ([]T, error) {
	path, err := s.path(name)
	if err != nil {
		return nil, err
	}

	body, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []T{}, nil
	}
	if err != nil {
		return nil, err
	}

	list := []T{}
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, err
	}
	return clean(list), nil
}

func save[T any](s *store, name string, list []T) error {
	path, err := s.path(name)
	if err != nil {
		return err
	}

	body, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, append(body, '\n'), 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err == nil {
		return nil
	}
	_ = os.Remove(tmp)
	return err
}

func cleanFlows(list []Workflow) []Workflow {
	seen := map[string]bool{}
	out := make([]Workflow, 0, len(list))
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" {
			item.ID = id("wf")
		}
		if seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.Name = text(item.Name)
		item.RootNodeID = text(item.RootNodeID)
		item.Nodes = cleanNodes(item.Nodes)
		item.Edges = cleanEdges(item.Edges)
		if item.RootNodeID == "" && len(item.Nodes) > 0 {
			item.RootNodeID = item.Nodes[0].ID
		}
		out = append(out, item)
	}
	slices.SortFunc(out, func(a Workflow, b Workflow) int {
		return strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name))
	})
	return out
}

func cleanNodes(list []Node) []Node {
	out := make([]Node, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.Title = text(item.Title)
		item.Agent = text(item.Agent)
		item.ToolID = text(item.ToolID)
		item.Prompt = strings.TrimSpace(strings.ReplaceAll(item.Prompt, "\r\n", "\n"))
		item.ModelProviderID = text(item.ModelProviderID)
		item.ModelID = text(item.ModelID)
		item.Variant = text(item.Variant)
		item.Kind = kind(item.Kind)
		item.Skills = uniq(item.Skills)
		if item.Kind == Start || item.Kind == End {
			item.Agent = ""
			item.ToolID = ""
			item.Prompt = ""
			item.Skills = nil
			item.ModelProviderID = ""
			item.ModelID = ""
			item.Variant = ""
		} else {
			if item.ToolID == "" {
				item.ToolID = "smartx-workflow"
			}
		}
		if item.TimeoutMS < 0 {
			item.TimeoutMS = 0
		}
		if item.RetryLimit < 0 {
			item.RetryLimit = 0
		}
		if item.Kind != Start && item.Kind != End && item.RetryLimit < 2 {
			item.RetryLimit = 2
		}
		if item.X != item.X {
			item.X = 0
		}
		if item.Y != item.Y {
			item.Y = 0
		}
		out = append(out, item)
	}
	return out
}

func cleanEdges(list []Edge) []Edge {
	out := make([]Edge, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" {
			item.ID = id("edge")
		}
		if seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.From = text(item.From)
		item.To = text(item.To)
		item.Cond = cond(item.Cond)
		item.Label = text(item.Label)
		out = append(out, item)
	}
	return out
}

func cleanRuns(list []Run) []Run {
	out := make([]Run, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.WorkflowID = text(item.WorkflowID)
		item.WorkspacePath = text(item.WorkspacePath)
		item.SessionID = text(item.SessionID)
		item.ModelProviderID = text(item.ModelProviderID)
		item.ModelID = text(item.ModelID)
		item.Variant = text(item.Variant)
		item.CurrentNodeID = text(item.CurrentNodeID)
		item.Input = strings.TrimSpace(strings.ReplaceAll(item.Input, "\r\n", "\n"))
		item.Error = text(item.Error)
		if item.ModelProviderID == "" || item.ModelID == "" {
			item.ModelProviderID = ""
			item.ModelID = ""
			item.Variant = ""
		}
		item.Status = runStatus(item.Status)
		out = append(out, item)
	}
	slices.SortFunc(out, func(a Run, b Run) int {
		if a.StartedAt == b.StartedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.StartedAt > b.StartedAt {
			return -1
		}
		return 1
	})
	return out
}

func cleanNodeRuns(list []NodeRun) []NodeRun {
	out := make([]NodeRun, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.RunID = text(item.RunID)
		item.NodeID = text(item.NodeID)
		item.SessionID = text(item.SessionID)
		item.Input = strings.TrimSpace(strings.ReplaceAll(item.Input, "\r\n", "\n"))
		item.Output = strings.TrimSpace(strings.ReplaceAll(item.Output, "\r\n", "\n"))
		item.Error = text(item.Error)
		item.Status = nodeStatus(item.Status)
		out = append(out, item)
	}
	slices.SortFunc(out, func(a NodeRun, b NodeRun) int {
		if a.StartedAt == b.StartedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.StartedAt > b.StartedAt {
			return -1
		}
		return 1
	})
	return out
}

func cleanWorkspaceStates(list []WorkspaceState) []WorkspaceState {
	out := make([]WorkspaceState, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.WorkspacePath = text(item.WorkspacePath)
		if item.WorkspacePath == "" || seen[item.WorkspacePath] {
			continue
		}
		seen[item.WorkspacePath] = true
		item.SessionID = text(item.SessionID)
		item.WorkflowID = text(item.WorkflowID)
		item.DefaultModelProviderID = text(item.DefaultModelProviderID)
		item.DefaultModelID = text(item.DefaultModelID)
		item.DefaultVariant = text(item.DefaultVariant)
		item.RunID = text(item.RunID)
		if item.DefaultModelProviderID == "" || item.DefaultModelID == "" {
			item.DefaultModelProviderID = ""
			item.DefaultModelID = ""
			item.DefaultVariant = ""
		}
		item.Status = workspaceStatus(item.Status)
		out = append(out, item)
	}
	slices.SortFunc(out, func(a WorkspaceState, b WorkspaceState) int {
		return strings.Compare(strings.ToLower(a.WorkspacePath), strings.ToLower(b.WorkspacePath))
	})
	return out
}

func text(v string) string {
	return strings.TrimSpace(v)
}

func uniq(list []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, item := range list {
		item = text(item)
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		out = append(out, item)
	}
	return out
}

func kind(v Kind) Kind {
	switch v {
	case Start, Router, Respond, Plan, Execute, Check, End:
		return v
	default:
		return Execute
	}
}

func cond(v Cond) Cond {
	switch v {
	case RespondTo, PlanTo, ExecuteTo, CheckTo, Pass, Fail:
		return v
	default:
		return Always
	}
}

func runStatus(v RunStatus) RunStatus {
	switch v {
	case RunQueued, RunRunning, RunWaiting, RunFailed, RunDone, RunInterrupted, RunCancelled:
		return v
	default:
		return RunPending
	}
}

func nodeStatus(v NodeStatus) NodeStatus {
	switch v {
	case NodeQueued, NodeRunning, NodeWaiting, NodeFailed, NodeDone, NodeTimeout, NodeInterrupted, NodeCancelled:
		return v
	default:
		return NodePending
	}
}

func workspaceStatus(v WorkspaceStatus) WorkspaceStatus {
	switch v {
	case WorkspaceRunning, WorkspaceWaiting, WorkspaceDone, WorkspaceFailed, WorkspaceInterrupted:
		return v
	default:
		return WorkspaceIdle
	}
}

func id(pre string) string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return pre + "_" + hex.EncodeToString(buf)
}
