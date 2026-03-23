package logger

import (
	"io"
	"log/slog"
	"os"
	"strings"

	"strategy-service/internal/system"

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
	path, err := system.ServicePath()
	if err != nil {
		return err
	}

	writer = &lumberjack.Logger{
		Filename:  path,
		MaxSize:   50, // MB
		MaxAge:    30, // days
		Compress:  true,
		LocalTime: true,
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
