package web

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"strategy-service/internal/utils"
	"strategy-service/internal/workbench"
)

type socketError struct {
	WorkspacePath string `json:"workspacePath,omitempty"`
	Message       string `json:"message"`
}

func (a *API) handleSessionCreate(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.SessionCreate{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "session.create.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	req.Title = strings.TrimSpace(req.Title)
	if req.WorkspacePath == "" {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{Message: "workspacePath is required"}))
		return
	}

	session, err := a.bench.CreateSession(ctx, req)
	if err != nil {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}

	data := utils.Pack(workbench.SessionCreated{
		WorkspacePath: req.WorkspacePath,
		Session:       session,
	})
	a.event.broadcast(utils.Pack(socketEvent{
		ID:      evt.ID,
		Type:    "session.created",
		Payload: data,
		Ts:      time.Now().UnixMilli(),
	}))
}
