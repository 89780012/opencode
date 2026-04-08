package workflow

import (
	"errors"
	"slices"
	"strings"
)

func (s *Service) Summary(id string) (Summary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	flow, err := s.get(id)
	if err != nil {
		return Summary{}, err
	}
	runs, err := s.store.loadRuns()
	if err != nil {
		return Summary{}, err
	}
	rows, err := s.store.loadNodeRuns()
	if err != nil {
		return Summary{}, err
	}
	return summary(flow, runs, rows)
}

func summary(flow Workflow, runs []Run, rows []NodeRun) (Summary, error) {
	if text(flow.ID) == "" {
		return Summary{}, errors.New("workflow id is required")
	}

	out := Summary{
		WorkflowID: flow.ID,
		Nodes:      make([]NodeSummary, 0, len(flow.Nodes)),
	}

	ids := map[string]bool{}
	for _, item := range flow.Nodes {
		out.Nodes = append(out.Nodes, NodeSummary{
			NodeID: item.ID,
			Kind:   item.Kind,
			Title:  item.Title,
		})
		ids[item.ID] = true
	}

	sums := map[string]*NodeSummary{}
	for i := range out.Nodes {
		sums[out.Nodes[i].NodeID] = &out.Nodes[i]
	}

	hit := map[string]bool{}
	runMS := int64(0)
	runCount := 0
	for _, item := range runs {
		if item.WorkflowID != flow.ID || hit[item.ID] {
			continue
		}
		hit[item.ID] = true
		out.TotalRuns++
		if item.StartedAt > out.LastRunAt {
			out.LastRunAt = item.StartedAt
		}
		if item.EndedAt > item.StartedAt {
			runMS += item.EndedAt - item.StartedAt
			runCount++
		}
		switch item.Status {
		case RunDone:
			out.DoneRuns++
		case RunFailed:
			out.FailedRuns++
		case RunBlocked:
			out.BlockedRuns++
		case RunRunning:
			out.RunningRuns++
		}
	}
	if runCount > 0 {
		out.AvgRunMS = runMS / int64(runCount)
	}

	nodeMS := map[string]int64{}
	nodeCount := map[string]int{}
	for _, item := range rows {
		if !hit[item.RunID] || !ids[item.NodeID] {
			continue
		}
		sum := sums[item.NodeID]
		if sum == nil {
			continue
		}
		out.TotalNodeRuns++
		sum.Total++
		if item.StartedAt > sum.LastRunAt {
			sum.LastRunAt = item.StartedAt
			sum.LastStatus = item.Status
		}
		if item.EndedAt > item.StartedAt {
			nodeMS[item.NodeID] += item.EndedAt - item.StartedAt
			nodeCount[item.NodeID]++
		}
		if item.Result.Pass != nil {
			if *item.Result.Pass {
				sum.Pass++
			} else {
				sum.Fail++
			}
		}
		switch item.Status {
		case NodeDone:
			sum.Done++
		case NodeFailed:
			sum.Failed++
		case NodeBlocked:
			sum.Blocked++
		case NodeRunning:
			sum.Running++
		case NodeTimeout:
			sum.Timeout++
		}
	}

	for i := range out.Nodes {
		row := &out.Nodes[i]
		if nodeCount[row.NodeID] > 0 {
			row.AvgMS = nodeMS[row.NodeID] / int64(nodeCount[row.NodeID])
		}
	}
	slices.SortFunc(out.Nodes, func(a NodeSummary, b NodeSummary) int {
		if a.LastRunAt == b.LastRunAt {
			return strings.Compare(a.NodeID, b.NodeID)
		}
		if a.LastRunAt > b.LastRunAt {
			return -1
		}
		return 1
	})

	return out, nil
}
