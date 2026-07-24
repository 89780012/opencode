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

func (a *API) workbenchRequirementsPut(c *gin.Context) {
	body := workbench.RequirementsSave{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.SaveRequirements(c.Request.Context(), body)
	if errors.Is(err, db.ErrNotFound) {
		fail(c, 404, "session not found", nil)
		return
	}
	if errors.Is(err, workbench.ErrInput) {
		bad(c, err)
		return
	}
	if err != nil {
		fail(c, 500, "failed to save requirements", nil)
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
	if data.State == "running" {
		a.event.emitBroadcast("analysis.updated", utils.Pack(data))
	}
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

func (a *API) workbenchProgressGet(c *gin.Context) {
	req := workbench.ProgressList{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}
	data, err := a.bench.ListProgress(c.Request.Context(), req)
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workbenchWorkflowGet(c *gin.Context) {
	req := workbench.WorkflowGet{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}
	data, err := a.bench.GetWorkflow(c.Request.Context(), req)
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

func (a *API) workbenchWorkflowPost(c *gin.Context) {
	body := workbench.WorkflowStart{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	data, err := a.bench.StartWorkflow(c.Request.Context(), body)
	if errors.Is(err, db.ErrNotFound) {
		fail(c, 404, "session not found", nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workbenchWorkflowPut(c *gin.Context) {
	body := workbench.WorkflowUpdate{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	data, err := a.bench.UpdateWorkflow(c.Request.Context(), body)
	if errors.Is(err, db.ErrNotFound) {
		fail(c, 404, "workflow not found", nil)
		return
	}
	if err != nil {
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workbenchWorkflowCancel(c *gin.Context) {
	body := workbench.WorkflowGet{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}
	data, err := a.bench.CancelWorkflow(c.Request.Context(), body)
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

func (a *API) workbenchProjectStateGet(c *gin.Context) {
	req := workbench.ProjectStateGet{}
	if err := c.ShouldBindQuery(&req); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.GetProjectState(c.Request.Context(), req)
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

func (a *API) workbenchProgressPost(c *gin.Context) {
	body := workbench.ProgressAppend{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.AppendProgress(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchProjectStateInit(c *gin.Context) {
	body := workbench.ProjectStateInitReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.InitProjectState(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchProjectStateResume(c *gin.Context) {
	body := workbench.ProjectStateGet{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.ResumeProjectState(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchProjectStateSave(c *gin.Context) {
	body := workbench.ProjectStateSaveReq{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.SaveProjectState(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}

func (a *API) workbenchProjectStateValidate(c *gin.Context) {
	body := workbench.ProjectStateGet{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.bench.ValidateProjectState(c.Request.Context(), body)
	if err != nil {
		bad(c, err)
		return
	}

	ok(c, data)
}
