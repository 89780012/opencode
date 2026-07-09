package web

import (
	"errors"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"

	"github.com/gin-gonic/gin"
)

func (a *API) backtestConfigGet(c *gin.Context) {
	cfg, err := a.back.Config(c.Request.Context())
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) backtestConfigPut(c *gin.Context) {
	body := backtest.Config{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	cfg, err := a.back.Save(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) backtestRun(c *gin.Context) {
	body := backtest.RunReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	row, err := a.back.Run(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, row)
}

func (a *API) backtestRuns(c *gin.Context) {
	req := backtest.ListReq{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}
	list, err := a.back.List(c.Request.Context(), req)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, list)
}

func (a *API) backtestRunGet(c *gin.Context) {
	row, err := a.back.Get(c.Request.Context(), backtest.IDReq{ID: c.Param("id")})
	if errors.Is(err, db.ErrNotFound) {
		fail(c, 404, "backtest run not found", nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, row)
}

func (a *API) backtestRunRefresh(c *gin.Context) {
	row, err := a.back.Refresh(c.Request.Context(), backtest.IDReq{ID: c.Param("id")})
	if errors.Is(err, db.ErrNotFound) {
		fail(c, 404, "backtest run not found", nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, row)
}
