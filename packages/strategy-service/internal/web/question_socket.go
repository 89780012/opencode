package web

import (
	"context"
	"encoding/json"
	"strings"

	"strategy-service/internal/question"
	"strategy-service/internal/utils"
)

func (a *API) handleQuestionList(ctx context.Context, client *socketClient, evt socketEvent) {
	_ = ctx
	req := question.List{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "question.list.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	req.WorkspacePath = strings.TrimSpace(req.WorkspacePath)
	data, err := a.question.List(req)
	if err != nil {
		client.reply(evt.ID, "question.list.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "question.listed", utils.Pack(data))
}

func (a *API) handleQuestionAppend(ctx context.Context, client *socketClient, evt socketEvent) {
	_ = ctx
	req := question.Entry{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "question.append.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.question.Append(req)
	if err != nil {
		client.reply(evt.ID, "question.append.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "question.appended", utils.Pack(data))
}

func (a *API) handleQuestionDelete(ctx context.Context, client *socketClient, evt socketEvent) {
	_ = ctx
	req := question.Delete{}
	if len(evt.Payload) > 0 {
		if err := json.Unmarshal(evt.Payload, &req); err != nil {
			client.reply(evt.ID, "question.delete.error", utils.Pack(socketError{Message: err.Error()}))
			return
		}
	}
	data, err := a.question.Delete(req)
	if err != nil {
		client.reply(evt.ID, "question.delete.error", utils.Pack(socketError{Message: err.Error()}))
		return
	}
	client.reply(evt.ID, "question.deleted", utils.Pack(data))
}
