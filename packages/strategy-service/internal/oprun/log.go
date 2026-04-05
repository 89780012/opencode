package oprun

import (
	"bytes"
	"log/slog"
	"os"
	"strings"
	"sync"

	"strategy-service/internal/logs"
)

func newLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&writer{}, &slog.HandlerOptions{
		Level: level(os.Getenv("STRATEGY_LOG_LEVEL")),
	}))
}

type writer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (w *writer) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	n, err := w.buf.Write(p)
	if err != nil {
		return n, err
	}

	for {
		raw, err := w.buf.ReadString('\n')
		if err != nil {
			if len(raw) > 0 {
				_, _ = w.buf.WriteString(raw)
			}
			return n, nil
		}

		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}
		if err := logs.Append(logs.OpencodeKind, line); err != nil {
			return n, err
		}
	}
}

func level(s string) slog.Level {
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
