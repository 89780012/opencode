package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"strategy-service/internal/bootstrap"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type shell struct {
	ctx  context.Context
	mu   sync.Mutex
	srv  *bootstrap.Service
	ln   net.Listener
	url  string
	err  string
	dom  bool
	done bool
}

func newshell() *shell {
	return &shell{}
}

func (s *shell) startup(ctx context.Context) {
	s.ctx = ctx
	go s.boot()
}

func (s *shell) ready(context.Context) {
	s.mu.Lock()
	s.dom = true
	s.mu.Unlock()
	s.flush()
}

func (s *shell) shutdown(context.Context) {
	s.stop()
}

func (s *shell) boot() {
	cfg := bootstrap.LoadConfig()
	cfg.Host = "127.0.0.1"
	cfg.Port = "0"

	srv, err := bootstrap.New(cfg)
	if err != nil {
		s.fail(err)
		return
	}

	ln, err := net.Listen("tcp", srv.Addr())
	if err != nil {
		_ = srv.Shutdown(context.Background())
		s.fail(err)
		return
	}

	s.mu.Lock()
	s.srv = srv
	s.ln = ln
	s.url = "http://127.0.0.1:" + strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)
	url := s.url
	s.mu.Unlock()

	go func() {
		err := srv.Serve(ln)
		if err == nil || errors.Is(err, http.ErrServerClosed) {
			return
		}
		s.fail(err)
	}()

	if err := wait(url + "/api/health"); err != nil {
		s.fail(err)
		return
	}

	s.flush()
}

func (s *shell) flush() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.dom || s.done || s.ctx == nil {
		return
	}

	if s.err != "" {
		s.done = true
		runtime.LogError(s.ctx, s.err)
		runtime.WindowExecJS(s.ctx, "window.bootError("+strconv.Quote(s.err)+")")
		return
	}

	if s.url == "" {
		return
	}

	s.done = true
	runtime.WindowExecJS(s.ctx, "window.location.replace("+strconv.Quote(s.url)+")")
}

func (s *shell) fail(err error) {
	if err == nil {
		return
	}

	s.stop()

	s.mu.Lock()
	if s.err == "" {
		s.err = err.Error()
	}
	s.mu.Unlock()

	s.flush()
}

func (s *shell) stop() {
	s.mu.Lock()
	srv := s.srv
	ln := s.ln
	s.srv = nil
	s.ln = nil
	s.mu.Unlock()

	if srv != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = srv.Shutdown(ctx)
		cancel()
	}

	if ln != nil {
		_ = ln.Close()
	}
}

func wait(url string) error {
	client := &http.Client{
		Timeout:   time.Second,
		Transport: &http.Transport{Proxy: nil},
	}

	deadline := time.Now().Add(30 * time.Second)
	for {
		res, err := client.Get(url)
		if err == nil {
			_ = res.Body.Close()
			if res.StatusCode >= 200 && res.StatusCode < 300 {
				return nil
			}
		}

		if time.Now().After(deadline) {
			if err != nil {
				return err
			}
			return errors.New("strategy-service did not become ready")
		}

		time.Sleep(200 * time.Millisecond)
	}
}
