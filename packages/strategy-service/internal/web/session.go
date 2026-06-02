package web

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"strategy-service/internal/db"
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

	meta := struct {
		ID    string `json:"id"`
		Title string `json:"title"`
		Time  struct {
			Created int64 `json:"created"`
			Updated int64 `json:"updated"`
		} `json:"time"`
	}{}
	if err := json.Unmarshal(session, &meta); err != nil {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	meta.ID = strings.TrimSpace(meta.ID)
	if meta.ID == "" {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: "session id is required"}))
		return
	}
	meta.Title = req.Title
	now := time.Now().UnixMilli()
	meta.Time.Created = now
	meta.Time.Updated = now
	doc, err := db.Open()
	if err != nil {
		client.reply(evt.ID, "session.create.error", utils.Pack(socketError{WorkspacePath: req.WorkspacePath, Message: err.Error()}))
		return
	}
	_, err = doc.ExecContext(ctx, `insert into sessions(id, workspace_path, title, body, created_at, updated_at) values (?, ?, ?, ?, ?, ?)
on conflict(id) do update set workspace_path = excluded.workspace_path, title = excluded.title, body = excluded.body, updated_at = excluded.updated_at`,
		meta.ID, req.WorkspacePath, meta.Title, string(session), meta.Time.Created, meta.Time.Updated)
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
