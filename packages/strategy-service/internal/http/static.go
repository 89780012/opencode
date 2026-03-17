package web

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type Static struct {
	root  string
	index string
	site  fs.FS
	entry string
}

func NewStatic(root string) *Static {
	abs, err := filepath.Abs(root)
	if err != nil {
		abs = root
	}

	site, err := fs.Sub(asset, "dist")
	if err != nil {
		site = nil
	}

	return &Static{
		root:  abs,
		index: filepath.Join(abs, "index.html"),
		site:  site,
		entry: "www/index.html",
	}
}

func (s *Static) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if info, err := os.Stat(s.index); err == nil && !info.IsDir() {
		s.disk(w, r)
		return
	}

	if s.site != nil {
		if _, err := fs.Stat(s.site, s.entry); err == nil {
			s.embed(w, r)
			return
		}
	}

	http.Error(w, "strategy-front dist not found, build the frontend first", http.StatusServiceUnavailable)
}

func (s *Static) disk(w http.ResponseWriter, r *http.Request) {
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

func (s *Static) embed(w http.ResponseWriter, r *http.Request) {
	name := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if name == "." {
		http.ServeFileFS(w, r, s.site, s.entry)
		return
	}

	if name == ".." || strings.HasPrefix(name, "../") {
		http.NotFound(w, r)
		return
	}

	file := path.Join("www", name)
	info, err := fs.Stat(s.site, file)
	if err == nil && !info.IsDir() {
		http.ServeFileFS(w, r, s.site, file)
		return
	}

	if path.Ext(name) != "" {
		http.NotFound(w, r)
		return
	}

	http.ServeFileFS(w, r, s.site, s.entry)
}

func inside(root string, path string) bool {
	if strings.EqualFold(path, root) {
		return true
	}
	return strings.HasPrefix(strings.ToLower(path), strings.ToLower(root+string(filepath.Separator)))
}
