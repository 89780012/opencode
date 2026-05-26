package web

import (
	"bufio"
	"bytes"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"strings"

	"strategy-service/internal/modelchain"
	oc "strategy-service/internal/opencode"

	"github.com/gin-gonic/gin"
)

// NewOpencodeProxy 创建指向 opencode 的反向代理，并在转发前确保服务已就绪。
func NewOpencodeProxy(op *oc.Service, chain *modelchain.Service) gin.HandlerFunc {
	target := op.Target()
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.FlushInterval = -1
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		slog.Error("opencode proxy error",
			"method", r.Method,
			"url", r.URL.String(),
			"host", r.Host,
			"error", err,
		)
		http.Error(w, err.Error(), http.StatusBadGateway)
	}
	proxy.Director = func(r *http.Request) {
		// path := r.URL.Path
		// host := r.Host
		r.URL.Scheme = target.Scheme
		r.URL.Host = target.Host
		r.Host = target.Host
		r.URL.Path = route(r.URL.Path)
		r.URL.RawPath = r.URL.Path
		if _, ok := r.Header["User-Agent"]; !ok {
			r.Header.Set("User-Agent", "")
		}
		// slog.Info("opencode proxy forward",
		// 	"method", r.Method,
		// 	"from_path", path,
		// 	"from_host", host,
		// 	"to_url", r.URL.String(),
		// 	"to_host", r.Host,
		// )
	}
	proxy.ModifyResponse = func(r *http.Response) error {
		// slog.Info("opencode proxy response",
		// 	"method", r.Request.Method,
		// 	"url", r.Request.URL.String(),
		// 	"status", r.StatusCode,
		// 	"content_type", r.Header.Get("Content-Type"),
		// 	"location", r.Header.Get("Location"),
		// )
		if chain != nil && r.Request.URL.Path == "/event" && strings.Contains(r.Header.Get("Content-Type"), "text/event-stream") {
			r.Body = tap(r.Body, func(data []byte) {
				chain.Event(data)
			})
		}
		return nil
	}

	return func(c *gin.Context) {
		// slog.Info("opencode proxy incoming",
		// 	"method", c.Request.Method,
		// 	"path", c.Request.URL.Path,
		// 	"query", c.Request.URL.RawQuery,
		// 	"host", c.Request.Host,
		// 	"accept", c.GetHeader("Accept"),
		// )
		err := op.Ensure(c.Request.Context())
		if err != nil {
			code := http.StatusServiceUnavailable
			if oc.Disabled(err) {
				code = http.StatusNotImplemented
			}
			// slog.Warn("opencode proxy unavailable",
			// 	"method", c.Request.Method,
			// 	"path", c.Request.URL.Path,
			// 	"status", code,
			// 	"error", err,
			// )
			c.String(code, err.Error())
			return
		}
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func tap(body io.ReadCloser, fn func([]byte)) io.ReadCloser {
	pr, pw := io.Pipe()
	go func() {
		defer pr.Close()

		scan := bufio.NewScanner(pr)
		scan.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		var data [][]byte
		for scan.Scan() {
			line := bytes.TrimSuffix(scan.Bytes(), []byte{'\r'})
			if len(line) == 0 {
				if len(data) == 0 {
					continue
				}
				fn(bytes.Join(data, []byte("\n")))
				data = data[:0]
				continue
			}
			if !bytes.HasPrefix(line, []byte("data:")) {
				continue
			}
			data = append(data, bytes.TrimSpace(bytes.TrimPrefix(line, []byte("data:"))))
		}
		if len(data) > 0 {
			fn(bytes.Join(data, []byte("\n")))
		}
	}()

	return &stream{
		body: body,
		out:  pw,
	}
}

type stream struct {
	body io.ReadCloser
	out  *io.PipeWriter
}

func (s *stream) Read(p []byte) (int, error) {
	n, err := s.body.Read(p)
	if n > 0 {
		if _, werr := s.out.Write(p[:n]); werr != nil && err == nil {
			err = werr
		}
	}
	if err != nil {
		_ = s.out.Close()
	}
	return n, err
}

func (s *stream) Close() error {
	_ = s.out.Close()
	return s.body.Close()
}

// route 去掉 strategy-service 暴露的 /opencode 前缀。
func route(path string) string {
	out := strings.TrimPrefix(path, "/opencode")
	if out == "" {
		return "/"
	}
	return out
}
