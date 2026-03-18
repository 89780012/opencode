package ipc

import (
	"context"
	"encoding/json"
	"errors"
	"net"
)

var errInUse = errors.New("ipc handle already in use")

type Config struct {
	Enabled bool
	Product string
	Version string
}

type Entry struct {
	UserID string
	Info   json.RawMessage
	Conn   net.Conn
}

type State struct {
	Enabled           bool   `json:"enabled"`
	SmartHandle       string `json:"smart_handle,omitempty"`
	ContinueHandle    string `json:"continue_handle,omitempty"`
	SmartListening    bool   `json:"smart_listening"`
	ContinueListening bool   `json:"continue_listening"`
	SmartConnected    bool   `json:"smart_connected"`
	ContinueConnected bool   `json:"continue_connected"`
	AccountCount      int    `json:"account_count"`
	LastUserID        string `json:"last_user_id,omitempty"`
}

type ManagerAPI interface {
	Start(context.Context) error
	Stop(context.Context) error
	State() State
}
