package opdoc

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
	Scope       string `json:"scope,omitempty"`
	Path        string `json:"path"`
	Content     string `json:"content"`
	UpdatedAt   string `json:"updated_at"`
}

type SkillList struct {
	Root string     `json:"root"`
	List []SkillDoc `json:"skills"`
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
		Scope:       meta["scope"],
		Path:        path,
		Content:     text,
		UpdatedAt:   mod.UTC().Format(time.RFC3339),
	}, nil
}

// ListSkills returns the configured opencode skills on disk.
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

// CreateSkill writes a new skill document.
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

// UpdateSkill overwrites an existing skill document.
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

// DeleteSkill removes a skill directory from disk.
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
