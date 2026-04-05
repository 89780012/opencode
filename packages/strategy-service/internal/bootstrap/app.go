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
	"strategy-service/internal/oprun"
	rt "strategy-service/internal/runtime"
	"strategy-service/internal/smartx"
	web "strategy-service/internal/web"
)

type Service struct {
	cfg Config         //配置文件
	srv *http.Server   //http服务
	op  *oprun.Manager //opencode运行管理
}

func New(cfg Config) (*Service, error) {
	slog.Info("initializing service", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled)

	// 将asset资源同步到客户本地，主要是agent 和 skill
	if err := asset.EnsureBuiltins(); err != nil {
		slog.Error("builtin opencode asset provision failed", "error", err)
		return nil, err
	}

	// 确保opencode资源
	if cfg.Opencode.Enabled {
		// 找到可用端口
		port, err := port(cfg.Opencode.Host, cfg.Opencode.Port)
		if err != nil {
			slog.Error("opencode port probe failed", "host", cfg.Opencode.Host, "port", cfg.Opencode.Port, "error", err)
			return nil, err
		}
		// 和可用端口不一致, 则重置配置
		if port != cfg.Opencode.Port {
			slog.Info("opencode port adjusted", "host", cfg.Opencode.Host, "from", cfg.Opencode.Port, "to", port)
			cfg.Opencode.Port = port
		}
	}

	run := rt.New(rt.Config{
		Over: map[string]string{
			"opencode": cfg.Opencode.Bin, //opencode运行二进制文件
		},
	})
	cfg = resolveOpencode(run, cfg)
	cfg = resolveGit(run, cfg)

	op := oprun.New(oprun.Config(cfg.Opencode))
	//注册api 端点
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

func resolveOpencode(run *rt.Service, cfg Config) Config {
	row, err := run.Resolve(context.Background(), "opencode")
	if err != nil {
		return cfg
	}

	// 配置则直接返回配置
	if row.Found && row.Source == rt.SourceConfig {
		cfg.Opencode.Bin = row.Path
		return cfg
	}

	if run.Has("opencode") {
		out, err := run.Ensure(context.Background(), "opencode")
		if err == nil && out.Found {
			cfg.Opencode.Bin = out.Path
		}
		return cfg
	}

	if row.Found {
		cfg.Opencode.Bin = row.Path
	}
	return cfg
}

func resolveGit(run *rt.Service, cfg Config) Config {
	row, err := run.Resolve(context.Background(), "git")
	if err != nil {
		return cfg
	}

	if !row.Found && run.Has("git") {
		out, err := run.Ensure(context.Background(), "git")
		if err == nil && out.Found {
			row = out
		}
	}

	if !row.Found {
		return cfg
	}

	cfg.Opencode.GitBin = row.Path
	cfg.Opencode.GitSource = string(row.Source)
	slog.Info("opencode git resolved", "bin", row.Path, "source", row.Source)
	return cfg
}

func (s *Service) Addr() string {
	return s.cfg.Addr()
}

func (s *Service) Serve(ln net.Listener) error {
	slog.Info("serving on listener", "addr", ln.Addr().String())
	go s.activate(ln.Addr().String())
	return s.srv.Serve(ln)
}

func (s *Service) ListenAndServe() error {
	slog.Info("listen and serve", "addr", s.cfg.Addr())
	ln, err := net.Listen("tcp", s.cfg.Addr())
	if err != nil {
		return err
	}
	return s.Serve(ln)
}

func (s *Service) Shutdown(ctx context.Context) error {
	slog.Info("shutting down service")
	err := s.srv.Shutdown(ctx)
	if err != nil {
		slog.Error("http server shutdown error", "error", err)
	}
	_ = s.op.Stop(context.Background())
	slog.Info("service shutdown complete")
	return err
}

func (s *Service) activate(addr string) {
	url := addr
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "http://" + addr
	}
	// 开启mcp服务
	if err := asset.EnsureMCP(url); err != nil {
		slog.Error("failed to inject strategy-service mcp config", "url", url, "error", err)
	}
	if !s.op.Enabled() || s.op.Startup() != "auto" {
		return
	}

	slog.Info("auto-starting opencode process")
	// 自动开启opencode服务
	if err := s.op.Ensure(context.Background()); err != nil {
		slog.Error("opencode auto-start failed", "error", err)
	}
}

// 找到可用端口
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
