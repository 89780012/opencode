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

var errBusy = errors.New("该服务已有任务正在执行")

func ErrBusy() error {
	return errBusy
}

type step struct {
	title string
	cmd   string
	args  []string
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
		Title:     "等待开始安装",
		StartedAt: time.Now(),
		Log:       []string{"安装任务已创建"},
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
		task.Title = "准备安装任务"
		task.Output = "准备安装任务"
		task.Log = append(task.Log, "安装任务已开始")
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

	total := len(steps) + 1
	s.set(id, func(task *Task) {
		task.Total = total
		task.Title = fmt.Sprintf("准备安装 %s", label(task.Tool))
		task.Output = fmt.Sprintf("共 %d 个步骤", len(steps))
		task.Log = push(task.Log, fmt.Sprintf("准备就绪：共 %d 个步骤", len(steps)))
	})

	for i, item := range steps {
		text := item.cmd + " " + strings.Join(item.args, " ")
		slog.Info("tool install: running step", "tool", task.Tool, "step", i+1, "command", strings.TrimSpace(text))
		s.set(id, func(task *Task) {
			task.Step = i + 1
			task.Title = item.title
			task.Log = push(task.Log, "执行命令："+strings.TrimSpace(text))
			task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d：%s", task.Step, task.Total, item.title))
			task.Output = item.title
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
				task.Log = trim(task.Log, 200)
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
		s.set(id, func(task *Task) {
			task.Output = fmt.Sprintf("第 %d 步已完成", i+1)
			task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d 已完成", i+1, task.Total))
		})
	}

	s.set(id, func(task *Task) {
		task.Step = total
		task.Title = "校验安装结果"
		task.Output = "校验安装结果"
		task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d：校验安装结果", task.Step, task.Total))
	})

	state := s.inspect(context.Background(), task.Tool)
	if !state.Installed || state.Status != StatusInstalled {
		msg := state.Message
		if msg == "" {
			msg = "安装命令已执行完成，但健康检查未通过"
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
				title: "使用 winget 安装 Git",
				cmd:   "winget",
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
			return []step{{title: "使用 scoop 安装 Git", cmd: "scoop", args: []string{"install", "git"}}}, nil
		}
		if has("choco") {
			return []step{{title: "使用 chocolatey 安装 Git", cmd: "choco", args: []string{"install", "git", "-y"}}}, nil
		}
		return nil, errors.New("未找到 Git 的安装器")
	}

	if id == "node" || id == "npm" {
		if has("winget") {
			return []step{{
				title: "使用 winget 安装 Node.js LTS",
				cmd:   "winget",
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
			return []step{{title: "使用 scoop 安装 Node.js LTS", cmd: "scoop", args: []string{"install", "nodejs-lts"}}}, nil
		}
		if has("choco") {
			return []step{{title: "使用 chocolatey 安装 Node.js LTS", cmd: "choco", args: []string{"install", "nodejs-lts", "-y"}}}, nil
		}
		return nil, errors.New("未找到 Node.js 或 npm 的安装器")
	}

	if id == "opencode" {
		if has("npm") {
			return []step{{title: "使用 npm 安装 OpenCode", cmd: "npm", args: []string{"install", "-g", "opencode-ai"}}}, nil
		}
		if has("scoop") {
			return []step{{title: "使用 scoop 安装 OpenCode", cmd: "scoop", args: []string{"install", "opencode"}}}, nil
		}
		if has("choco") {
			return []step{{title: "使用 chocolatey 安装 OpenCode", cmd: "choco", args: []string{"install", "opencode", "-y"}}}, nil
		}
		return nil, errors.New("未找到 OpenCode 的安装器")
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
	task.Title = "处理失败"
	task.Error = msg
	if out != "" {
		task.Output = out
	}
	if task.Output == "" {
		task.Output = msg
	}
	if msg != "" {
		task.Log = push(task.Log, "错误："+msg)
	}
	task.Log = push(task.Log, "任务失败")
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
	task.Step = task.Total
	task.FinishedAt = &now
	task.Title = "安装完成"
	task.Output = strings.TrimSpace(state.Version + " " + state.Path)
	task.Log = push(task.Log, "任务完成")
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
	return trim(append(all, item), 200)
}
