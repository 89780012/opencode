package workspace

import (
	"bytes"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"
	"unicode/utf16"
	"unicode/utf8"
)

const (
	limit = 256 * 1024
	peek  = 8 * 1024
)

var skip = map[string]bool{
	".git":         true,
	"build":        true,
	"coverage":     true,
	"dist":         true,
	"node_modules": true,
}

// base 返回 smartx 默认插件目录，并确保目录存在。
func pluginDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".xtp-smart", "plugins")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}
	return dir, nil
}

// root 返回用户工作区根目录，并确保目录存在。
func workspaceDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dir := filepath.Join(home, ".strategy-service", "workspaces")
	err = os.MkdirAll(dir, 0o755)
	if err != nil {
		return "", err
	}
	return dir, nil
}

// safe 校验目标路径是否仍位于工作区根目录之内。
func fullPath(root string, path string) (string, error) {
	if strings.TrimSpace(path) == "" {
		return "", errors.New("path is required")
	}

	full := filepath.Clean(path)         //全路径
	rel, err := filepath.Rel(root, full) //相对路径
	if err != nil {
		return "", err
	}
	if rel == "." {
		return full, nil
	}
	if strings.HasPrefix(rel, "..") {
		return "", errors.New("路径不在工作区内")
	}
	return full, nil
}

// valid 校验新建工作区名称是否合法。
func validPath(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return errors.New("workspace name is required")
	}
	if name == "." || name == ".." {
		return errors.New("invalid workspace name")
	}
	if strings.ContainsAny(name, `\/:*?"<>|`) {
		return errors.New("workspace name contains invalid characters")
	}
	return nil
}

// listDirs 列出根目录下的一级子目录，并转换为工作区记录。
func listDirs(root string) ([]Local, error) {
	items, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}

	out := make([]Local, 0, len(items))
	for _, item := range items {
		if !item.IsDir() {
			continue
		}
		row := local(filepath.Join(root, item.Name()))
		row.Name = item.Name()
		out = append(out, row)
	}

	sort.Slice(out, func(i int, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	return out, nil
}

// listFiles 递归列出工作区内可浏览的文件。
func listFiles(root string) ([]File, error) {
	files := []File{}
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if path != root && skip[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		files = append(files, File{
			Path: filepath.ToSlash(rel),
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(files, func(i int, j int) bool {
		return files[i].Path < files[j].Path
	})

	return files, nil
}

// read 读取文件内容，并按预览上限做截断。
func read(path string) ([]byte, int64, bool, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, 0, false, err
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, 0, false, err
	}
	defer file.Close()

	body, err := io.ReadAll(io.LimitReader(file, limit+1))
	if err != nil {
		return nil, info.Size(), false, err
	}

	if int64(len(body)) > limit {
		return body[:limit], info.Size(), true, nil
	}

	return body, info.Size(), info.Size() > limit, nil
}

func decode(body []byte) (string, bool) {
	if len(body) == 0 {
		return "", true
	}
	if bytes.IndexByte(body, 0) >= 0 {
		return utf16text(body)
	}
	if utf8.Valid(body) {
		return string(body), true
	}
	if value, ok := utf16text(body); ok {
		return value, true
	}
	if !text(body) {
		return "", false
	}
	return strings.ToValidUTF8(string(body), ""), true
}

func utf16text(body []byte) (string, bool) {
	start := 0
	le := false
	if bytes.HasPrefix(body, []byte{0xff, 0xfe}) {
		start = 2
		le = true
	} else if bytes.HasPrefix(body, []byte{0xfe, 0xff}) {
		start = 2
	} else {
		guess, ok := utf16le(body)
		if !ok {
			return "", false
		}
		le = guess
	}

	units := make([]uint16, 0, (len(body)-start)/2)
	for i := start; i+1 < len(body); i += 2 {
		if le {
			units = append(units, uint16(body[i])|uint16(body[i+1])<<8)
			continue
		}
		units = append(units, uint16(body[i])<<8|uint16(body[i+1]))
	}

	value := string(utf16.Decode(units))
	if !readable(value) {
		return "", false
	}
	return value, true
}

func utf16le(body []byte) (bool, bool) {
	head := body
	if len(head) > peek {
		head = head[:peek]
	}
	pairs := len(head) / 2
	if pairs == 0 {
		return false, false
	}

	var even int
	var odd int
	for i := 0; i+1 < len(head); i += 2 {
		if head[i] == 0 {
			even++
		}
		if head[i+1] == 0 {
			odd++
		}
	}

	if float64(odd)/float64(pairs) >= 0.3 {
		return true, true
	}
	if float64(even)/float64(pairs) >= 0.3 {
		return false, true
	}
	return false, false
}

func readable(value string) bool {
	if value == "" {
		return true
	}

	var hit int
	var total int
	for _, ch := range value {
		total++
		if ch == '\n' || ch == '\r' || ch == '\t' {
			hit++
			continue
		}
		if ch != utf8.RuneError && unicode.IsPrint(ch) {
			hit++
		}
	}

	return float64(hit)/float64(total) >= 0.9
}

// text 粗略判断一段内容是否可按文本方式预览。
func text(body []byte) bool {
	if len(body) == 0 {
		return true
	}
	if bytes.IndexByte(body, 0) >= 0 {
		return false
	}

	head := body
	if len(head) > peek {
		head = head[:peek]
	}
	if utf8.Valid(head) {
		return true
	}

	var hit int
	for _, ch := range head {
		if ch == '\n' || ch == '\r' || ch == '\t' {
			hit++
			continue
		}
		if ch >= 0x20 && ch <= 0x7e {
			hit++
		}
	}

	return float64(hit)/float64(len(head)) >= 0.9
}
