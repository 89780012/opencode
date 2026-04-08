package workflow

import "errors"

func validate(flow Workflow) error {
	if flow.WorkspacePath == "" {
		return errors.New("workflow workspace_path is required")
	}
	if len(flow.Nodes) == 0 {
		return errors.New("workflow requires at least one node")
	}
	if flow.RootNodeID == "" {
		return errors.New("workflow root node not found")
	}

	nodes := map[string]Node{}
	for _, item := range flow.Nodes {
		nodes[item.ID] = item
	}
	if _, ok := nodes[flow.RootNodeID]; !ok {
		return errors.New("workflow root node not found")
	}

	outs := map[string]int{}
	for _, item := range flow.Edges {
		if item.From == "" || item.To == "" {
			return errors.New("workflow edge endpoints are required")
		}
		if _, ok := nodes[item.From]; !ok {
			return errors.New("workflow edge source not found")
		}
		if _, ok := nodes[item.To]; !ok {
			return errors.New("workflow edge target not found")
		}
		outs[item.From]++
	}

	for _, item := range flow.Nodes {
		if (item.Kind == Review || item.Kind == Judge) && outs[item.ID] == 0 {
			return errors.New("review and judge nodes require at least one outgoing edge")
		}
	}

	return nil
}
