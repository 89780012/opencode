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

const (
	actionInstall   = "install"
	actionUninstall = "uninstall"
	actionReinstall = "reinstall"
)

func (s *Service) Uninstall(ctx context.Context, id string) (Task, error) {
	return s.start(ctx, id, actionUninstall)
}

func (s *Service) Reinstall(ctx context.Context, id string) (Task, error) {
	return s.start(ctx, id, actionReinstall)
}

func (s *Service) start(ctx context.Context, id string, action string) (Task, error) {
	if !known(id) {
		slog.Warn("tool action: unknown tool", "tool", id, "action", action)
		return Task{}, errTool
	}

	task := &Task{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Tool:      id,
		Status:    TaskPending,
		Title:     queueTitle(action),
		StartedAt: time.Now(),
		Log:       []string{queueLog(action)},
	}

	s.mu.Lock()
	if s.run[id] != "" {
		s.mu.Unlock()
		slog.Warn("tool action: already running", "tool", id, "action", action)
		return Task{}, errBusy
	}
	s.tasks[task.ID] = task
	s.last[id] = task.ID
	s.run[id] = task.ID
	s.mu.Unlock()

	slog.Info("tool action task created", "tool", id, "action", action, "task_id", task.ID)
	go s.execAction(ctx, task.ID, action)

	return cloneTask(task), nil
}

func (s *Service) execAction(ctx context.Context, id string, action string) {
	s.set(id, func(task *Task) {
		task.Status = TaskRunning
		task.Title = runTitle(action)
		task.Output = runTitle(action)
		task.Log = append(task.Log, runLog(action))
	})

	task, ok := s.Get(id)
	if !ok {
		slog.Error("tool action: task not found", "task_id", id, "action", action)
		return
	}

	steps, err := s.actionSteps(task.Tool, action)
	if err != nil {
		slog.Error("tool action: no steps found", "tool", task.Tool, "action", action, "error", err)
		s.fail(id, nil, err.Error(), "")
		return
	}

	total := len(steps) + 1
	s.set(id, func(task *Task) {
		task.Total = total
		task.Title = prepTitle(action, task.Tool)
		task.Output = fmt.Sprintf("共 %d 个步骤", len(steps))
		task.Log = push(task.Log, fmt.Sprintf("准备就绪：共 %d 个步骤", len(steps)))
	})

	for i, item := range steps {
		text := item.cmd + " " + strings.Join(item.args, " ")
		slog.Info("tool action: running step", "tool", task.Tool, "action", action, "step", i+1, "command", strings.TrimSpace(text))
		s.set(id, func(task *Task) {
			task.Step = i + 1
			task.Title = item.title
			task.Log = push(task.Log, "执行命令："+strings.TrimSpace(text))
			task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d：%s", task.Step, task.Total, item.title))
			task.Output = item.title
		})

		sub, cancel := context.WithTimeout(ctx, 30*time.Minute)
		cmd := command(sub, item)
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
			slog.Error("tool action: step failed", "tool", task.Tool, "action", action, "step", i+1, "error", msg)
			s.fail(id, code, msg, body)
			return
		}

		s.set(id, func(task *Task) {
			task.Output = fmt.Sprintf("第 %d 步已完成", i+1)
			task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d 已完成", i+1, task.Total))
		})
	}

	s.set(id, func(task *Task) {
		task.Step = total
		task.Title = verifyTitle(action)
		task.Output = verifyTitle(action)
		task.Log = push(task.Log, fmt.Sprintf("步骤 %d/%d：%s", task.Step, task.Total, verifyTitle(action)))
	})

	state := s.inspect(context.Background(), task.Tool)
	if !s.ok(action, state) {
		msg := state.Message
		if msg == "" {
			msg = verifyErr(action)
		}
		slog.Error("tool action: verification failed", "tool", task.Tool, "action", action, "message", msg)
		s.fail(id, nil, msg, "")
		return
	}

	s.finish(id, state, action)
}

