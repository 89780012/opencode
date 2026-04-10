package workflow

import (
	"slices"
	"strings"
)

func cleanSteps(list []Step) []Step {
	slices.SortFunc(list, func(a Step, b Step) int {
		if a.StartedAt == b.StartedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.StartedAt > b.StartedAt {
			return -1
		}
		return 1
	})

	out := make([]Step, 0, len(list))
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
		item.WaitID = text(item.WaitID)
		item.Status = nodeStatus(item.Status)
		out = append(out, item)
	}
	return out
}
