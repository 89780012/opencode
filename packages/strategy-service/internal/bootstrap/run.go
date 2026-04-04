package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"strategy-service/internal/logger"
)

// Run starts the strategy-service CLI process and returns an exit code.
func Run() int {
	//日志初始化
	if err := logger.Init(); err != nil {
		slog.Error("failed to init logger", "error", err)
	}
	defer logger.Shutdown()

	// 加载配置文件
	cfg := LoadConfig()
	slog.Info("config loaded", "addr", cfg.Addr(), "opencode_enabled", cfg.Opencode.Enabled)

	// 创建服务
	srv, err := New(cfg)
	if err != nil {
		slog.Error("failed to create service", "error", err)
		return 1
	}

	slog.Info("strategy-service starting", "addr", cfg.Addr())

	stop := make(chan os.Signal, 1) // 创建一个容量为 1 的 os.Signal 类型的通道（channel），命名为 stop。
	// 调用 signal.Notify 函数，将 os.Interrupt 信号（通常是用户按下 Ctrl+C 或终端发送的 SIGINT）重定向到 stop 通道。
	// 此后，当用户中断程序时，该信号会被发送到 stop 通道，而不是直接终止进程。
	signal.Notify(stop, os.Interrupt) 
	defer signal.Stop(stop) //显式注销信号监听器

	quit := make(chan struct{})  //退出
	done := make(chan struct{})  //结束
	go func() {
		<-stop
		close(quit)
		slog.Info("received interrupt, shutting down")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
		close(done)
	}()

	// 启动服务并监听
	err = srv.ListenAndServe()
	if err == nil || err == http.ErrServerClosed {
		select {
		case <-quit:
			<-done
		default:
		}
		slog.Info("strategy-service stopped")
		return 0
	}

	slog.Error("strategy-service exited with error", "error", err)
	return 1
}
