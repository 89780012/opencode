package web

import (
	"fmt"

	"strategy-service/internal/question"

	"github.com/gin-gonic/gin"
)

func (a *API) questionList(c *gin.Context) {
	wsPath := c.Query("workspace_path")
	if wsPath == "" {
		bad(c, fmt.Errorf("workspace_path is required"))
		return
	}
	entries, err := a.question.ListByWorkspace(wsPath)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, entries)
}

func (a *API) questionAppend(c *gin.Context) {
	var entry question.Entry
	if err := c.ShouldBindJSON(&entry); err != nil {
		bad(c, err)
		return
	}
	result, err := a.question.Append(entry)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, result)
}
