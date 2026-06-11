package web

import (
	"errors"

	"strategy-service/internal/db"
	"strategy-service/internal/utils"
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

func (a *API) workbenchAnalysisGet(c *gin.Context) {
	req := workbench.AnalysisGet{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.GetAnalysis(c.Request.Context(), req)
	if errors.Is(err, db.ErrNotFound) {
		ok(c, nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchAnalysisPut(c *gin.Context) {
	body := workbench.AnalysisReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.SaveAnalysis(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	a.event.emitBroadcast("analysis.updated", utils.Pack(data))
	ok(c, data)
}

func (a *API) workbenchFlowchartGet(c *gin.Context) {
	req := workbench.FlowchartGet{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.GetFlowchart(c.Request.Context(), req)
	if errors.Is(err, db.ErrNotFound) {
		ok(c, nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchFlowchartPut(c *gin.Context) {
	body := workbench.FlowchartReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.SaveFlowchart(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	a.event.emitBroadcast("flowchart.updated", utils.Pack(data))
	ok(c, data)
}

func (a *API) workbenchReviewGet(c *gin.Context) {
	req := workbench.ReviewGet{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.GetReview(c.Request.Context(), req)
	if errors.Is(err, db.ErrNotFound) {
		ok(c, nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchReviewPut(c *gin.Context) {
	body := workbench.ReviewReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.SaveReview(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	a.event.emitBroadcast("review.updated", utils.Pack(data))
	ok(c, data)
}
