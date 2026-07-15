package web

import (
	"context"
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
	handle  socketHandler
}

type socketClient struct {
	hub    *socketHub
	conn   *websocket.Conn
	send   chan []byte
	done   chan struct{}
	once   sync.Once
	ctx    context.Context
	cancel context.CancelFunc
}

type socketHandler func(context.Context, *socketClient, socketEvent) bool

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

	ctx, cancel := context.WithCancel(context.Background())
	client := &socketClient{
		hub:    h,
		conn:   conn,
		send:   make(chan []byte, 32),
		done:   make(chan struct{}),
		ctx:    ctx,
		cancel: cancel,
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
	_, ok := h.clients[client]
	delete(h.clients, client)
	h.mu.Unlock()
	if ok {
		client.stop()
	}
}

func (h *socketHub) broadcast(data []byte) {
	drop := []*socketClient{}
	h.mu.Lock()
	for client := range h.clients {
		select {
		case <-client.done:
			delete(h.clients, client)
		case client.send <- data:
		default:
			delete(h.clients, client)
			drop = append(drop, client)
		}
	}
	h.mu.Unlock()
	for _, client := range drop {
		client.stop()
	}
}

func (c *socketClient) read() {
	defer func() {
		c.hub.remove(c)
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

		evt, _, ok := normalize(data)
		if !ok {
			continue
		}
		if c.hub.handle != nil {
			c.hub.handle(c.ctx, c, evt)
		}
	}
}

func (c *socketClient) write() {
	tick := time.NewTicker(socketPing)
	defer func() {
		tick.Stop()
		c.stop()
	}()

	for {
		select {
		case <-c.done:
			return
		case data := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(socketWrite))
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
	c.reply("", kind, payload)
}

func (h *socketHub) emitBroadcast(kind string, payload json.RawMessage) {
	if h == nil {
		return
	}
	msg, err := json.Marshal(socketEvent{
		Type:    kind,
		Payload: payload,
		Ts:      time.Now().UnixMilli(),
	})
	if err != nil {
		return
	}
	h.broadcast(msg)
}

func (c *socketClient) reply(id string, kind string, payload json.RawMessage) {
	msg, err := json.Marshal(socketEvent{
		ID:      id,
		Type:    kind,
		Payload: payload,
		Ts:      time.Now().UnixMilli(),
	})
	if err != nil {
		return
	}
	select {
	case <-c.done:
		return
	case c.send <- msg:
	default:
		c.stop()
	}
}

func (c *socketClient) stop() {
	if c == nil {
		return
	}
	c.once.Do(func() {
		if c.done != nil {
			close(c.done)
		}
		if c.cancel != nil {
			c.cancel()
		}
		if c.conn != nil {
			_ = c.conn.Close()
		}
	})
}

func normalize(data []byte) (socketEvent, []byte, bool) {
	evt := socketEvent{}
	if err := json.Unmarshal(data, &evt); err != nil {
		return evt, nil, false
	}
	evt.Type = strings.TrimSpace(evt.Type)
	if evt.Type == "" {
		return evt, nil, false
	}
	if evt.Ts == 0 {
		evt.Ts = time.Now().UnixMilli()
	}
	out, err := json.Marshal(evt)
	return evt, out, err == nil
}
