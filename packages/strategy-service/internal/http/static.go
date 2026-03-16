package web

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Static struct {
	root  string
	index string
}

func NewStatic(root string) *Static {
	abs, err := filepath.Abs(root)
	if err != nil {
		abs = root
	}

	return &Static{
		root:  abs,
		index: filepath.Join(abs, "index.html"),
	}
}

func (s *Static) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if _, err := os.Stat(s.index); err != nil {
		http.Error(w, "strategy-front dist not found, build the frontend first", http.StatusServiceUnavailable)
		return
	}

	name := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if name == "." {
		http.ServeFile(w, r, s.index)
		return
	}

	file := filepath.Join(s.root, name)
	abs, err := filepath.Abs(file)
	if err != nil || !inside(s.root, abs) {
		http.NotFound(w, r)
		return
	}

	info, err := os.Stat(abs)
	if err == nil && !info.IsDir() {
		http.ServeFile(w, r, abs)
		return
	}

	if filepath.Ext(name) != "" {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, s.index)
}

func inside(root string, path string) bool {
	if strings.EqualFold(path, root) {
		return true
	}
	return strings.HasPrefix(strings.ToLower(path), strings.ToLower(root+string(filepath.Separator)))
}
