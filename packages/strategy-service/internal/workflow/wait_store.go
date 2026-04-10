package workflow

import (
	"slices"
	"strings"
)

func cleanWaits(list []Wait) []Wait {
	slices.SortFunc(list, func(a Wait, b Wait) int {
		if a.CreatedAt == b.CreatedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.CreatedAt > b.CreatedAt {
			return -1
		}
		return 1
	})

	out := make([]Wait, 0, len(list))
	seen := map[string]bool{}
	open := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.RunID = text(item.RunID)
		item.StepID = text(item.StepID)
		item.SessionID = text(item.SessionID)
		item.Kind = text(item.Kind)
		item.Title = text(item.Title)
		item.Prompt = strings.TrimSpace(strings.ReplaceAll(item.Prompt, "\r\n", "\n"))
		item.Mode = waitMode(item.Mode)
		item.Status = waitStatus(item.Status)
		item.Source = waitSource(item.Source)
		item.SourceRequestID = text(item.SourceRequestID)
		item.ResumeHint = strings.TrimSpace(strings.ReplaceAll(item.ResumeHint, "\r\n", "\n"))
		if item.Status == WaitOpen {
			if open[item.RunID] {
				continue
			}
			open[item.RunID] = true
		}
		out = append(out, item)
	}
	return out
}

func waitStatus(v WaitStatus) WaitStatus {
	switch v {
	case WaitAnswered, WaitRejected, WaitExpired, WaitCancelled, WaitConsumed:
		return v
	default:
		return WaitOpen
	}
}

func waitMode(v WaitMode) WaitMode {
	switch v {
	case WaitForm, WaitApproval, WaitConfirm:
		return v
	default:
		return WaitText
	}
}

func waitSource(v WaitSource) WaitSource {
	switch v {
	case WaitRuntime, WaitSystem:
		return v
	default:
		return WaitModel
	}
}
