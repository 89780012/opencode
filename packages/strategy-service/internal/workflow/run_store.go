package workflow

func (s *store) loadSteps() ([]Step, error) {
	return load[Step](s, "workflow-steps.json", cleanSteps)
}

func (s *store) saveSteps(list []Step) error {
	return save(s, "workflow-steps.json", cleanSteps(list))
}

func (s *store) loadWaits() ([]Wait, error) {
	return load[Wait](s, "workflow-waits.json", cleanWaits)
}

func (s *store) saveWaits(list []Wait) error {
	return save(s, "workflow-waits.json", cleanWaits(list))
}

func (s *store) loadReplies() ([]Reply, error) {
	return load[Reply](s, "workflow-replies.json", cleanReplies)
}

func (s *store) saveReplies(list []Reply) error {
	return save(s, "workflow-replies.json", cleanReplies(list))
}

func (s *store) loadTimeline() ([]Timeline, error) {
	return load[Timeline](s, "workflow-timeline.json", cleanTimeline)
}

func (s *store) saveTimeline(list []Timeline) error {
	return save(s, "workflow-timeline.json", cleanTimeline(list))
}
