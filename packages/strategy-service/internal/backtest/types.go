package backtest

import "encoding/json"

type Config struct {
	StartTime    string  `json:"startTime"`
	EndTime      string  `json:"endTime"`
	Cash         float64 `json:"cash"`
	ShStockSx    float64 `json:"shStockSx"`
	ShStockMinSx float64 `json:"shStockMinSx"`
	SzStockSx    float64 `json:"szStockSx"`
	SzStockMinSx float64 `json:"szStockMinSx"`
	ShStockGh    float64 `json:"shStockGh"`
	SzStockGh    float64 `json:"szStockGh"`
	BuyYh        float64 `json:"buyYh"`
	SellYh       float64 `json:"sellYh"`
	Rf           float64 `json:"rf"`
	Slippage     float64 `json:"slippage"`
	IsTickMode   bool    `json:"isTickMode"`
	UseNewPrice  bool    `json:"useNewPrice"`
	Interval     string  `json:"interval"`
	CloseLog     bool    `json:"closeLog"`
}

type ConfigPatch struct {
	StartTime    *string  `json:"startTime,omitempty"`
	EndTime      *string  `json:"endTime,omitempty"`
	Cash         *float64 `json:"cash,omitempty"`
	ShStockSx    *float64 `json:"shStockSx,omitempty"`
	ShStockMinSx *float64 `json:"shStockMinSx,omitempty"`
	SzStockSx    *float64 `json:"szStockSx,omitempty"`
	SzStockMinSx *float64 `json:"szStockMinSx,omitempty"`
	ShStockGh    *float64 `json:"shStockGh,omitempty"`
	SzStockGh    *float64 `json:"szStockGh,omitempty"`
	BuyYh        *float64 `json:"buyYh,omitempty"`
	SellYh       *float64 `json:"sellYh,omitempty"`
	Rf           *float64 `json:"rf,omitempty"`
	Slippage     *float64 `json:"slippage,omitempty"`
	IsTickMode   *bool    `json:"isTickMode,omitempty"`
	UseNewPrice  *bool    `json:"useNewPrice,omitempty"`
	Interval     *string  `json:"interval,omitempty"`
	CloseLog     *bool    `json:"closeLog,omitempty"`
}

type RunReq struct {
	WorkspacePath string  `json:"workspacePath"`
	SessionID     string  `json:"sessionId"`
	PluginID      string  `json:"pluginId"`
	RequestKey    string  `json:"requestKey"`
	Config        *Config `json:"config,omitempty"`
}

type PatchReq struct {
	WorkspacePath string       `json:"workspacePath"`
	SessionID     string       `json:"sessionId"`
	RequestKey    string       `json:"requestKey"`
	Config        *ConfigPatch `json:"config,omitempty"`
}

type ListReq struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	SessionID     string `form:"sessionId" json:"sessionId"`
	Limit         int    `form:"limit" json:"limit"`
}

type IDReq struct {
	ID string `uri:"id" json:"id"`
}

type ScopedReq struct {
	ID            string `json:"id"`
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId"`
}

type Run struct {
	ID            string          `json:"id"`
	WorkspacePath string          `json:"workspacePath"`
	SessionID     string          `json:"sessionId"`
	PluginID      string          `json:"pluginId"`
	RequestKey    string          `json:"requestKey"`
	BtID          string          `json:"btId"`
	Status        string          `json:"status"`
	StatusCode    float64         `json:"statusCode"`
	Progress      float64         `json:"progress"`
	Revision      int64           `json:"revision"`
	Config        Config          `json:"config"`
	Result        json.RawMessage `json:"result"`
	Summary       json.RawMessage `json:"summary"`
	DataFiles     json.RawMessage `json:"dataFiles"`
	LogPath       string          `json:"logPath"`
	Error         string          `json:"error"`
	StartedAt     int64           `json:"startedAt"`
	FinishedAt    int64           `json:"finishedAt"`
	UpdatedAt     int64           `json:"updatedAt"`
}

type Update struct {
	ID            string  `json:"id"`
	WorkspacePath string  `json:"workspacePath"`
	SessionID     string  `json:"sessionId"`
	Status        string  `json:"status"`
	StatusCode    float64 `json:"statusCode"`
	Progress      float64 `json:"progress"`
	Error         string  `json:"error"`
	Revision      int64   `json:"revision"`
	UpdatedAt     int64   `json:"updatedAt"`
	HasResult     bool    `json:"hasResult"`
}

type List struct {
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId,omitempty"`
	Runs          []Run  `json:"runs"`
}

type Brief struct {
	ID            string  `json:"id"`
	WorkspacePath string  `json:"workspacePath"`
	SessionID     string  `json:"sessionId"`
	Status        string  `json:"status"`
	StatusCode    float64 `json:"statusCode"`
	Progress      float64 `json:"progress"`
	Revision      int64   `json:"revision"`
	Error         string  `json:"error,omitempty"`
	StartedAt     int64   `json:"startedAt"`
	FinishedAt    int64   `json:"finishedAt"`
	UpdatedAt     int64   `json:"updatedAt"`
}

type BriefList struct {
	WorkspacePath string  `json:"workspacePath"`
	SessionID     string  `json:"sessionId"`
	Runs          []Brief `json:"runs"`
}

type Detail struct {
	Brief
	Config    Config          `json:"config"`
	Summary   json.RawMessage `json:"summary"`
	HasResult bool            `json:"hasResult"`
}
