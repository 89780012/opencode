package web

import (
	"errors"
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/oprun"
)

func NewOpencodeProxy(mgr *oprun.Manager) gin.HandlerFunc {
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

	return func(c *gin.Context) {
		err := mgr.Ensure(c.Request.Context())
		if err != nil {
			code := http.StatusServiceUnavailable
			if errors.Is(err, oprun.ErrDisabled()) {
				code = http.StatusNotImplemented
			}
			c.String(code, err.Error())
			return
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func route(path string) string {
	out := strings.TrimPrefix(path, "/opencode")
	if out == "" {
		return "/"
	}
	return out
}
