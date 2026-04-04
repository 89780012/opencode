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

// Init initializes the global logger.
// Logs are written to ~/.strategy-service/logs/strategy-service.log
// with rotation (50MB), compression, and 30-day retention.
func Init() error {
	path, err := logs.ServicePath()
	if err != nil {
		return err
	}

	writer = &lumberjack.Logger{
    Filename:  path,    // 日志文件路径
    MaxSize:   50,      // 单个日志文件最大50MB
    MaxAge:    30,      // 日志文件最多保留30天
    Compress:  true,    // 超过大小或时间的日志文件会自动压缩
    LocalTime: true,    // 使用本地时间而非UTC时间进行日志轮转
}
	level := parseLevel(os.Getenv("STRATEGY_LOG_LEVEL"))

	multi := io.MultiWriter(os.Stdout, writer)
	L = slog.New(slog.NewJSONHandler(multi, &slog.HandlerOptions{
		Level: level,
	}))
	slog.SetDefault(L)
	return nil
}

// Shutdown closes the log file writer.
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
