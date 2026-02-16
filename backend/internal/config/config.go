package config

import (
	"log"
	"os"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	MiauAuthURL    string
	AllowedOrigins string
	UploadsBucket  string
}

func Load() *Config {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" || jwtSecret == "change-me-in-production" {
		if os.Getenv("ENVIRONMENT") != "" {
			log.Fatal("JWT_SECRET must be set in deployed environments")
		}
		jwtSecret = "local-dev-only-secret"
		log.Println("Warning: using default JWT_SECRET, not safe for production")
	}

	return &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://localhost:5432/packshare?sslmode=disable"),
		JWTSecret:      jwtSecret,
		MiauAuthURL:    getEnv("MIAUAUTH_URL", "http://localhost:8001"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),
		UploadsBucket:  getEnv("UPLOADS_BUCKET", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
