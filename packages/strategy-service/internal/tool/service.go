package tool

import (
	"context"
	"errors"
	"os/exec"
	"strings"
	"sync"
	"time"

	"strategy-service/internal/proc"
)

var errTool = errors.New("unsupported tool")

func ErrTool() error {
	return errTool
}

type Service struct {
	mu    sync.RWMutex
	tasks map[string]*Task
	last  map[string]string
	run   map[string]string
}

func NewService() *Service {
	return &Service{
		tasks: map[string]*Task{},
		last:  map[string]string{},
		run:   map[string]string{},
	}
}

func (s *Service) List(ctx context.Context) []State {
	return []State{
		s.state(ctx, "git"),
		s.state(ctx, "node"),
		s.state(ctx, "npm"),
		s.state(ctx, "opencode"),
	}
}

func (s *Service) Get(id string) (Task, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, ok := s.tasks[id]
	if !ok {
		return Task{}, false
	}

	return cloneTask(task), true
}

func (s *Service) state(ctx context.Context, id string) State {
	st := s.inspect(ctx, id)

	s.mu.RLock()
	run := s.run[id]
	last := s.last[id]
	task, hasTask := s.tasks[last]
	s.mu.RUnlock()

	if run != "" {
		st.Status = StatusInstalling
		st.TaskID = run
		if hasTask && task.Output != "" {
			st.Message = task.Output
		}
		if st.Message == "" {
			st.Message = "installation is running"
		}
		return st
	}

	if hasTask && task.Status == TaskFailed && !st.Installed {
		st.Status = StatusFailed
		st.TaskID = task.ID
		st.Message = task.Error
		if st.Message == "" {
			st.Message = task.Output
		}
	}

	return st
}

func (s *Service) inspect(ctx context.Context, id string) State {
	state := State{
		ID:        id,
		Label:     label(id),
		UpdatedAt: time.Now(),
	}

	if !known(id) {
		state.Status = StatusFailed
		state.Message = errTool.Error()
		return state
	}

	path, err := exec.LookPath(id)
	if err != nil {
		state.Status = StatusMissing
		state.Message = "command not found"
		return state
	}

	state.Installed = true
	state.Path = path

	out, err := s.version(ctx, id)
	if err != nil {
		state.Status = StatusFailed
		state.Message = err.Error()
		return state
	}

	state.Status = StatusInstalled
	state.Version = out
	return state
}

func (s *Service) version(ctx context.Context, id string) (string, error) {
	sub, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(sub, id, "--version")
	proc.Hide(cmd)
	out, err := cmd.CombinedOutput()
	text := strings.TrimSpace(string(out))
	if err != nil {
		if text == "" {
			return "", err
		}
		return "", errors.New(text)
	}

	return text, nil
}

func known(id string) bool {
	return id == "git" || id == "node" || id == "npm" || id == "opencode"
}

func label(id string) string {
	if id == "git" {
		return "Git"
	}
	if id == "node" {
		return "Node.js"
	}
	if id == "npm" {
		return "npm"
	}
	if id == "opencode" {
		return "OpenCode"
	}
	return id
}

func cloneTask(task *Task) Task {
	out := *task
	if task.Log != nil {
		out.Log = append([]string{}, task.Log...)
	}
	return out
}
