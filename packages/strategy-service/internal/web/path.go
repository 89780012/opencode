package web

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
)

func cut(path string, pre string, suf string) (string, bool) {
	if !strings.HasPrefix(path, pre) || !strings.HasSuffix(path, suf) {
		return "", false
	}

	name := strings.TrimSuffix(strings.TrimPrefix(path, pre), suf)
	if name == "" || strings.Contains(name, "/") {
		return "", false
	}

	return name, true
}

func tail(path string, pre string) (string, bool) {
	if !strings.HasPrefix(path, pre) {
		return "", false
	}

	name := strings.TrimPrefix(path, pre)
	if name == "" || strings.Contains(name, "/") {
		return "", false
	}

	out, err := url.PathUnescape(name)
	if err != nil || out == "" {
		return "", false
	}
	return out, true
}

func readJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(target)
}
