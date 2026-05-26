package web

import (
	"fmt"

	"strategy-service/internal/modelchain"

	"github.com/gin-gonic/gin"
)

func (a *API) modelChainGet(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	cfg, err := a.chain.Get()
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, cfg)
}

func (a *API) modelChainPut(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	var cfg modelchain.Config
	if err := c.ShouldBindJSON(&cfg); err != nil {
		bad(c, err)
		return
	}
	out, err := a.chain.Save(cfg)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, out)
}

func (a *API) modelChainPrompt(c *gin.Context) {
	if a == nil || a.chain == nil {
		bad(c, fmt.Errorf("model chain service is nil"))
		return
	}
	var req modelchain.Prompt
	req.Agent = "smartx-helper"

	if err := c.ShouldBindJSON(&req); err != nil {
		bad(c, err)
		return
	}
	if err := a.chain.Prompt(c.Request.Context(), req); err != nil {
		bad(c, err)
		return
	}
	ok(c, true)
}
