package app

import (
	"context"
	"net"
	"net/http"
	"time"

	web "strategy-service/internal/http"
	"strategy-service/internal/ipc"
	"strategy-service/internal/opencode"
	"strategy-service/internal/tool"
)

type Service struct {
	cfg Config
	srv *http.Server
	op  *opencode.Manager
	ip  *ipc.Manager
}

func New(cfg Config) (*Service, error) {
	mux := http.NewServeMux()
	op := opencode.New(opencode.Config(cfg.Opencode))
	ip := ipc.New(ipc.Config{
		Enabled: cfg.IPC.Enabled,
		Product: cfg.IPC.Product,
		Version: cfg.IPC.Version,
	})
	err := ip.Start(context.Background())
	if err != nil {
		return nil, err
	}

	api := web.NewAPI(tool.NewService(), op, ip)
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
		go func() {
			_ = op.Ensure(context.Background())
		}()
	}

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
	return s.srv.Serve(ln)
}

func (s *Service) ListenAndServe() error {
	return s.srv.ListenAndServe()
}

func (s *Service) Shutdown(ctx context.Context) error {
	err := s.srv.Shutdown(ctx)
	_ = s.ip.Stop(context.Background())
	_ = s.op.Stop(context.Background())
	return err
}
