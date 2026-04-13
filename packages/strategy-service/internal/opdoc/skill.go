package opdoc

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
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

// skillRoot 返回 opencode skills 根目录，并确保目录存在。
func skillRoot() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	root := filepath.Join(dir, "skills")
	if err := os.MkdirAll(root, 0o755); err != nil {
		return "", err
	}
	return root, nil
}

// validSkill 校验并规范化 skill 名称。
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

// skillPath 返回指定 skill 对应的文档路径。
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

// parseSkill 将磁盘上的 SKILL.md 解析为结构化文档。
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

// ListSkills 返回磁盘上的 opencode skills 列表。
func ListSkills() (SkillList, error) {
	root, rows, err := list(
		skillRoot,
		func(root string, item os.DirEntry) (string, bool) {
			if !item.IsDir() {
				return "", false
			}
			return filepath.Join(root, item.Name(), "SKILL.md"), true
		},
		parseSkill,
		func(a SkillDoc, b SkillDoc) bool {
			return a.Name < b.Name
		},
	)
	if err != nil {
		return SkillList{}, err
	}

	return SkillList{
		Root: root,
		List: rows,
	}, nil
}

// CreateSkill 创建一份新的 skill 文档。
func CreateSkill(name string, content string) (SkillDoc, error) {
	return create(skillPath, writeSkill, name, content)
}

// UpdateSkill 覆盖已有的 skill 文档。
func UpdateSkill(name string, content string) (SkillDoc, error) {
	return update(skillPath, writeSkill, name, content)
}

// DeleteSkill 从磁盘删除对应的 skill 目录。
func DeleteSkill(name string) error {
	return remove(skillPath, func(path string) error {
		return os.RemoveAll(filepath.Dir(path))
	}, name)
}

// checkSkill 校验写入前的 frontmatter 与路径是否一致。
func checkSkill(path string, meta map[string]string) error {
	name := filepath.Base(filepath.Dir(path))
	if meta["name"] != "" && strings.ToLower(strings.TrimSpace(meta["name"])) != name {
		return fmt.Errorf("frontmatter name must match skill name %q", name)
	}
	return nil
}

// writeSkill 规范化内容后写回 skill 文档。
func writeSkill(path string, input string) (SkillDoc, error) {
	text, meta, err := body(input, "skill")
	if err != nil {
		return SkillDoc{}, err
	}
	return save(path, text, meta, checkSkill, parseSkill)
}
