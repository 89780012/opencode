package bootstrap

import (
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host     string
	Port     string
	Dist     string
	Opencode OpencodeConfig
	IPC      IPCConfig
	Platform string
	Account  string //账号
	WindowId string //smartX 客户端实例
}

type OpencodeConfig struct {
	Enabled      bool
	Startup      string
	Bin          string
	Host         string
	Port         int
	Cwd          string
	StartTimeout time.Duration
}

type IPCConfig struct {
	Enabled bool
	Product string
	Version string
}

func LoadConfig() Config {
	host := text("HOST", "127.0.0.1")
	port := text("PORT", "5000")
	dist := text("STRATEGY_FRONT_DIST", "../strategy-front/dist")
	platform := text("PLATFORM", runtime.GOOS)
	account := text("ACCOUNT", "")
	windowId := text("WINDOWID", "")

	return Config{
		Host:     host,
		Port:     port,
		Dist:     dist,
		Platform: platform,
		Opencode: OpencodeConfig{
			Enabled:      truth("STRATEGY_OPENCODE_ENABLED", true),
			Startup:      text("STRATEGY_OPENCODE_STARTUP", "auto"),
			Bin:          text("STRATEGY_OPENCODE_BIN", "opencode"),
			Host:         text("STRATEGY_OPENCODE_HOST", "127.0.0.1"),
			Port:         number("STRATEGY_OPENCODE_PORT", 4096),
			Cwd:          text("STRATEGY_OPENCODE_CWD", ""),
			StartTimeout: span("STRATEGY_OPENCODE_START_TIMEOUT", 30*time.Second),
		},
		IPC: IPCConfig{
			Enabled: truth("STRATEGY_IPC_ENABLED", true),
			Product: text("STRATEGY_IPC_PRODUCT", "IDE"),
			Version: text("STRATEGY_IPC_VERSION", ""),
		},
		Account:  account,
		WindowId: windowId,
	}
}

func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}

func text(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func truth(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func number(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	out, err := strconv.Atoi(value)
	if err != nil || out <= 0 {
		return fallback
	}
	return out
}

func span(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	out, err := time.ParseDuration(value)
	if err != nil || out <= 0 {
		return fallback
	}
	return out
}
