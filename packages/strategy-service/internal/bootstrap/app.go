package bootstrap

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"time"

	"strategy-service/internal/asset"
	conf "strategy-service/internal/config"
	"strategy-service/internal/ipc"
	"strategy-service/internal/oprun"
	"strategy-service/internal/smartx"
	"strategy-service/internal/tool"
	web "strategy-service/internal/web"
)

type Service struct {
	cfg Config
	srv *http.Server
	op  *oprun.Manager
	ip  *ipc.Manager
}

func New(cfg Config) (*Service, error) {
	slog.Info("initializing service", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled, "ipc_enabled", cfg.IPC.Enabled)

	// 将asset下 workspace 下 agents和skills copy到~.config/opencode/ 下
	err := asset.EnsureBuiltins()
	if err != nil {
		slog.Error("builtin opencode asset provision failed", "error", err)
		return nil, err
	}

	// 创建http 请求多路复用器
	mux := http.NewServeMux()
	op := oprun.New(oprun.Config(cfg.Opencode))
	ip := ipc.New(ipc.Config{
		Enabled: cfg.IPC.Enabled,
		Product: cfg.IPC.Product,
		Version: cfg.IPC.Version,
	})
	err = ip.Start(context.Background())
	if err != nil {
		slog.Error("ipc start failed", "error", err)
		return nil, err
	}
	slog.Info("ipc manager started")

	api := web.NewAPI(tool.NewService(), op, ip, &conf.Store{}, smartx.New(smartx.Config{
		Platform: cfg.Platform,
		Account:  cfg.Account,
		WindowId: cfg.WindowId,
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
	if op.Enabled() && op.Startup() == "auto" {
		slog.Info("auto-starting opencode process")
		go func() {
			if err := op.Ensure(context.Background()); err != nil {
				slog.Error("opencode auto-start failed", "error", err)
			}
		}()
	}

	slog.Info("service initialized")
	return &Service{
		cfg: cfg,
		srv: srv,
		op:  op,
		ip:  ip,
	}, nil
}

func (s *Service) Addr() string {
	return s.cfg.Addr()
}

func (s *Service) Serve(ln net.Listener) error {
	slog.Info("serving on listener", "addr", ln.Addr().String())
	return s.srv.Serve(ln)
}

func (s *Service) ListenAndServe() error {
	slog.Info("listen and serve", "addr", s.cfg.Addr())
	return s.srv.ListenAndServe()
}

func (s *Service) Shutdown(ctx context.Context) error {
	slog.Info("shutting down service")
	err := s.srv.Shutdown(ctx)
	if err != nil {
		slog.Error("http server shutdown error", "error", err)
	}
	_ = s.ip.Stop(context.Background())
	_ = s.op.Stop(context.Background())
	slog.Info("service shutdown complete")
	return err
}
