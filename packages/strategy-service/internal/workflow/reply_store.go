package workflow

import (
	"slices"
	"strings"
)

func cleanReplies(list []Reply) []Reply {
	slices.SortFunc(list, func(a Reply, b Reply) int {
		if a.CreatedAt == b.CreatedAt {
			return strings.Compare(a.ID, b.ID)
		}
		if a.CreatedAt > b.CreatedAt {
			return -1
		}
		return 1
	})

	out := make([]Reply, 0, len(list))
	seen := map[string]bool{}
	keys := map[string]bool{}
	for _, item := range list {
		item.ID = text(item.ID)
		if item.ID == "" || seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		item.WaitID = text(item.WaitID)
		item.RunID = text(item.RunID)
		item.StepID = text(item.StepID)
		item.IdempotencyKey = text(item.IdempotencyKey)
		item.Actor = replyActor(item.Actor)
		key := item.WaitID + ":" + item.IdempotencyKey
		if item.WaitID != "" && item.IdempotencyKey != "" {
			if keys[key] {
				continue
			}
			keys[key] = true
		}
		out = append(out, item)
	}
	return out
}

func replyActor(v ReplyActor) ReplyActor {
	switch v {
	case ReplySystem, ReplyOperator:
		return v
	default:
		return ReplyUser
	}
}
