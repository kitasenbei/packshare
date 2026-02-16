package models

import (
	"time"
)

type User struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	OsuID       int64     `gorm:"uniqueIndex;not null" json:"osu_id"`
	Username    string    `gorm:"not null" json:"username"`
	CountryCode string    `json:"country_code"`
	AvatarURL   string    `json:"avatar_url"`
	Packs       []Pack    `gorm:"foreignKey:UserID" json:"packs,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Pack struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	ShareCode   string        `gorm:"uniqueIndex;size:12;not null" json:"share_code"`
	Name        string        `gorm:"not null" json:"name"`
	Description string        `json:"description"`
	Views       int64         `gorm:"default:0" json:"views"`
	UserID      uint          `gorm:"not null" json:"user_id"`
	User        User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Beatmaps    []PackBeatmap `gorm:"foreignKey:PackID" json:"beatmaps,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type PackBeatmap struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	PackID         uint      `gorm:"not null;index" json:"pack_id"`
	BeatmapID      int64     `gorm:"not null" json:"beatmapset_id"`
	Title          string    `gorm:"not null" json:"title"`
	Artist         string    `json:"artist"`
	Creator        string    `json:"creator"`
	BPM            float64   `json:"bpm"`
	Keys           int       `json:"keys"`
	StarRating     *float64  `json:"star_rating,omitempty"`
	DifficultyName string    `json:"difficulty_name,omitempty"`
	Status         string    `json:"status"`
	SortOrder      int       `gorm:"default:0" json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
}

type Tournament struct {
	ID           uint              `gorm:"primaryKey" json:"id"`
	Name         string            `gorm:"not null" json:"name"`
	Abbreviation string            `gorm:"uniqueIndex;not null" json:"abbreviation"`
	Format       string            `gorm:"not null" json:"format"`
	BannerURL    string            `json:"banner_url"`
	LogoURL      string            `json:"logo_url"`
	Status       string            `gorm:"not null;default:upcoming" json:"status"`
	UserID       uint              `gorm:"not null" json:"user_id"`
	User         User              `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Stages       []TournamentStage `gorm:"foreignKey:TournamentID" json:"stages,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

type TournamentStage struct {
	ID           uint            `gorm:"primaryKey" json:"id"`
	TournamentID uint            `gorm:"not null;index" json:"tournament_id"`
	Name         string          `gorm:"not null" json:"name"`
	SortOrder    int             `gorm:"default:0" json:"sort_order"`
	Maps         []TournamentMap `gorm:"foreignKey:StageID" json:"maps,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

type TournamentMap struct {
	ID             uint     `gorm:"primaryKey" json:"id"`
	StageID        uint     `gorm:"not null;index" json:"stage_id"`
	SlotType       string   `gorm:"not null" json:"slot_type"`
	Mod            string   `gorm:"not null" json:"mod"`
	SlotNumber     int      `gorm:"not null" json:"slot_number"`
	BeatmapsetID   int64    `gorm:"not null" json:"beatmapset_id"`
	Title          string   `gorm:"not null" json:"title"`
	Artist         string   `json:"artist"`
	Creator        string   `json:"creator"`
	Keys           int      `json:"keys"`
	StarRating     *float64 `json:"star_rating,omitempty"`
	DifficultyName string   `json:"difficulty_name,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type AccessKey struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	UserID      uint       `gorm:"not null;index" json:"user_id"`
	User        User       `gorm:"foreignKey:UserID" json:"-"`
	KeyHash     string     `gorm:"uniqueIndex;not null" json:"-"`
	Name        string     `gorm:"not null" json:"name"`
	Permissions string     `gorm:"not null" json:"permissions"` // comma-separated: "create,edit,delete"
	ExpiresAt   *time.Time `json:"expires_at"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	CreatedAt   time.Time  `json:"created_at"`
}
