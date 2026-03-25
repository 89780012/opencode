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

	"strategy-service/internal/asset"
	conf "strategy-service/internal/config"
	"strategy-service/internal/oprun"
	"strategy-service/internal/smartx"
	"strategy-service/internal/tool"
	web "strategy-service/internal/web"
)

type Service struct {
	cfg Config
	srv *http.Server
	op  *oprun.Manager
}

func New(cfg Config) (*Service, error) {
	slog.Info("initializing service", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled)

	if err := asset.EnsureBuiltins(); err != nil {
		slog.Error("builtin opencode asset provision failed", "error", err)
		return nil, err
	}

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

	mux := http.NewServeMux()
	op := oprun.New(oprun.Config(cfg.Opencode))
	api := web.NewAPI(tool.NewService(), op, &conf.Store{}, smartx.New(smartx.Config{
		Platform: cfg.Platform,
		Account:  cfg.Account,
		WindowId: cfg.WindowId,
		LogDir:   cfg.LogDir,
	}))
	api.Register(mux)
	mux.Handle("/opencode/", web.NewOpencodeProxy(op))
	mux.Handle("/opencode", web.NewOpencodeProxy(op))
	mux.Handle("/", web.NewStatic(cfg.Dist))

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
	if err := asset.EnsureMCP(url); err != nil {
		slog.Error("failed to inject strategy-service mcp config", "url", url, "error", err)
	}
	if !s.op.Enabled() || s.op.Startup() != "auto" {
		return
	}

	slog.Info("auto-starting opencode process")
	if err := s.op.Ensure(context.Background()); err != nil {
		slog.Error("opencode auto-start failed", "error", err)
	}
}

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
