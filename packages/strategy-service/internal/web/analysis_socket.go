package web

import (
	"context"
	"encoding/json"
	"errors"

	"strategy-service/internal/db"
	"strategy-service/internal/utils"
	"strategy-service/internal/workbench"
)

func (a *API) handleAnalysisGet(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.AnalysisGet{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "analysis.get.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.bench.GetAnalysis(ctx, req)
	if errors.Is(err, db.ErrNotFound) {
		client.reply(evt.ID, "analysis.got", nil)
		return
	}
	if err != nil {
		client.reply(evt.ID, "analysis.get.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "analysis.got", utils.Pack(data))
}

func (a *API) handleFlowchartGet(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.FlowchartGet{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "flowchart.get.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.bench.GetFlowchart(ctx, req)
	if errors.Is(err, db.ErrNotFound) {
		client.reply(evt.ID, "flowchart.got", nil)
		return
	}
	if err != nil {
		client.reply(evt.ID, "flowchart.get.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "flowchart.got", utils.Pack(data))
}

func (a *API) handleReviewGet(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.ReviewGet{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "review.get.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.bench.GetReview(ctx, req)
	if errors.Is(err, db.ErrNotFound) {
		client.reply(evt.ID, "review.got", nil)
		return
	}
	if err != nil {
		client.reply(evt.ID, "review.get.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "review.got", utils.Pack(data))
}
