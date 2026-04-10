package web

import (
	"encoding/json"
	"log/slog"

	"github.com/gin-gonic/gin"
	"strategy-service/internal/workflow"
)

func (a *API) workflowList(c *gin.Context) {
	data, err := a.wf.List()
	if err != nil {
		slog.Error("workflow list failed", "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowGet(c *gin.Context) {
	data, err := a.wf.Get(c.Param("id"))
	if err != nil {
		slog.Error("workflow get failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowSummary(c *gin.Context) {
	data, err := a.wf.Summary(c.Param("id"))
	if err != nil {
		slog.Error("workflow summary failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowSave(c *gin.Context) {
	body := struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		RootNodeID string `json:"root_node_id"`
		Nodes      []struct {
			ID              string   `json:"id"`
			Kind            string   `json:"kind"`
			Title           string   `json:"title"`
			Agent           string   `json:"agent"`
			ToolID          string   `json:"tool_id"`
			X               float64  `json:"x"`
			Y               float64  `json:"y"`
			Skills          []string `json:"skills"`
			Prompt          string   `json:"prompt"`
			TimeoutMS       int64    `json:"timeout_ms"`
			RetryLimit      int      `json:"retry_limit"`
			ModelProviderID string   `json:"model_provider_id"`
			ModelID         string   `json:"model_id"`
			Variant         string   `json:"variant"`
		} `json:"nodes"`
		Edges []struct {
			ID    string `json:"id"`
			From  string `json:"from"`
			To    string `json:"to"`
			Cond  string `json:"cond"`
			Label string `json:"label"`
		} `json:"edges"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	item := convertFlow(body)
	data, err := a.wf.Save(item)
	if err != nil {
		slog.Error("workflow save failed", "id", item.ID, "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowDelete(c *gin.Context) {
	id := c.Param("id")
	if err := a.wf.Delete(id); err != nil {
		slog.Error("workflow delete failed", "id", id, "error", err)
		bad(c, err)
		return
	}
	ok(c, nil)
}

func (a *API) workflowRuns(c *gin.Context) {
	data, err := a.wf.Runs(c.Query("workflow_id"))
	if err != nil {
		slog.Error("workflow run list failed", "workflow_id", c.Query("workflow_id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowRunGet(c *gin.Context) {
	data, err := a.wf.Run(c.Param("id"))
	if err != nil {
		slog.Error("workflow run get failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowRunNodes(c *gin.Context) {
	data, err := a.wf.NodeRuns(c.Param("id"))
	if err != nil {
		slog.Error("workflow node run list failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowRunSteps(c *gin.Context) {
	data, err := a.wf.Steps(c.Param("id"))
	if err != nil {
		slog.Error("workflow step list failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowRunWaits(c *gin.Context) {
	data, err := a.wf.Waits(c.Param("id"))
	if err != nil {
		slog.Error("workflow wait list failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowRunReply(c *gin.Context) {
	body := struct {
		WaitID         string          `json:"wait_id"`
		Payload        json.RawMessage `json:"payload"`
		IdempotencyKey string          `json:"idempotency_key"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.wf.Reply(c.Param("id"), body.WaitID, body.Payload, body.IdempotencyKey)
	if err != nil {
		slog.Error("workflow reply failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func (a *API) workflowStart(c *gin.Context) {
	body := struct {
		WorkspacePath string `json:"workspace_path"`
		Input         string `json:"input"`
	}{}
	if err := c.ShouldBindJSON(&body); err != nil {
		bad(c, err)
		return
	}

	data, err := a.wf.Start(c.Param("id"), body.WorkspacePath, body.Input)
	if err != nil {
		slog.Error("workflow start failed", "id", c.Param("id"), "error", err)
		bad(c, err)
		return
	}
	ok(c, data)
}

func convertFlow(body struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	RootNodeID string `json:"root_node_id"`
	Nodes      []struct {
		ID              string   `json:"id"`
		Kind            string   `json:"kind"`
		Title           string   `json:"title"`
		Agent           string   `json:"agent"`
		ToolID          string   `json:"tool_id"`
		X               float64  `json:"x"`
		Y               float64  `json:"y"`
		Skills          []string `json:"skills"`
		Prompt          string   `json:"prompt"`
		TimeoutMS       int64    `json:"timeout_ms"`
		RetryLimit      int      `json:"retry_limit"`
		ModelProviderID string   `json:"model_provider_id"`
		ModelID         string   `json:"model_id"`
		Variant         string   `json:"variant"`
	} `json:"nodes"`
	Edges []struct {
		ID    string `json:"id"`
		From  string `json:"from"`
		To    string `json:"to"`
		Cond  string `json:"cond"`
		Label string `json:"label"`
	} `json:"edges"`
}) workflow.Workflow {
	nodes := make([]workflow.Node, 0, len(body.Nodes))
	for _, item := range body.Nodes {
		nodes = append(nodes, workflow.Node{
			ID:              item.ID,
			Kind:            workflow.Kind(item.Kind),
			Title:           item.Title,
			Agent:           item.Agent,
			ToolID:          item.ToolID,
			X:               item.X,
			Y:               item.Y,
			Skills:          item.Skills,
			Prompt:          item.Prompt,
			TimeoutMS:       item.TimeoutMS,
			RetryLimit:      item.RetryLimit,
			ModelProviderID: item.ModelProviderID,
			ModelID:         item.ModelID,
			Variant:         item.Variant,
		})
	}

	edges := make([]workflow.Edge, 0, len(body.Edges))
	for _, item := range body.Edges {
		edges = append(edges, workflow.Edge{
			ID:    item.ID,
			From:  item.From,
			To:    item.To,
			Cond:  workflow.Cond(item.Cond),
			Label: item.Label,
		})
	}

	return workflow.Workflow{
		ID:         body.ID,
		Name:       body.Name,
		RootNodeID: body.RootNodeID,
		Nodes:      nodes,
		Edges:      edges,
	}
}
