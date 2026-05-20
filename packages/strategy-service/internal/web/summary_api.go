package web

import (
	"fmt"

	"strategy-service/internal/summary"

	"github.com/gin-gonic/gin"
)

func (a *API) summaryGet(c *gin.Context) {
	ws, id, valid := summaryQuery(c)
	if !valid {
		return
	}
	entry, err := a.summary.Get(ws, id)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, entry)
}

func (a *API) summaryRun(c *gin.Context) {
	var req summary.Request
	if err := c.ShouldBindJSON(&req); err != nil {
		bad(c, err)
		return
	}
	entry, err := a.summary.Run(c.Request.Context(), req)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, entry)
}

func (a *API) summaryStop(c *gin.Context) {
	ws, id, valid := summaryQuery(c)
	if !valid {
		return
	}
	entry, err := a.summary.Stop(c.Request.Context(), ws, id)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, entry)
}

func summaryQuery(c *gin.Context) (string, string, bool) {
	ws := c.Query("workspacePath")
	if ws == "" {
		ws = c.Query("workspace_path")
	}
	if ws == "" {
		bad(c, fmt.Errorf("workspacePath is required"))
		return "", "", false
	}
	id := c.Query("sessionId")
	if id == "" {
		id = c.Query("session_id")
	}
	if id == "" {
		bad(c, fmt.Errorf("sessionId is required"))
		return "", "", false
	}
	return ws, id, true
}
