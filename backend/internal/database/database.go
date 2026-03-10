package database

import (
	"os"
	"time"

	"github.com/packshare/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	logLevel := logger.Warn
	if os.Getenv("ENVIRONMENT") == "" {
		logLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(1 * time.Minute)

	if err := db.AutoMigrate(&models.User{}, &models.Pack{}, &models.PackBeatmap{}, &models.AccessKey{}, &models.Tournament{}, &models.TournamentStage{}, &models.TournamentMap{}, &models.TournamentPlayer{}, &models.TournamentAnnouncement{}, &models.TournamentSite{}); err != nil {
		return nil, err
	}

	return db, nil
}
