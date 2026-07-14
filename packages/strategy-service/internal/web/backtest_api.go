package web

import (
	"errors"
	"net/http"
	"strings"

	"strategy-service/internal/backtest"
	"strategy-service/internal/db"

	"github.com/gin-gonic/gin"
)

func (a *API) backtestConfigGet(c *gin.Context) {
	cfg, err := a.back.Config(c.Request.Context())
	if err != nil {
		backFail(c, http.StatusInternalServerError, "failed to load backtest config", nil)
		return
	}
	ok(c, cfg)
}

func (a *API) backtestConfigPut(c *gin.Context) {
	body := backtest.Config{}
	if err := c.ShouldBindJSON(&body); err != nil {
		backFail(c, http.StatusBadRequest, "invalid request body", nil)
		return
	}
	cfg, err := a.back.Save(c.Request.Context(), body)
	if err != nil {
		backFail(c, http.StatusInternalServerError, "failed to save backtest config", nil)
		return
	}
	ok(c, cfg)
}

func (a *API) backtestRun(c *gin.Context) {
	body := backtest.RunReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		backFail(c, http.StatusBadRequest, "invalid request body", nil)
		return
	}
	row, err := a.back.Run(c.Request.Context(), body)
	if err != nil {
		backRunError(c, err, body)
		return
	}
	ok(c, row)
}

func backRunError(c *gin.Context, err error, req backtest.RunReq) {
	var conflict *backtest.Conflict
	if errors.As(err, &conflict) &&
		(conflict.Run.WorkspacePath != strings.TrimSpace(req.WorkspacePath) ||
			conflict.Run.SessionID != strings.TrimSpace(req.SessionID)) {
		backFail(c, http.StatusConflict, conflict.Error(), nil)
		return
	}
	backError(c, err)
}

func (a *API) backtestRuns(c *gin.Context) {
	req := backtest.ListReq{}
	if err := c.ShouldBindQuery(&req); err != nil {
		backFail(c, http.StatusBadRequest, "invalid query", nil)
		return
	}
	list, err := a.back.List(c.Request.Context(), req)
	if err != nil {
		backError(c, err)
		return
	}
	ok(c, list)
}

func (a *API) backtestRunGet(c *gin.Context) {
	workspace := c.Query("workspacePath")
	session := c.Query("sessionId")
	if (workspace == "") != (session == "") {
		backFail(c, http.StatusBadRequest, "workspacePath and sessionId are required together", nil)
		return
	}
	var row backtest.Run
	var err error
	if workspace != "" {
		row, err = a.back.GetScoped(c.Request.Context(), backtest.ScopedReq{
			ID:            c.Param("id"),
			WorkspacePath: workspace,
			SessionID:     session,
		})
	} else {
		row, err = a.back.Get(c.Request.Context(), backtest.IDReq{ID: c.Param("id")})
	}
	if errors.Is(err, db.ErrNotFound) {
		backFail(c, http.StatusNotFound, "backtest run not found", nil)
		return
	}
	if err != nil {
		backError(c, err)
		return
	}
	ok(c, row)
}

func (a *API) backtestRunRefresh(c *gin.Context) {
	row, err := a.back.Refresh(c.Request.Context(), backtest.IDReq{ID: c.Param("id")})
	if errors.Is(err, db.ErrNotFound) {
		backFail(c, http.StatusNotFound, "backtest run not found", nil)
		return
	}
	if err != nil {
		backError(c, err)
		return
	}
	ok(c, row)
}

func backError(c *gin.Context, err error) {
	var input *backtest.Invalid
	if errors.As(err, &input) {
		backFail(c, http.StatusBadRequest, input.Error(), nil)
		return
	}
	var conflict *backtest.Conflict
	if errors.As(err, &conflict) {
		backFail(c, http.StatusConflict, conflict.Error(), conflict.Run)
		return
	}
	if errors.Is(err, db.ErrNotFound) {
		backFail(c, http.StatusNotFound, "backtest resource not found", nil)
		return
	}
	backFail(c, http.StatusInternalServerError, "backtest request failed", nil)
}
