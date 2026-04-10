package workflow

import "errors"

func validate(flow Workflow) error {
	return validateStart(flow)
}

func validateSave(flow Workflow) error {
	if len(flow.Nodes) == 0 {
		if flow.RootNodeID != "" {
			return errors.New("workflow root node must be empty when no nodes exist")
		}
		if len(flow.Edges) > 0 {
			return errors.New("workflow edges require nodes")
		}
		return nil
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
		if (item.ModelProviderID == "") != (item.ModelID == "") {
			return errors.New("workflow node model override requires both model_provider_id and model_id")
		}
		if item.Kind != Start && item.Kind != End && item.ToolID == "" {
			return errors.New("workflow node tool_id is required for non-start/end nodes")
		}
		if (item.Kind == Intent || item.Kind == Review || item.Kind == Judge) && outs[item.ID] == 0 {
			return errors.New("intent, review and judge nodes require at least one outgoing edge")
		}
	}

	return nil
}

func validateStart(flow Workflow) error {
	if err := validateSave(flow); err != nil {
		return err
	}
	if len(flow.Nodes) == 0 {
		return errors.New("workflow requires at least one node")
	}
	return nil
}
