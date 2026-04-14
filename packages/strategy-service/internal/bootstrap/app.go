package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/asset"
	conf "strategy-service/internal/config"
	oc "strategy-service/internal/opencode"
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	web "strategy-service/internal/web"
)

type Service struct {
	cfg Config
	srv *http.Server
	op  *oc.Service
}

// New 根据配置创建完整的 HTTP 服务。
func New(cfg Config) (*Service, error) {
	slog.Info("initializing service", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled)

	// 同步内置的 agent 和 skill 资源。
	if err := asset.EnsureBuiltins(); err != nil {
		slog.Error("builtin opencode asset provision failed", "error", err)
		return nil, err
	}

	// 如果端口被占用，则自动探测下一个可用端口。
	if cfg.Opencode.Enabled {
		port, err := port(cfg.Opencode.Host, cfg.Opencode.Port)
		if err != nil {
			slog.Error("opencode port probe failed", "host", cfg.Opencode.Host, "port", cfg.Opencode.Port, "error", err)
			return nil, err
		}
		if port != cfg.Opencode.Port {
			slog.Info("opencode port adjusted", "host", cfg.Opencode.Host, "from", cfg.Opencode.Port, "to", port)
			cfg.Opencode.Port = port
		}
	}

	run := rt.New()
	cfg = resolveOpencode(run, cfg)
	cfg = resolveGit(run, cfg)

	mgr := oprun.New(oprun.Config(cfg.Opencode))
	op := oc.New(mgr)
	api := web.NewAPI(run, op, &conf.Store{}, smartx.New(smartx.Config{
		Platform: cfg.Platform,
		Account:  cfg.Account,
		WindowId: cfg.WindowId,
		LogDir:   cfg.LogDir,
	}))

	gin.SetMode(gin.ReleaseMode)
	mux := gin.New()
	mux.Use(web.RequestLog(), gin.Recovery())
	api.Register(mux)
	mux.Any("/opencode", web.NewOpencodeProxy(op))
	mux.Any("/opencode/*path", web.NewOpencodeProxy(op))
	mux.NoRoute(gin.WrapH(web.NewStatic(cfg.Dist)))

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	slog.Info("service initialized")
	return &Service{
		cfg: cfg,
		srv: srv,
		op:  op,
	}, nil
}

// resolveTool 按优先级解析工具，并在需要时激活内置运行时。
func resolveTool(run *rt.Service, id string, preferBuiltin bool) rt.Result {
	row, err := run.Resolve(context.Background(), id)
	if err != nil {
		return rt.Result{}
	}

	if run.Has(id) && (preferBuiltin || !row.Found) {
		out, err := run.Ensure(context.Background(), id)
		if err == nil && out.Found {
			return out
		}
	}
	return row
}

// resolveOpencode 优先激活内置 opencode。
func resolveOpencode(run *rt.Service, cfg Config) Config {
	row := resolveTool(run, "opencode", true)
	if row.Found {
		cfg.Opencode.Bin = row.Path
	}
	return cfg
}

// resolveGit 优先激活内置 Git，并将路径注入到 opencode 环境。
func resolveGit(run *rt.Service, cfg Config) Config {
	row := resolveTool(run, "git", true)
	if !row.Found {
		return cfg
	}

	cfg.Opencode.GitBin = row.Path
	slog.Info("opencode git resolved", "bin", row.Path)
	return cfg
}

// Addr 返回服务监听地址。
func (s *Service) Addr() string {
	return s.cfg.Addr()
}

// Serve 使用现成监听器启动服务。
func (s *Service) Serve(ln net.Listener) error {
	slog.Info("serving on listener", "addr", ln.Addr().String())
	go s.activate(ln.Addr().String())
	return s.srv.Serve(ln)
}

// ListenAndServe 创建 TCP 监听器并启动服务。
func (s *Service) ListenAndServe() error {
	slog.Info("listen and serve", "addr", s.cfg.Addr())
	ln, err := net.Listen("tcp", s.cfg.Addr())
	if err != nil {
		return err
	}
	return s.Serve(ln)
}

// Shutdown 优雅关闭 HTTP 服务和托管的 opencode 进程。
func (s *Service) Shutdown(ctx context.Context) error {
	slog.Info("shutting down service")
	err := s.srv.Shutdown(ctx)
	if err != nil {
		slog.Error("http server shutdown error", "error", err)
	}
	_, _ = s.op.Stop(context.Background())
	slog.Info("service shutdown complete")
	return err
}

// activate 在服务可用后补齐 MCP 配置，并按策略自动拉起 opencode。
func (s *Service) activate(addr string) {
	url := addr
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "http://" + addr
	}
	if err := asset.EnsureMCP(url); err != nil {
		slog.Error("failed to inject strategy-service mcp config", "url", url, "error", err)
	}
	if !s.op.Enabled() {
		return
	}

	slog.Info("auto-starting opencode process")
	if err := s.op.Ensure(context.Background()); err != nil {
		slog.Error("opencode auto-start failed", "error", err)
	}
}

// port 从起始端口开始寻找当前主机上的空闲端口。
func port(host string, start int) (int, error) {
	if start <= 0 {
		return 0, fmt.Errorf("invalid port: %d", start)
	}

	for next := start; next <= 65535; next++ {
		ln, err := net.Listen("tcp", net.JoinHostPort(host, strconv.Itoa(next)))
		if err == nil {
			_ = ln.Close()
			return next, nil
		}
	}

	return 0, fmt.Errorf("no free port for host %s starting at %d", host, start)
}
