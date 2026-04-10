package workflow

import (
	"slices"
	"strings"
)

func cleanTimeline(list []Timeline) []Timeline {
	slices.SortFunc(list, func(a Timeline, b Timeline) int {
		if a.CreatedAt == b.CreatedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.CreatedAt < b.CreatedAt {
			return -1
		}
		return 1
	})

	out := make([]Timeline, 0, len(list))
	seen := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.RunID = text(item.RunID)
		item.StepID = text(item.StepID)
		item.WaitID = text(item.WaitID)
		item.ReplyID = text(item.ReplyID)
		item.Kind = timelineKind(item.Kind)
		out = append(out, item)
	}
	return out
}

func timelineKind(v TimelineKind) TimelineKind {
	switch v {
	case TimelineStepStarted,
		TimelineWaitOpened,
		TimelineReply,
		TimelineWaitConsumed,
		TimelineStepDone,
		TimelineStepFailed,
		TimelineRunDone,
		TimelineRunFailed,
		TimelineRunCancelled:
		return v
	default:
		return TimelineRunStarted
	}
}
