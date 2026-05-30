package web

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	socketWait  = 60 * time.Second
	socketPing  = 30 * time.Second
	socketWrite = 10 * time.Second
	socketSize  = 1 << 20
)

type socketEvent struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Ts      int64           `json:"ts,omitempty"`
}

type socketHub struct {
	mu      sync.Mutex
	clients map[*socketClient]struct{}
	up      websocket.Upgrader
}

type socketClient struct {
	hub  *socketHub
	conn *websocket.Conn
	send chan []byte
}

func newSocketHub() *socketHub {
	return &socketHub{
		clients: map[*socketClient]struct{}{},
		up: websocket.Upgrader{
			CheckOrigin: func(*http.Request) bool {
				return true
			},
		},
	}
}

func (h *socketHub) serve(c *gin.Context) {
	conn, err := h.up.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		slog.Warn("websocket upgrade failed", "error", err)
		return
	}

	client := &socketClient{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 32),
	}
	h.add(client)
	client.emit("socket.connected", nil)

	go client.write()
	client.read()
}

func (h *socketHub) add(client *socketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = struct{}{}
}

func (h *socketHub) remove(client *socketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[client]; !ok {
		return
	}
	delete(h.clients, client)
	close(client.send)
}

func (h *socketHub) broadcast(data []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for client := range h.clients {
		select {
		case client.send <- data:
		default:
			delete(h.clients, client)
			close(client.send)
		}
	}
}

func (c *socketClient) read() {
	defer func() {
		c.hub.remove(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(socketSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(socketWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(socketWait))
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Warn("websocket read failed", "error", err)
			}
			return
		}

		msg, ok := normalize(data)
		if !ok {
			continue
		}
		c.hub.broadcast(msg)
	}
}

func (c *socketClient) write() {
	tick := time.NewTicker(socketPing)
	defer func() {
		tick.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case data, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(socketWrite))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, nil)
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		case <-tick.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(socketWrite))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *socketClient) emit(kind string, payload json.RawMessage) {
	msg, err := json.Marshal(socketEvent{
		Type:    kind,
		Payload: payload,
		Ts:      time.Now().UnixMilli(),
	})
	if err != nil {
		return
	}
	c.send <- msg
}

func normalize(data []byte) ([]byte, bool) {
	evt := socketEvent{}
	if err := json.Unmarshal(data, &evt); err != nil {
		return nil, false
	}
	evt.Type = strings.TrimSpace(evt.Type)
	if evt.Type == "" {
		return nil, false
	}
	if evt.Ts == 0 {
		evt.Ts = time.Now().UnixMilli()
	}
	out, err := json.Marshal(evt)
	return out, err == nil
}
