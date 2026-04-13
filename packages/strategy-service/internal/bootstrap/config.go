package bootstrap

import (
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host     string
	Port     string
	Dist     string
	Runtime  string
	Opencode OpencodeConfig
	Platform string
	Account  string
	WindowId string
	LogDir   string
}

type OpencodeConfig struct {
	Enabled      bool
	Startup      string
	Bin          string
	GitBin       string
	GitSource    string
	Host         string
	Port         int
	Cwd          string
	StartTimeout time.Duration
}

// LoadConfig 从环境变量装配服务启动配置。
func LoadConfig() Config {
	host := text("HOST", "127.0.0.1")
	port := text("PORT", "5000")
	dist := text("STRATEGY_FRONT_DIST", "../strategy-front/dist")
	platform := text("PLATFORM", runtime.GOOS)
	account := text("ACCOUNT", "")
	windowId := text("WINDOWID", "")
	logDir := smartxLog()

	return Config{
		Host:     host,
		Port:     port,
		Dist:     dist,
		Platform: platform,
		LogDir:   logDir,
		Opencode: OpencodeConfig{
			Enabled:      truth("STRATEGY_OPENCODE_ENABLED", true),
			Startup:      text("STRATEGY_OPENCODE_STARTUP", "auto"),
			Bin:          text("STRATEGY_OPENCODE_BIN", "opencode"),
			Host:         text("STRATEGY_OPENCODE_HOST", "127.0.0.1"),
			Port:         number("STRATEGY_OPENCODE_PORT", 4096),
			Cwd:          text("STRATEGY_OPENCODE_CWD", ""),
			StartTimeout: span("STRATEGY_OPENCODE_START_TIMEOUT", 30*time.Second),
		},
		Account:  account,
		WindowId: windowId,
	}
}

// Addr 返回 HTTP 服务监听地址。
func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}

// text 读取字符串环境变量，空值时回退到默认值。
func text(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

// truth 读取布尔环境变量，支持 1/true/yes/on。
func truth(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

// number 读取正整数环境变量，非法值时使用默认值。
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

// span 读取持续时间环境变量，非法值时使用默认值。
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

// smartxLog 返回 smartx 日志目录，允许通过环境变量覆盖。
func smartxLog() string {
	value := strings.TrimSpace(os.Getenv("STRATEGY_SMARTX_LOG_DIR"))
	if value != "" {
		return filepath.Clean(value)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".xtp-smart", "log", "default")
	}
	return filepath.Join(home, ".xtp-smart", "log", "default")
}
