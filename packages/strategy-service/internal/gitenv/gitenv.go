package gitenv

import (
	"os"
	"path/filepath"
	"strings"
)

// Apply 为便携版 Git 补齐 PATH、模板目录和可执行目录。
func Apply(all []string, bin string, exec bool) []string {
	bin = strings.TrimSpace(bin)
	if bin == "" {
		return all
	}

	root := base(bin)
	path := ""
	out := make([]string, 0, len(all)+3)
	for _, item := range all {
		upper := strings.ToUpper(item)
		if strings.HasPrefix(upper, "PATH=") {
			path = item[5:]
			continue
		}
		if strings.HasPrefix(upper, "GIT_TEMPLATE_DIR=") {
			continue
		}
		if exec && strings.HasPrefix(upper, "GIT_EXEC_PATH=") {
			continue
		}
		out = append(out, item)
	}

	parts := dirs(root)
	if path != "" {
		parts = append(parts, path)
	}
	if len(parts) > 0 {
		out = append(out, "PATH="+strings.Join(parts, string(os.PathListSeparator)))
	}

	tpl := filepath.Join(root, "mingw64", "share", "git-core", "templates")
	if dir(tpl) {
		out = append(out, "GIT_TEMPLATE_DIR="+tpl)
	}

	if exec {
		core := filepath.Join(root, "mingw64", "libexec", "git-core")
		if dir(core) {
			out = append(out, "GIT_EXEC_PATH="+core)
		}
	}

	return out
}

// base 统一把 git.exe、cmd/git.exe 这类路径折算为安装根目录。
func base(bin string) string {
	root := filepath.Dir(bin)
	base := strings.ToLower(filepath.Base(root))
	if base == "cmd" || base == "bin" {
		return filepath.Dir(root)
	}
	return root
}

// dirs 返回当前安装中需要注入 PATH 的目录列表。
func dirs(root string) []string {
	out := []string{}
	for _, item := range []string{
		filepath.Join(root, "cmd"),
		filepath.Join(root, "bin"),
		filepath.Join(root, "usr", "bin"),
		filepath.Join(root, "mingw64", "bin"),
		filepath.Join(root, "mingw64", "libexec", "git-core"),
	} {
		if dir(item) {
			out = append(out, item)
		}
	}
	return out
}

// dir 判断给定路径是否存在且为目录。
func dir(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
