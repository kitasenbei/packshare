package models

import (
	"time"

	"gorm.io/gorm"
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

// BeforeDelete hook to cascade delete beatmaps
func (p *Pack) BeforeDelete(tx *gorm.DB) error {
	return tx.Where("pack_id = ?", p.ID).Delete(&PackBeatmap{}).Error
}

type PackBeatmap struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PackID    uint      `gorm:"not null;index" json:"pack_id"`
	BeatmapID int64     `gorm:"not null" json:"beatmapset_id"`
	Title     string    `gorm:"not null" json:"title"`
	Artist    string    `json:"artist"`
	Creator   string    `json:"creator"`
	BPM       float64   `json:"bpm"`
	Keys      int       `json:"keys"`
	Status    string    `json:"status"`
	SortOrder int       `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}
