package web

import (
	"context"
	"encoding/json"

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

	session, err := a.bench.CreateSession(ctx, req)
	if err != nil {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}

	data := utils.Pack(workbench.SessionCreated{
		WorkspacePath: req.WorkspacePath,
		Session:       session,
	})
	client.reply(evt.ID, "session.created", data)
}

func (a *API) handleSessionUpdate(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.SessionUpdate{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "session.update.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	row, err := a.bench.UpdateSession(ctx, req)
	if err != nil {
		client.reply(evt.ID, "session.update.error", utils.Pack(socketError{Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "session.updated", utils.Pack(workbench.SessionResult{Session: row}))
}

func (a *API) handleSessionDelete(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.SessionDelete{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "session.delete.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	if err := a.bench.DeleteSession(ctx, req); err != nil {
		client.reply(evt.ID, "session.delete.error", utils.Pack(socketError{Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "session.deleted", utils.Pack(req))
}

func (a *API) handleSessionList(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.SessionList{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "session.list.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.bench.ListSessions(ctx, req)
	if err != nil {
		client.reply(evt.ID, "session.list.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "session.listed", utils.Pack(data))
}

func (a *API) handleSessionDetail(ctx context.Context, client *socketClient, evt socketEvent) {
	req := workbench.SessionDetail{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "session.detail.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	row, err := a.bench.DetailSession(ctx, req)
	if err != nil {
		client.reply(evt.ID, "session.detail.error", utils.Pack(socketError{Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "session.detail", utils.Pack(workbench.SessionResult{Session: row}))
}
