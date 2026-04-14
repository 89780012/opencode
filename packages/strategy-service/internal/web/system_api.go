package web

import (
	"errors"
	"io"
	"log/slog"
	"strconv"
	"strings"
	"time"

	cfg "strategy-service/internal/config"
	"strategy-service/internal/smartx"

	"github.com/gin-gonic/gin"
)

func (a *API) configGet(c *gin.Context) {
	cfg, err := a.cfg.LoadUserConfig()
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) configPut(c *gin.Context) {
	body := cfg.Config{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	cfg, err := a.cfg.Save(body)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) logSources(c *gin.Context) {
	limit, err := queryInt(c, "limit", 10)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}

	out, err := a.log.Sources(c.Request.Context(), limit)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, map[string]any{"sources": out})
}

func (a *API) logTail(c *gin.Context) {
	size, err := queryInt(c, "tail", 200)
	if err != nil {
		fail(c, 400, "invalid tail", nil)
		return
	}

	out, err := a.log.Tail(c.Request.Context(), c.Query("source"), size)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxStart(c *gin.Context) {
	body := smartx.Input{}
	if c.Request.ContentLength != 0 {
		err := c.ShouldBindJSON(&body)
		if err != nil && !errors.Is(err, io.EOF) {
			bad(c, err)
			return
		}
	}

	out, err := a.sx.Start(c.Request.Context(), body)
	if err != nil {
		slog.Warn("smartx startExtension failed", "error", err)
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxLogsMeta(c *gin.Context) {
	limit, err := queryInt(c, "limit", 3)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}

	out, err := a.sx.Meta(c.Query("name"), limit)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

func (a *API) smartxLogsWatch(c *gin.Context) {
	tail, err := queryInt(c, "tail", 200)
	if err != nil {
		fail(c, 400, "invalid tail", nil)
		return
	}
	limit, err := queryInt(c, "limit", 3)
	if err != nil {
		fail(c, 400, "invalid limit", nil)
		return
	}
	sec, err := queryInt(c, "seconds", 10)
	if err != nil {
		fail(c, 400, "invalid seconds", nil)
		return
	}

	out, err := a.sx.Watch(c.Request.Context(), c.Query("name"), tail, limit, time.Duration(sec)*time.Second)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, out)
}

func queryInt(c *gin.Context, key string, fallback int) (int, error) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback, nil
	}
	return strconv.Atoi(raw)
}
