package tool

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"

	"strategy-service/internal/proc"
)

var errBusy = errors.New("installation is already running for this tool")

func ErrBusy() error {
	return errBusy
}

type step struct {
	cmd  string
	args []string
}

func (s *Service) Install(ctx context.Context, id string) (Task, error) {
	if !known(id) {
		slog.Warn("tool install: unknown tool", "tool", id)
		return Task{}, errTool
	}

	task := &Task{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Tool:      id,
		Status:    TaskPending,
		StartedAt: time.Now(),
		Log:       []string{"task created"},
	}

	s.mu.Lock()
	if s.run[id] != "" {
		s.mu.Unlock()
		slog.Warn("tool install: already running", "tool", id)
		return Task{}, errBusy
	}
	s.tasks[task.ID] = task
	s.last[id] = task.ID
	s.run[id] = task.ID
	s.mu.Unlock()

	slog.Info("tool install task created", "tool", id, "task_id", task.ID)
	go s.exec(ctx, task.ID)

	return cloneTask(task), nil
}

func (s *Service) exec(ctx context.Context, id string) {
	s.set(id, func(task *Task) {
		task.Status = TaskRunning
		task.Log = append(task.Log, "task started")
	})

	task, ok := s.Get(id)
	if !ok {
		slog.Error("tool exec: task not found", "task_id", id)
		return
	}

	slog.Info("tool install exec started", "tool", task.Tool, "task_id", id)

	steps, err := s.steps(task.Tool)
	if err != nil {
		slog.Error("tool install: no steps found", "tool", task.Tool, "error", err)
		s.fail(id, nil, err.Error(), "")
		return
	}

	for i, item := range steps {
		text := item.cmd + " " + strings.Join(item.args, " ")
		slog.Info("tool install: running step", "tool", task.Tool, "step", i+1, "command", strings.TrimSpace(text))
		s.set(id, func(task *Task) {
			task.Log = push(task.Log, "run: "+strings.TrimSpace(text))
			task.Output = "running " + item.cmd
		})

		sub, cancel := context.WithTimeout(ctx, 30*time.Minute)
		cmd := exec.CommandContext(sub, item.cmd, item.args...)
		proc.Hide(cmd)
		out, err := cmd.CombinedOutput()
		cancel()

		body := tidy(string(out))
		if body != "" {
			s.set(id, func(task *Task) {
				task.Output = body
				task.Log = append(task.Log, lines(body)...)
				task.Log = trim(task.Log, 40)
			})
		}

		if err != nil {
			code := exit(err)
			msg := err.Error()
			if body != "" {
				msg = body
			}
			slog.Error("tool install: step failed", "tool", task.Tool, "step", i+1, "error", msg)
			s.fail(id, code, msg, body)
			return
		}

		slog.Info("tool install: step completed", "tool", task.Tool, "step", i+1)
	}

	state := s.inspect(context.Background(), task.Tool)
	if !state.Installed || state.Status != StatusInstalled {
		msg := state.Message
		if msg == "" {
			msg = "install command finished but tool health check failed"
		}
		slog.Error("tool install: post-install check failed", "tool", task.Tool, "message", msg)
		s.fail(id, nil, msg, "")
		return
	}

	slog.Info("tool install completed", "tool", task.Tool, "version", state.Version)
	s.done(id, state)
}

func (s *Service) steps(id string) ([]step, error) {
	if id == "git" {
		if has("winget") {
			return []step{{
				cmd: "winget",
				args: []string{
					"install",
					"--id",
					"Git.Git",
					"-e",
					"--accept-package-agreements",
					"--accept-source-agreements",
					"--silent",
				},
			}}, nil
		}
		if has("scoop") {
			return []step{{cmd: "scoop", args: []string{"install", "git"}}}, nil
		}
		if has("choco") {
			return []step{{cmd: "choco", args: []string{"install", "git", "-y"}}}, nil
		}
		return nil, errors.New("no installer found for git")
	}

	if id == "node" || id == "npm" {
		if has("winget") {
			return []step{{
				cmd: "winget",
				args: []string{
					"install",
					"--id",
					"OpenJS.NodeJS.LTS",
					"-e",
					"--accept-package-agreements",
					"--accept-source-agreements",
					"--silent",
				},
			}}, nil
		}
		if has("scoop") {
			return []step{{cmd: "scoop", args: []string{"install", "nodejs-lts"}}}, nil
		}
		if has("choco") {
			return []step{{cmd: "choco", args: []string{"install", "nodejs-lts", "-y"}}}, nil
		}
		return nil, errors.New("no installer found for node or npm")
	}

	if id == "opencode" {
		if has("npm") {
			return []step{{cmd: "npm", args: []string{"install", "-g", "opencode-ai"}}}, nil
		}
		if has("scoop") {
			return []step{{cmd: "scoop", args: []string{"install", "opencode"}}}, nil
		}
		if has("choco") {
			return []step{{cmd: "choco", args: []string{"install", "opencode", "-y"}}}, nil
		}
		return nil, errors.New("no installer found for opencode")
	}

	return nil, errTool
}

func (s *Service) set(id string, fn func(task *Task)) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]
	if !ok {
		return
	}

	fn(task)
}

func (s *Service) fail(id string, code *int, msg string, out string) {
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]
	if !ok {
		return
	}

	task.Status = TaskFailed
	task.FinishedAt = &now
	task.ExitCode = code
	task.Error = msg
	if out != "" {
		task.Output = out
	}
	task.Log = push(task.Log, "task failed")
	delete(s.run, task.Tool)
}

func (s *Service) done(id string, state State) {
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]
	if !ok {
		return
	}

	task.Status = TaskSuccess
	task.FinishedAt = &now
	task.Output = strings.TrimSpace(state.Version + " " + state.Path)
	task.Log = push(task.Log, "task completed")
	delete(s.run, task.Tool)
}

func has(bin string) bool {
	_, err := exec.LookPath(bin)
	return err == nil
}

func exit(err error) *int {
	var code int
	var ee *exec.ExitError
	if errors.As(err, &ee) {
		code = ee.ExitCode()
		return &code
	}
	return nil
}

func tidy(text string) string {
	return strings.TrimSpace(strings.ReplaceAll(text, "\r\n", "\n"))
}

func lines(text string) []string {
	all := strings.Split(text, "\n")
	out := make([]string, 0, len(all))
	for _, item := range all {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		out = append(out, item)
	}
	return out
}

func trim(all []string, max int) []string {
	if len(all) <= max {
		return all
	}
	return append([]string{}, all[len(all)-max:]...)
}

func push(all []string, item string) []string {
	return trim(append(all, item), 40)
}