func (s *Service) actionSteps(id string, action string) ([]step, error) {
	if action == actionInstall {
		return s.steps(id)
	}

	state := s.inspect(context.Background(), id)
	src := source(id, state.Path)

	if action == actionUninstall {
		return s.uninstallSteps(id, src)
	}

	if action == actionReinstall {
		rm, err := s.uninstallSteps(id, src)
		if err != nil {
			return nil, err
		}
		add, err := s.installSteps(id, src)
		if err != nil {
			return nil, err
		}
		return append(rm, add...), nil
	}

	return nil, errTool
}

func (s *Service) installSteps(id string, src string) ([]step, error) {
	if id == "git" {
		if src == "winget" || (src == "" && has("winget")) {
			return []step{{
				title: "使用 winget 安装 Git",
				cmd:   "winget",
				args:  []string{"install", "--id", "Git.Git", "-e", "--accept-package-agreements", "--accept-source-agreements", "--silent"},
			}}, nil
		}
		if src == "scoop" || (src == "" && has("scoop")) {
			return []step{{title: "使用 scoop 安装 Git", cmd: "scoop", args: []string{"install", "git"}}}, nil
		}
		if src == "choco" || (src == "" && has("choco")) {
			return []step{{title: "使用 chocolatey 安装 Git", cmd: "choco", args: []string{"install", "git", "-y"}}}, nil
		}
		return nil, errors.New("未找到 Git 的安装器")
	}

	if id == "node" || id == "npm" {
		if src == "winget" || (src == "" && has("winget")) {
			return []step{{
				title: "使用 winget 安装 Node.js LTS",
				cmd:   "winget",
				args:  []string{"install", "--id", "OpenJS.NodeJS.LTS", "-e", "--accept-package-agreements", "--accept-source-agreements", "--silent"},
			}}, nil
		}
		if src == "scoop" || (src == "" && has("scoop")) {
			return []step{{title: "使用 scoop 安装 Node.js LTS", cmd: "scoop", args: []string{"install", "nodejs-lts"}}}, nil
		}
		if src == "choco" || (src == "" && has("choco")) {
			return []step{{title: "使用 chocolatey 安装 Node.js LTS", cmd: "choco", args: []string{"install", "nodejs-lts", "-y"}}}, nil
		}
		return nil, errors.New("未找到 Node.js 或 npm 的安装器")
	}

	if id == "opencode" {
		if src == "npm" || (src == "" && has("npm")) {
			return []step{{title: "使用 npm 安装 OpenCode", cmd: "npm", args: []string{"install", "-g", "opencode-ai"}}}, nil
		}
		if src == "scoop" || (src == "" && has("scoop")) {
			return []step{{title: "使用 scoop 安装 OpenCode", cmd: "scoop", args: []string{"install", "opencode"}}}, nil
		}
		if src == "choco" || (src == "" && has("choco")) {
			return []step{{title: "使用 chocolatey 安装 OpenCode", cmd: "choco", args: []string{"install", "opencode", "-y"}}}, nil
		}
		return nil, errors.New("未找到 OpenCode 的安装器")
	}

	return nil, errTool
}

func (s *Service) uninstallSteps(id string, src string) ([]step, error) {
	if id == "git" {
		if src == "scoop" {
			return []step{{title: "使用 scoop 卸载 Git", cmd: "scoop", args: []string{"uninstall", "git"}}}, nil
		}
		if src == "choco" {
			return []step{{title: "使用 chocolatey 卸载 Git", cmd: "choco", args: []string{"uninstall", "git", "-y"}}}, nil
		}
		if has("winget") {
			return []step{{
				title: "使用 winget 卸载 Git",
				cmd:   "winget",
				args:  []string{"uninstall", "--id", "Git.Git", "-e", "--silent", "--accept-source-agreements"},
			}}, nil
		}
	}

	if id == "node" || id == "npm" {
		if src == "scoop" {
			return []step{{title: "使用 scoop 卸载 Node.js LTS", cmd: "scoop", args: []string{"uninstall", "nodejs-lts"}}}, nil
		}
		if src == "choco" {
			return []step{{title: "使用 chocolatey 卸载 Node.js LTS", cmd: "choco", args: []string{"uninstall", "nodejs-lts", "-y"}}}, nil
		}
		if has("winget") {
			return []step{{
				title: "使用 winget 卸载 Node.js LTS",
				cmd:   "winget",
				args:  []string{"uninstall", "--id", "OpenJS.NodeJS.LTS", "-e", "--silent", "--accept-source-agreements"},
			}}, nil
		}
	}

	if id == "opencode" {
		if src == "scoop" {
			return []step{{title: "使用 scoop 卸载 OpenCode", cmd: "scoop", args: []string{"uninstall", "opencode"}}}, nil
		}
		if src == "choco" {
			return []step{{title: "使用 chocolatey 卸载 OpenCode", cmd: "choco", args: []string{"uninstall", "opencode", "-y"}}}, nil
		}
		if has("npm") {
			return []step{{title: "使用 npm 卸载 OpenCode", cmd: "npm", args: []string{"uninstall", "-g", "opencode-ai"}}}, nil
		}
	}

	return nil, errors.New("未找到可用的卸载器")
}

