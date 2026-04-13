package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"

	"strategy-service/internal/logs"

	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	writer *lumberjack.Logger
	L      *slog.Logger
)

// Init 初始化全局日志器，并把日志写入 strategy-service 的统一日志目录。
func Init() error {
	path, err := logs.ServicePath()
	if err != nil {
		return err
	}

	writer = &lumberjack.Logger{
		Filename:  path, // 日志文件路径。
		MaxSize:   50,   // 单个日志文件最大 50MB。
		MaxAge:    30,   // 最多保留 30 天历史日志。
		Compress:  true, // 轮转后的日志自动压缩。
		LocalTime: true, // 轮转时间使用本地时区。
	}
	level := parseLevel(os.Getenv("STRATEGY_LOG_LEVEL"))

	multi := io.MultiWriter(os.Stdout, writer)
	L = slog.New(slog.NewJSONHandler(multi, &slog.HandlerOptions{
		Level: level,
	}))
	slog.SetDefault(L)
	return nil
}

// Shutdown 关闭日志文件写入器。
func Shutdown() {
	if writer != nil {
		_ = writer.Close()
	}
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
