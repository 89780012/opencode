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

	outs := map[string][]Cond{}
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
		outs[item.From] = append(outs[item.From], item.Cond)
	}

	for _, item := range flow.Nodes {
		if (item.ModelProviderID == "") != (item.ModelID == "") {
			return errors.New("workflow node model override requires both model_provider_id and model_id")
		}
		if item.Kind != Start && item.Kind != End && item.ToolID == "" {
			return errors.New("workflow node tool_id is required for non-start/end nodes")
		}
		if item.Kind == End && len(outs[item.ID]) > 0 {
			return errors.New("end nodes cannot have outgoing edges")
		}
		if err := validateNode(item, outs[item.ID]); err != nil {
			return err
		}
	}

	return nil
}

func validateNode(node Node, outs []Cond) error {
	if node.Kind == Start || node.Kind == End {
		for _, item := range outs {
			if item != Always {
				return errors.New("start and end nodes only allow always edges")
			}
		}
		return nil
	}

	if node.Kind == Router {
		if len(outs) == 0 {
			return errors.New("router nodes require outgoing edges")
		}
		seen := map[Cond]bool{}
		for _, item := range outs {
			if item != PlanTo && item != ExecuteTo && item != CheckTo {
				return errors.New("router nodes only allow plan, execute, or check edges")
			}
			seen[item] = true
		}
		if !seen[PlanTo] && !seen[ExecuteTo] && !seen[CheckTo] {
			return errors.New("router nodes require plan, execute, or check edges")
		}
		return nil
	}

	if node.Kind == Check {
		if len(outs) == 0 {
			return errors.New("check nodes require outgoing edges")
		}
		seen := map[Cond]bool{}
		for _, item := range outs {
			if item != Pass && item != Fail {
				return errors.New("check nodes only allow pass or fail edges")
			}
			seen[item] = true
		}
		if !seen[Pass] && !seen[Fail] {
			return errors.New("check nodes require pass or fail edges")
		}
		return nil
	}

	for _, item := range outs {
		if item != Always {
			return errors.New("plan and execute nodes only allow always edges")
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
