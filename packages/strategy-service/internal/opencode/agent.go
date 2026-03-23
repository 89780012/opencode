package opencode

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

var agentName = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)
var agentDigit = regexp.MustCompile(`^\d+$`)

type AgentDoc struct {
	Name        string `json:"name"`
	Description string `json:"description"`
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

func agentRoot() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	root := filepath.Join(dir, "agents")
	err = os.MkdirAll(root, 0o755)
	if err != nil {
		return "", err
	}
	return root, nil
}

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

func parseBool(input string) bool {
	switch strings.ToLower(strings.TrimSpace(input)) {
	case "true", "yes", "on":
		return true
	default:
		return false
	}
}

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

func ListAgents() (AgentList, error) {
	root, err := agentRoot()
	if err != nil {
		return AgentList{}, err
	}

	items, err := os.ReadDir(root)
	if err != nil {
		return AgentList{}, err
	}

	list := []AgentDoc{}
	for _, item := range items {
		if item.IsDir() {
			continue
		}
		if filepath.Ext(item.Name()) != ".md" {
			continue
		}

		path := filepath.Join(root, item.Name())
		body, err := os.ReadFile(path)
		if err != nil {
			return AgentList{}, err
		}

		info, err := os.Stat(path)
		if err != nil {
			return AgentList{}, err
		}

		doc, err := parseAgent(path, body, info.ModTime())
		if err != nil {
			return AgentList{}, err
		}
		list = append(list, doc)
	}

	sort.Slice(list, func(i int, j int) bool {
		return list[i].Name < list[j].Name
	})

	return AgentList{
		Root:   root,
		Agents: list,
	}, nil
}

func CreateAgent(name string, content string) (AgentDoc, error) {
	path, err := agentPath(name)
	if err != nil {
		return AgentDoc{}, err
	}
	_, err = os.Stat(path)
	if err == nil {
		return AgentDoc{}, os.ErrExist
	}
	if !os.IsNotExist(err) {
		return AgentDoc{}, err
	}
	return writeAgent(path, content)
}

func UpdateAgent(name string, content string) (AgentDoc, error) {
	path, err := agentPath(name)
	if err != nil {
		return AgentDoc{}, err
	}
	_, err = os.Stat(path)
	if err != nil {
		return AgentDoc{}, err
	}
	return writeAgent(path, content)
}

func DeleteAgent(name string) error {
	path, err := agentPath(name)
	if err != nil {
		return err
	}
	_, err = os.Stat(path)
	if err != nil {
		return err
	}
	return os.Remove(path)
}

func writeAgent(path string, content string) (AgentDoc, error) {
	content = strings.TrimSpace(strings.ReplaceAll(content, "\r\n", "\n"))
	if content == "" {
		return AgentDoc{}, errors.New("agent content is required")
	}
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}

	// 文件名是 agent 的稳定标识，frontmatter name 只能缺省或与文件名一致。
	name := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
	meta := frontmatter(content)
	if meta["name"] != "" && strings.ToLower(strings.TrimSpace(meta["name"])) != name {
		return AgentDoc{}, fmt.Errorf("frontmatter name must match agent name %q", name)
	}
	if _, err := parseMode(meta["mode"]); err != nil {
		return AgentDoc{}, err
	}
	if _, err := parseSteps(meta["steps"]); err != nil {
		return AgentDoc{}, err
	}

	err := os.MkdirAll(filepath.Dir(path), 0o755)
	if err != nil {
		return AgentDoc{}, err
	}
	err = os.WriteFile(path, []byte(content), 0o644)
	if err != nil {
		return AgentDoc{}, err
	}

	info, err := os.Stat(path)
	if err != nil {
		return AgentDoc{}, err
	}
	return parseAgent(path, []byte(content), info.ModTime())
}
