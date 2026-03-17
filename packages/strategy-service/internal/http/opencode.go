package web

import (
	"errors"
	"net/http"
	"net/http/httputil"
	"strings"

	"strategy-service/internal/opencode"
)

func NewOpencodeProxy(mgr *opencode.Manager) http.Handler {
	target := mgr.Target()
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.FlushInterval = -1
	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		http.Error(w, err.Error(), http.StatusBadGateway)
	}
	proxy.Director = func(r *http.Request) {
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		r.Host = target.Host
		r.URL.Path = route(r.URL.Path)
		r.URL.RawPath = r.URL.Path
		if _, ok := r.Header["User-Agent"]; !ok {
			r.Header.Set("User-Agent", "")
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := mgr.Ensure(r.Context())
		if err != nil {
			code := http.StatusServiceUnavailable
			if errors.Is(err, opencode.ErrDisabled()) {
				code = http.StatusNotImplemented
			}
			http.Error(w, err.Error(), code)
			return
		}
		proxy.ServeHTTP(w, r)
	})
}

func route(path string) string {
	out := strings.TrimPrefix(path, "/opencode")
	if out == "" {
		return "/"
	}
	return out
}
