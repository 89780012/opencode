package opencode

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

var skillName = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]*$`)
var skillDigit = regexp.MustCompile(`^\d+$`)

type SkillDoc struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Path        string `json:"path"`
	Content     string `json:"content"`
	UpdatedAt   string `json:"updated_at"`
}

type SkillList struct {
	Root string     `json:"root"`
	List []SkillDoc `json:"skills"`
}

func configDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "opencode"), nil
}

func skillRoot() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	root := filepath.Join(dir, "skills")
	err = os.MkdirAll(root, 0o755)
	if err != nil {
		return "", err
	}
	return root, nil
}

func validSkill(name string) (string, error) {
	name = strings.TrimSpace(strings.ToLower(name))
	if !skillName.MatchString(name) {
		return "", errors.New("skill name must match ^[a-z0-9][a-z0-9_-]*$")
	}
	if skillDigit.MatchString(name) {
		return "", errors.New("skill name cannot be only digits")
	}
	return name, nil
}

func skillPath(name string) (string, error) {
	root, err := skillRoot()
	if err != nil {
		return "", err
	}
	name, err = validSkill(name)
	if err != nil {
		return "", err
	}
	return filepath.Join(root, name, "SKILL.md"), nil
}

func frontmatter(input string) map[string]string {
	out := map[string]string{}
	text := strings.ReplaceAll(input, "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return out
	}

	rest := strings.TrimPrefix(text, "---\n")
	end := strings.Index(rest, "\n---\n")
	if end < 0 {
		return out
	}

	for _, line := range strings.Split(rest[:end], "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		i := strings.Index(line, ":")
		if i < 0 {
			continue
		}

		key := strings.TrimSpace(strings.ToLower(line[:i]))
		val := strings.TrimSpace(line[i+1:])
		val = strings.Trim(val, `"'`)
		out[key] = val
	}

	return out
}

func parseSkill(path string, body []byte, mod time.Time) (SkillDoc, error) {
	text := strings.ToValidUTF8(string(body), "")
	meta := frontmatter(text)
	name := meta["name"]
	if name == "" {
		name = filepath.Base(filepath.Dir(path))
	}
	name, err := validSkill(name)
	if err != nil {
		return SkillDoc{}, err
	}
	return SkillDoc{
		Name:        name,
		Description: meta["description"],
		Path:        path,
		Content:     text,
		UpdatedAt:   mod.UTC().Format(time.RFC3339),
	}, nil
}

func ListSkills() (SkillList, error) {
	root, err := skillRoot()
	if err != nil {
		return SkillList{}, err
	}

	items, err := os.ReadDir(root)
	if err != nil {
		return SkillList{}, err
	}

	list := []SkillDoc{}
	for _, item := range items {
		if !item.IsDir() {
			continue
		}

		path := filepath.Join(root, item.Name(), "SKILL.md")
		body, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return SkillList{}, err
		}

		info, err := os.Stat(path)
		if err != nil {
			return SkillList{}, err
		}

		doc, err := parseSkill(path, body, info.ModTime())
		if err != nil {
			return SkillList{}, err
		}
		list = append(list, doc)
	}

	sort.Slice(list, func(i int, j int) bool {
		return list[i].Name < list[j].Name
	})

	return SkillList{
		Root: root,
		List: list,
	}, nil
}

func CreateSkill(name string, content string) (SkillDoc, error) {
	path, err := skillPath(name)
	if err != nil {
		return SkillDoc{}, err
	}
	_, err = os.Stat(path)
	if err == nil {
		return SkillDoc{}, os.ErrExist
	}
	if !os.IsNotExist(err) {
		return SkillDoc{}, err
	}
	return writeSkill(path, content)
}

func UpdateSkill(name string, content string) (SkillDoc, error) {
	path, err := skillPath(name)
	if err != nil {
		return SkillDoc{}, err
	}
	_, err = os.Stat(path)
	if err != nil {
		return SkillDoc{}, err
	}
	return writeSkill(path, content)
}

func DeleteSkill(name string) error {
	path, err := skillPath(name)
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	_, err = os.Stat(path)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func writeSkill(path string, content string) (SkillDoc, error) {
	content = strings.TrimSpace(strings.ReplaceAll(content, "\r\n", "\n"))
	if content == "" {
		return SkillDoc{}, errors.New("skill content is required")
	}
	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}

	name := filepath.Base(filepath.Dir(path))
	meta := frontmatter(content)
	if meta["name"] != "" && strings.ToLower(strings.TrimSpace(meta["name"])) != name {
		return SkillDoc{}, fmt.Errorf("frontmatter name must match skill name %q", name)
	}

	err := os.MkdirAll(filepath.Dir(path), 0o755)
	if err != nil {
		return SkillDoc{}, err
	}
	err = os.WriteFile(path, []byte(content), 0o644)
	if err != nil {
		return SkillDoc{}, err
	}

	info, err := os.Stat(path)
	if err != nil {
		return SkillDoc{}, err
	}
	return parseSkill(path, []byte(content), info.ModTime())
}
