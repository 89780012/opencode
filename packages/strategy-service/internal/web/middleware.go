package web

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func RequestLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		slog.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency", time.Since(start),
			"client", c.ClientIP(),
		)
	}
}
