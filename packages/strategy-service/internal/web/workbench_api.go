package web

import (
	"strategy-service/internal/workbench"

	"github.com/gin-gonic/gin"
)

func (a *API) workbenchIdentify(c *gin.Context) {
	body := workbench.IdentifyReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.Identify(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}
