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
		item.WorkspacePath = text(item.WorkspacePath)
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
		item.Prompt = strings.TrimSpace(strings.ReplaceAll(item.Prompt, "\r\n", "\n"))
		item.Session = mode(item.Session)
		item.Kind = kind(item.Kind)
		item.Skills = uniq(item.Skills)
		if item.TimeoutMS < 0 {
			item.TimeoutMS = 0
		}
		if item.RetryLimit < 0 {
			item.RetryLimit = 0
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
		item.RootSessionID = text(item.RootSessionID)
		item.CurrentNodeID = text(item.CurrentNodeID)
		item.Input = strings.TrimSpace(strings.ReplaceAll(item.Input, "\r\n", "\n"))
		item.Error = text(item.Error)
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
	case Start, Plan, Build, Judge, Review, End, Gate:
		return v
	default:
		return Plan
	}
}

func mode(v Mode) Mode {
	switch v {
	case Shared, Isolated:
		return v
	default:
		return Shared
	}
}

func cond(v Cond) Cond {
	switch v {
	case Pass, Fail:
		return v
	default:
		return Always
	}
}

func runStatus(v RunStatus) RunStatus {
	switch v {
	case RunRunning, RunBlocked, RunFailed, RunDone:
		return v
	default:
		return RunPending
	}
}

func nodeStatus(v NodeStatus) NodeStatus {
	switch v {
	case NodeRunning, NodeBlocked, NodeFailed, NodeDone, NodeTimeout:
		return v
	default:
		return NodePending
	}
}

func id(pre string) string {
	buf := make([]byte, 8)
	_, _ = rand.Read(buf)
	return pre + "_" + hex.EncodeToString(buf)
}
