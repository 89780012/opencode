package app

import "os"

type Config struct {
	Host string
	Port string
	Dist string
}

func LoadConfig() Config {
	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	dist := os.Getenv("STRATEGY_FRONT_DIST")
	if dist == "" {
		dist = "../strategy-front/dist"
	}

	return Config{
		Host: host,
		Port: port,
		Dist: dist,
	}
}

func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}
