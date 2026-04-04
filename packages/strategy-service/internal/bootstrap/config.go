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
	Host     string			//策略服务监听地址
	Port     string			//策略服务监听端口
	Dist     string			//策略前端静态资源目录
	Runtime  string			//策略运行目录, root目录
	Opencode OpencodeConfig //opencode配置
	Platform string //平台
	Account  string //账号
	WindowId string //smartX 客户端实例
	LogDir   string //策略日志目录
}

type OpencodeConfig struct {
	Enabled      bool		//是否开启
	Startup      string	    //启动方式
	Bin          string     //opencode二进制文件
	GitBin       string     //git二进制文件
	GitSource    string     //git源码
	Host         string     //opencode服务监听地址
	Port         int        //opencode服务监听端口
	Cwd          string		//opencode运行目录
	StartTimeout time.Duration //启动超时时间
}

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
			Enabled:      truth("STRATEGY_OPENCODE_ENABLED", true),  //是否开启
			Startup:      text("STRATEGY_OPENCODE_STARTUP", "auto"), //启动方式
			Bin:          text("STRATEGY_OPENCODE_BIN", "opencode"), //opencode二进制文件
			Host:         text("STRATEGY_OPENCODE_HOST", "127.0.0.1"), //opencode服务监听地址
			Port:         number("STRATEGY_OPENCODE_PORT", 4096), //opencode服务监听端口
			Cwd:          text("STRATEGY_OPENCODE_CWD", ""), //opencode运行目录
			StartTimeout: span("STRATEGY_OPENCODE_START_TIMEOUT", 30*time.Second), //opencode启动超时时间
		},
		Account:  account, //账号
		WindowId: windowId, //smartX 窗口实例ID
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

	out, err := strconv.Atoi(value) // Ascii to integer
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

	out, err := time.ParseDuration(value) // 将字符串解析为一个持续时间
	if err != nil || out <= 0 {
		return fallback
	}
	return out
}

// 获取策略日志目录
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
