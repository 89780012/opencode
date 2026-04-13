package opdoc

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var agentName = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)
var agentDigit = regexp.MustCompile(`^\d+$`)

type AgentDoc struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Scope       string `json:"scope,omitempty"`
	Mode        string `json:"mode"`
	Model       string `json:"model,omitempty"`
	Color       string `json:"color,omitempty"`
	Hidden      bool   `json:"hidden"`
	Steps       int    `json:"steps,omitempty"`
	Path        string `json:"path"`
	Content     string `json:"content"`
	UpdatedAt   string `json:"updated_at"`
}

type AgentList struct {
	Root   string     `json:"root"`
	Agents []AgentDoc `json:"agents"`
}

// agentRoot 返回 opencode agents 根目录，并确保目录存在。
func agentRoot() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	root := filepath.Join(dir, "agents")
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", err
	}
	return root, nil
}

// validAgent 校验并规范化 agent 名称。
func validAgent(name string) (string, error) {
	name = strings.TrimSpace(strings.ToLower(name))
	if !agentName.MatchString(name) {
		return "", errors.New("agent name must match ^[a-z0-9][a-z0-9_-]*$")
	}
	if agentDigit.MatchString(name) {
		return "", errors.New("agent name cannot be only digits")
	}
	return name, nil
}

// agentPath 返回指定 agent 对应的文档路径。
func agentPath(name string) (string, error) {
	root, err := agentRoot()
	if err != nil {
		return "", err
	}
	name, err = validAgent(name)
	if err != nil {
		return "", err
	}
	return filepath.Join(root, name+".md"), nil
}

// parseBool 解析 frontmatter 中的布尔值。
func parseBool(input string) bool {
	switch strings.ToLower(strings.TrimSpace(input)) {
	case "true", "yes", "on":
		return true
	default:
		return false
	}
}

// parseMode 解析并校验 agent 模式。
func parseMode(input string) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(input))
	if mode == "" {
		return "all", nil
	}
	switch mode {
	case "all", "primary", "subagent":
		return mode, nil
	default:
		return "", fmt.Errorf("agent mode must be one of all, primary, subagent")
	}
}

// parseSteps 解析并校验 steps 配置。
func parseSteps(input string) (int, error) {
	text := strings.TrimSpace(input)
	if text == "" {
		return 0, nil
	}
	out, err := strconv.Atoi(text)
	if err != nil {
		return 0, errors.New("agent steps must be an integer")
	}
	if out <= 0 {
		return 0, errors.New("agent steps must be greater than 0")
	}
	return out, nil
}

// parseAgent 将磁盘上的 agent 文档解析为结构化结果。
func parseAgent(path string, body []byte, mod time.Time) (AgentDoc, error) {
	text := strings.ToValidUTF8(string(body), "")
	meta := frontmatter(text)
	name := meta["name"]
	if name == "" {
		name = strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	}
	name, err := validAgent(name)
	if err != nil {
		return AgentDoc{}, err
	}
	mode, err := parseMode(meta["mode"])
	if err != nil {
		return AgentDoc{}, err
	}
	steps, err := parseSteps(meta["steps"])
	if err != nil {
		return AgentDoc{}, err
	}
	return AgentDoc{
		Name:        name,
		Description: meta["description"],
		Scope:       meta["scope"],
		Mode:        mode,
		Model:       meta["model"],
		Color:       meta["color"],
		Hidden:      parseBool(meta["hidden"]),
		Steps:       steps,
		Path:        path,
		Content:     text,
		UpdatedAt:   mod.UTC().Format(time.RFC3339),
	}, nil
}

// ListAgents 返回磁盘上的 opencode agents 列表。
func ListAgents() (AgentList, error) {
	root, rows, err := list(
		agentRoot,
		func(root string, item os.DirEntry) (string, bool) {
			if item.IsDir() || filepath.Ext(item.Name()) != ".md" {
				return "", false
			}
			return filepath.Join(root, item.Name()), true
		},
		parseAgent,
		func(a AgentDoc, b AgentDoc) bool {
			return a.Name < b.Name
		},
	)
	if err != nil {
		return AgentList{}, err
	}

	return AgentList{
		Root:   root,
		Agents: rows,
	}, nil
}

// CreateAgent 创建一份新的 agent 文档。
func CreateAgent(name string, content string) (AgentDoc, error) {
	return create(agentPath, writeAgent, name, content)
}

// UpdateAgent 覆盖已有的 agent 文档。
func UpdateAgent(name string, content string) (AgentDoc, error) {
	return update(agentPath, writeAgent, name, content)
}

// DeleteAgent 从磁盘删除对应的 agent 文档。
func DeleteAgent(name string) error {
	return remove(agentPath, os.Remove, name)
}

// checkAgent 校验写入前的 frontmatter 与路径是否一致。
func checkAgent(path string, meta map[string]string) error {
	name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	if meta["name"] != "" && strings.ToLower(strings.TrimSpace(meta["name"])) != name {
		return fmt.Errorf("frontmatter name must match agent name %q", name)
	}
	if _, err := parseMode(meta["mode"]); err != nil {
		return err
	}
	if _, err := parseSteps(meta["steps"]); err != nil {
		return err
	}
	return nil
}

// writeAgent 规范化内容后写回 agent 文档。
func writeAgent(path string, input string) (AgentDoc, error) {
	text, meta, err := body(input, "agent")
	if err != nil {
		return AgentDoc{}, err
	}
	return save(path, text, meta, checkAgent, parseAgent)
}
