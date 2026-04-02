package bootstrap

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host  string
	Port  string
	ES    ESConfig
	Index string
}

type ESConfig struct {
	Addr     []string
	User     string
	Pass     string
	Timeout  time.Duration
	Insecure bool
}

func LoadConfig() Config {
	return Config{
		Host:  text("HTTP_HOST", "127.0.0.1"),
		Port:  text("HTTP_PORT", "8080"),
		Index: text("ES_INDEX", "knowledge"),
		ES: ESConfig{
			Addr:     split(text("ES_ADDR", "http://127.0.0.1:9200")),
			User:     text("ES_USER", ""),
			Pass:     text("ES_PASS", ""),
			Timeout:  span("ES_TIMEOUT", 5*time.Second),
			Insecure: truth("ES_INSECURE", false),
		},
	}
}

func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}

func text(key string, fallback string) string {
	if s := strings.TrimSpace(os.Getenv(key)); s != "" {
		return s
	}
	return fallback
}

func split(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool {
		return r == ',' || r == ';'
	})
}

func truth(key string, fallback bool) bool {
	s := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if s == "" {
		return fallback
	}
	return s == "1" || s == "true" || s == "yes" || s == "on"
}

func span(key string, fallback time.Duration) time.Duration {
	s := strings.TrimSpace(os.Getenv(key))
	if s == "" {
		return fallback
	}
	d, err := time.ParseDuration(s)
	if err != nil || d <= 0 {
		return fallback
	}
	return d
}

func count(key string, fallback int) int {
	s := strings.TrimSpace(os.Getenv(key))
	if s == "" {
		return fallback
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
