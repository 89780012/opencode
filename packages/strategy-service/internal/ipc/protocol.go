package ipc

import "strings"

const (
	msgInfo   = "accountInfo"
	msgLogout = "accountLogout"
	msgQuery  = "queryAccountInfo"
	msgReply  = "queryAccountInfoRsp"
)

func split(text string) (string, string) {
	i := strings.IndexByte(text, ':')
	if i < 0 {
		return text, ""
	}
	return text[:i], text[i+1:]
}