func (s *Service) ok(action string, state State) bool {
	if action == actionUninstall {
		return !state.Installed || state.Status == StatusMissing
	}

	return state.Installed && state.Status == StatusInstalled
}

func (s *Service) finish(id string, state State, action string) {
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
	task.Title = doneTitle(action)
	task.Output = doneOutput(action, state)
	task.Log = push(task.Log, doneLog(action))
	delete(s.run, task.Tool)
}

func source(id string, path string) string {
	text := strings.ToLower(path)
	if strings.Contains(text, "\\scoop\\") {
		return "scoop"
	}
	if strings.Contains(text, "\\chocolatey\\") {
		return "choco"
	}
	if id == "opencode" && (strings.Contains(text, "\\npm\\") || strings.Contains(text, "\\nodejs\\")) {
		return "npm"
	}
	if strings.Contains(text, "\\program files\\") || strings.Contains(text, "\\windowsapps\\") {
		return "winget"
	}
	return ""
}

func queueTitle(action string) string {
	if action == actionUninstall {
		return "等待开始卸载"
	}
	if action == actionReinstall {
		return "等待开始重装"
	}
	return "等待开始安装"
}

func queueLog(action string) string {
	if action == actionUninstall {
		return "卸载任务已创建"
	}
	if action == actionReinstall {
		return "重装任务已创建"
	}
	return "安装任务已创建"
}

func runTitle(action string) string {
	if action == actionUninstall {
		return "准备卸载任务"
	}
	if action == actionReinstall {
		return "准备重装任务"
	}
	return "准备安装任务"
}

func runLog(action string) string {
	if action == actionUninstall {
		return "卸载任务已开始"
	}
	if action == actionReinstall {
		return "重装任务已开始"
	}
	return "安装任务已开始"
}

func prepTitle(action string, id string) string {
	if action == actionUninstall {
		return fmt.Sprintf("准备卸载 %s", label(id))
	}
	if action == actionReinstall {
		return fmt.Sprintf("准备重装 %s", label(id))
	}
	return fmt.Sprintf("准备安装 %s", label(id))
}

func verifyTitle(action string) string {
	if action == actionUninstall {
		return "校验卸载结果"
	}
	return "校验安装结果"
}

func verifyErr(action string) string {
	if action == actionUninstall {
		return "卸载命令已执行完成，但校验结果仍显示服务存在"
	}
	return "安装命令已执行完成，但健康检查未通过"
}

func doneTitle(action string) string {
	if action == actionUninstall {
		return "卸载完成"
	}
	if action == actionReinstall {
		return "重装完成"
	}
	return "安装完成"
}

func doneLog(action string) string {
	if action == actionUninstall {
		return "卸载任务完成"
	}
	if action == actionReinstall {
		return "重装任务完成"
	}
	return "安装任务完成"
}

func doneOutput(action string, state State) string {
	if action == actionUninstall {
		return "服务已卸载"
	}
	return strings.TrimSpace(state.Version + " " + state.Path)
}

func command(ctx context.Context, item step) *exec.Cmd {
	cmd := exec.CommandContext(ctx, item.cmd, item.args...)
	proc.Hide(cmd)
	return cmd
}
