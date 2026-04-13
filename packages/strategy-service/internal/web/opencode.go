package web

import (
	"net/http"
	"net/http/httputil"
	"strings"

	"github.com/gin-gonic/gin"
	oc "strategy-service/internal/opencode"
)

// NewOpencodeProxy 创建指向 opencode 的反向代理，并在转发前确保服务已就绪。
func NewOpencodeProxy(op *oc.Service) gin.HandlerFunc {
	target := op.Target()
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
		err := op.Ensure(c.Request.Context())
		if err != nil {
			code := http.StatusServiceUnavailable
			if oc.Disabled(err) {
				code = http.StatusNotImplemented
			}
			c.String(code, err.Error())
			return
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

// route 去掉 strategy-service 暴露的 /opencode 前缀。
func route(path string) string {
	out := strings.TrimPrefix(path, "/opencode")
	if out == "" {
		return "/"
	}
	return out
}
