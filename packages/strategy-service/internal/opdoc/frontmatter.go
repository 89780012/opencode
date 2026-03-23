package opdoc

import (
	"os"
	"path/filepath"
	"strings"
)

func configDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "opencode"), nil
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
