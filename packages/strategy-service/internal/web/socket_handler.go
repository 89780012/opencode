package web

import "context"

type socketHandlerFunc func(context.Context, *socketClient, socketEvent)

func (a *API) socket(ctx context.Context, client *socketClient, evt socketEvent) bool {
	handler, ok := a.socketHandlers[evt.Type]
	if !ok {
		return false
	}
	go handler(ctx, client, evt)
	return true
}
