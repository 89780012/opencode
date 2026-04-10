package workflow

import "time"

func (s *Service) openWait(run Run, row NodeRun, res waitResult) (Wait, error) {
	list, err := s.store.loadWaits()
	if err != nil {
		return Wait{}, err
	}
	for _, item := range list {
		if item.RunID == run.ID && item.Status == WaitOpen {
			return item, nil
		}
		if item.RunID == run.ID && item.SourceRequestID == res.RequestID && item.Source == WaitRuntime {
			return item, nil
		}
	}

	now := time.Now().UnixMilli()
	item := Wait{
		ID:              id("wait"),
		RunID:           run.ID,
		StepID:          row.ID,
		SessionID:       row.SessionID,
		Kind:            res.WaitKind,
		Mode:            res.Mode,
		Title:           res.WaitKind,
		Prompt:          waitPrompt(res.WaitKind),
		Schema:          res.Schema,
		Required:        true,
		Status:          WaitOpen,
		Source:          WaitRuntime,
		SourceRequestID: res.RequestID,
		CreatedAt:       now,
	}
	if err := s.store.saveWaits(append(list, item)); err != nil {
		return Wait{}, err
	}
	_ = s.appendTimeline(Timeline{
		ID:        id("event"),
		RunID:     run.ID,
		StepID:    row.ID,
		WaitID:    item.ID,
		Kind:      TimelineWaitOpened,
		CreatedAt: now,
	})
	return item, nil
}

func waitPrompt(kind string) string {
	if kind == "permission" {
		return "This step is waiting for a permission decision."
	}
	if kind == "question" {
		return "This step is waiting for answers to a question request."
	}
	return "This step is waiting for external input."
}
