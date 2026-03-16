package web

import (
	"encoding/json"
	"net/http"
)

type envelope struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data interface{} `json:"data"`
}

func write(w http.ResponseWriter, status int, msg string, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(envelope{
		Code: status,
		Msg:  msg,
		Data: data,
	})
}
