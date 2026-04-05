package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Settings struct {
	AppName      string
	Debug        bool
	DatabaseURL  string
	GoogleAPIKey string
	LLMModel     string
	DataDir      string
	ReceiptsDir  string
	Host         string
	Port         int
}

var AppSettings Settings

func LoadConfig() {
	_ = godotenv.Load()

	AppSettings = Settings{
		AppName:      getEnv("APP_NAME", "Vyaya"),
		Debug:        getEnvAsBool("DEBUG", false),
		DatabaseURL:  getEnv("DATABASE_URL", "/app/data/vyaya.db"),
		GoogleAPIKey: getEnv("GOOGLE_API_KEY", ""),
		LLMModel:     getEnv("LLM_MODEL", "models/gemini-flash-latest"),
		DataDir:      getEnv("DATA_DIR", "/app/data"),
		ReceiptsDir:  getEnv("RECEIPTS_DIR", "/app/data/receipts"),
		Host:         getEnv("HOST", "0.0.0.0"),
		Port:         getEnvAsInt("PORT", 8000),
	}

	if err := os.MkdirAll(AppSettings.DataDir, 0755); err != nil {
		log.Printf("Warning: failed to create data dir: %v", err)
	}
	if err := os.MkdirAll(AppSettings.ReceiptsDir, 0755); err != nil {
		log.Printf("Warning: failed to create receipts dir: %v", err)
	}
}

func getEnv(key, defaultVal string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	if v, err := strconv.ParseBool(getEnv(key, "")); err == nil {
		return v
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if v, err := strconv.Atoi(getEnv(key, "")); err == nil {
		return v
	}
	return defaultVal
}
