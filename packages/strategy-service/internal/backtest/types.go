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

type RunReq struct {
	WorkspacePath string  `json:"workspacePath"`
	SessionID     string  `json:"sessionId"`
	PluginID      string  `json:"pluginId"`
	Config        *Config `json:"config,omitempty"`
}

type ListReq struct {
	WorkspacePath string `form:"workspacePath" json:"workspacePath"`
	SessionID     string `form:"sessionId" json:"sessionId"`
	Limit         int    `form:"limit" json:"limit"`
}

type IDReq struct {
	ID string `uri:"id" json:"id"`
}

type Run struct {
	ID            string          `json:"id"`
	WorkspacePath string          `json:"workspacePath"`
	SessionID     string          `json:"sessionId"`
	PluginID      string          `json:"pluginId"`
	BtID          string          `json:"btId"`
	Status        string          `json:"status"`
	StatusCode    float64         `json:"statusCode"`
	Progress      float64         `json:"progress"`
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

type List struct {
	WorkspacePath string `json:"workspacePath"`
	SessionID     string `json:"sessionId,omitempty"`
	Runs          []Run  `json:"runs"`
}
