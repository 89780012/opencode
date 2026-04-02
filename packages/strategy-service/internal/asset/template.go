package asset

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Template struct {
	Type      string
	ID        string
	Root      string
	EntryFile string
	Keywords  []string
	Package   bool
}

type Meta struct {
	Type      string   `json:"type"`
	Template  string   `json:"template"`
	EntryFile string   `json:"entry_file,omitempty"`
	Keywords  []string `json:"keywords,omitempty"`
	CreatedAt string   `json:"created_at"`
}

func templates() map[string]Template {
	return map[string]Template{
		"smartx_plugin_python": {
			Type:      "smartx",
			ID:        "smartx_plugin_python",
			Root:      "workspace/template/plugin_python",
			EntryFile: "start.py",
			Keywords:  []string{"smartx", "python", "plugin"},
			Package:   true,
		},
		"python_basic": {
			Type:      "python",
			ID:        "python_basic",
			Root:      "workspace/template/python_basic",
			EntryFile: "main.py",
			Keywords:  []string{"python"},
		},
		"js_basic": {
			Type:      "js",
			ID:        "js_basic",
			Root:      "workspace/template/js_basic",
			EntryFile: "index.js",
			Keywords:  []string{"javascript", "js"},
		},
		"other_basic": {
			Type:      "other",
			ID:        "other_basic",
			Root:      "workspace/template/other_basic",
			EntryFile: "README.md",
			Keywords:  []string{"other"},
		},
	}
}

func TemplateByType(kind string) (Template, bool) {
	kind = strings.TrimSpace(strings.ToLower(kind))
	for _, item := range templates() {
		if item.Type == kind {
			return item, true
		}
	}
	return Template{}, false
}

func TemplateByID(id string) (Template, bool) {
	item, ok := templates()[strings.TrimSpace(strings.ToLower(id))]
	return item, ok
}

func MetaPath(dir string) string {
	return filepath.Join(dir, ".strategy", "meta.json")
}

func WriteMeta(dir string, item Template, name string) error {
	meta := Meta{
		Type:      item.Type,
		Template:  item.ID,
		EntryFile: item.EntryFile,
		Keywords:  append([]string{name, item.Type}, item.Keywords...),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	body, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')
	err = os.MkdirAll(filepath.Dir(MetaPath(dir)), 0o755)
	if err != nil {
		return err
	}
	return os.WriteFile(MetaPath(dir), body, 0o644)
}

func ReadMeta(dir string) (Meta, error) {
	body, err := os.ReadFile(MetaPath(dir))
	if err != nil {
		return Meta{}, err
	}
	var item Meta
	err = json.Unmarshal(body, &item)
	if err != nil {
		return Meta{}, err
	}
	return item, nil
}
