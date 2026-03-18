package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/packshare/backend/internal/models"
	"gorm.io/gorm"
)

const (
	maxKeyNameLength = 100
	maxKeysPerUser   = 20
)

var validPermissions = map[string]bool{
	"create": true,
	"edit":   true,
	"delete": true,
}

// keyJWTExpiry returns the JWT expiry timestamp matching the key's expiration,
// or 1 year from now if the key never expires.
func keyJWTExpiry(expiresAt *time.Time) int64 {
	if expiresAt != nil {
		return expiresAt.Unix()
	}
	return time.Now().Add(365 * 24 * time.Hour).Unix()
}

type AccessKeyHandler struct {
	db        *gorm.DB
	jwtSecret string
}

func NewAccessKeyHandler(db *gorm.DB, jwtSecret string) *AccessKeyHandler {
	return &AccessKeyHandler{db: db, jwtSecret: jwtSecret}
}

type CreateKeyRequest struct {
	Name          string   `json:"name"`
	Permissions   []string `json:"permissions"`
	ExpiresInDays *int     `json:"expires_in_days,omitempty"`
}

type KeyLoginRequest struct {
	Key string `json:"key"`
}

func (h *AccessKeyHandler) CreateKey(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key name is required"})
	}
	if len(name) > maxKeyNameLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key name too long"})
	}

	if len(req.Permissions) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "at least one permission is required"})
	}
	for _, perm := range req.Permissions {
		if !validPermissions[perm] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid permission: " + perm})
		}
	}

	// Get user from DB
	var user models.User
	if err := h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "user not found"})
	}

	// Check key limit
	var count int64
	if err := h.db.Model(&models.AccessKey{}).Where("user_id = ?", user.ID).Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if count >= maxKeysPerUser {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "maximum number of access keys reached"})
	}

	// Generate random key
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate key"})
	}
	rawKey := hex.EncodeToString(rawBytes)

	// Hash for storage
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var expiresAt *time.Time
	if req.ExpiresInDays != nil && *req.ExpiresInDays > 0 {
		t := time.Now().AddDate(0, 0, *req.ExpiresInDays)
		expiresAt = &t
	}

	accessKey := models.AccessKey{
		UserID:      user.ID,
		KeyHash:     keyHash,
		Name:        name,
		Permissions: strings.Join(req.Permissions, ","),
		ExpiresAt:   expiresAt,
	}

	if err := h.db.Create(&accessKey).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create key"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          accessKey.ID,
		"key":         rawKey,
		"name":        accessKey.Name,
		"permissions": req.Permissions,
		"expires_at":  accessKey.ExpiresAt,
		"created_at":  accessKey.CreatedAt,
	})
}

func (h *AccessKeyHandler) ListKeys(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var user models.User
	if err := h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error; err != nil {
		return c.JSON([]fiber.Map{})
	}

	var keys []models.AccessKey
	if err := h.db.Where("user_id = ?", user.ID).Order("created_at DESC").Find(&keys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	result := make([]fiber.Map, len(keys))
	for i, k := range keys {
		result[i] = fiber.Map{
			"id":           k.ID,
			"name":         k.Name,
			"permissions":  strings.Split(k.Permissions, ","),
			"expires_at":   k.ExpiresAt,
			"last_used_at": k.LastUsedAt,
			"created_at":   k.CreatedAt,
		}
	}

	return c.JSON(result)
}

func (h *AccessKeyHandler) RevokeKey(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid key id"})
	}

	var user models.User
	if err := h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}

	result := h.db.Where("id = ? AND user_id = ?", id, user.ID).Delete(&models.AccessKey{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "key not found"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AccessKeyHandler) KeyLogin(c *fiber.Ctx) error {
	var req KeyLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	rawKey := strings.TrimSpace(req.Key)
	if rawKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "key is required"})
	}

	// Hash the provided key
	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	var accessKey models.AccessKey
	if err := h.db.Preload("User").Where("key_hash = ?", keyHash).First(&accessKey).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid access key"})
	}

	// Check expiry
	if accessKey.ExpiresAt != nil && time.Now().After(*accessKey.ExpiresAt) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "access key has expired"})
	}

	// Update last used (non-critical, log but don't fail)
	now := time.Now()
	_ = h.db.Model(&accessKey).Update("last_used_at", now).Error

	// Issue JWT with key claims
	permissions := accessKey.Permissions
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"osu_id":       accessKey.User.OsuID,
		"username":     accessKey.User.Username,
		"country_code": accessKey.User.CountryCode,
		"avatar_url":   accessKey.User.AvatarURL,
		"key_name":     accessKey.Name,
		"permissions":  permissions,
		"exp":          keyJWTExpiry(accessKey.ExpiresAt),
	})

	tokenString, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"token": tokenString,
		"user": fiber.Map{
			"osu_id":       accessKey.User.OsuID,
			"username":     accessKey.User.Username,
			"country_code": accessKey.User.CountryCode,
			"avatar_url":   accessKey.User.AvatarURL,
		},
		"key_name":    accessKey.Name,
		"permissions": strings.Split(permissions, ","),
	})
}
