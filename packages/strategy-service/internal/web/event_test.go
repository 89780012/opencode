package web

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func TestSocketDoesNotBroadcastUnknownInboundEvent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hub := newSocketHub()
	hub.handle = func(context.Context, *socketClient, socketEvent) bool { return false }
	router := gin.New()
	router.GET("/ws", hub.serve)
	srv := httptest.NewServer(router)
	defer srv.Close()
	one := dial(t, srv.URL)
	defer one.Close()
	two := dial(t, srv.URL)
	defer two.Close()
	if err := one.WriteJSON(socketEvent{Type: "review.updated"}); err != nil {
		t.Fatal(err)
	}
	if err := two.SetReadDeadline(time.Now().Add(150 * time.Millisecond)); err != nil {
		t.Fatal(err)
	}
	if _, _, err := two.ReadMessage(); err == nil {
		t.Fatal("unknown inbound event was broadcast")
	}
}

func TestSocketHandlerCanReplyAfterDisconnect(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hub := newSocketHub()
	started := make(chan struct{})
	done := make(chan struct{})
	api := &API{
		event: hub,
		socketHandlers: map[string]socketHandlerFunc{
			"slow": func(ctx context.Context, client *socketClient, evt socketEvent) {
				close(started)
				<-ctx.Done()
				client.reply(evt.ID, "slow.done", nil)
				close(done)
			},
		},
	}
	hub.handle = api.socket
	router := gin.New()
	router.GET("/ws", hub.serve)
	srv := httptest.NewServer(router)
	defer srv.Close()
	conn := dial(t, srv.URL)
	if err := conn.WriteJSON(socketEvent{ID: "request", Type: "slow"}); err != nil {
		t.Fatal(err)
	}
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("socket handler did not start")
	}
	if err := conn.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("socket handler did not stop")
	}
}

func dial(t *testing.T, base string) *websocket.Conn {
	t.Helper()
	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(base, "http")+"/ws", nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := conn.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	evt := socketEvent{}
	if err := conn.ReadJSON(&evt); err != nil {
		t.Fatal(err)
	}
	if evt.Type != "socket.connected" {
		t.Fatalf("event = %#v", evt)
	}
	if err := conn.SetReadDeadline(time.Time{}); err != nil {
		t.Fatal(err)
	}
	return conn
}
