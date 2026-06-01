package utils

import "encoding/json"

func Pack(value any) json.RawMessage {
	data, _ := json.Marshal(value)
	return data
}
