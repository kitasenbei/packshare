package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/packshare/backend/internal/middleware"
	"github.com/packshare/backend/internal/models"
	"gorm.io/gorm"
)

const (
	maxBeatmapsPerPack = 500
	maxNameLength      = 200
	maxDescriptionLen  = 2000
	maxFieldLength     = 500
	maxShareCodeRetry  = 10
)

type PackHandler struct {
	db *gorm.DB
}

func NewPackHandler(db *gorm.DB) *PackHandler {
	return &PackHandler{db: db}
}

type CreatePackRequest struct {
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Beatmaps    []BeatmapRequest `json:"beatmaps"`
}

type BeatmapRequest struct {
	BeatmapsetID   int64    `json:"beatmapset_id"`
	Title          string   `json:"title"`
	Artist         string   `json:"artist"`
	Creator        string   `json:"creator"`
	BPM            float64  `json:"bpm"`
	Keys           int      `json:"keys"`
	StarRating     *float64 `json:"star_rating"`
	DifficultyName string   `json:"difficulty_name"`
	Status         string   `json:"status"`
}

func generateShareCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func getUserClaims(c *fiber.Ctx) (*middleware.UserClaims, error) {
	val := c.Locals("user")
	if val == nil {
		return nil, errors.New("no user in context")
	}
	claims, ok := val.(*middleware.UserClaims)
	if !ok || claims == nil {
		return nil, errors.New("invalid user claims")
	}
	return claims, nil
}

func truncate(s string, max int) string {
	if len(s) > max {
		return s[:max]
	}
	return s
}

func (h *PackHandler) getOrCreateUser(claims *middleware.UserClaims) (*models.User, error) {
	return getOrCreateUser(h.db, claims)
}

func getOrCreateUser(db *gorm.DB, claims *middleware.UserClaims) (*models.User, error) {
	var user models.User
	err := db.Where("osu_id = ?", claims.OsuID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = models.User{
			OsuID:       claims.OsuID,
			Username:    claims.Username,
			CountryCode: claims.CountryCode,
			AvatarURL:   claims.AvatarURL,
		}
		if err := db.Create(&user).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// Update profile if changed
		updates := map[string]interface{}{}
		if user.Username != claims.Username {
			updates["username"] = claims.Username
		}
		if user.CountryCode != claims.CountryCode {
			updates["country_code"] = claims.CountryCode
		}
		if user.AvatarURL != claims.AvatarURL {
			updates["avatar_url"] = claims.AvatarURL
		}
		if len(updates) > 0 {
			db.Model(&user).Updates(updates)
		}
	}
	return &user, nil
}

func (h *PackHandler) GetPack(c *fiber.Ctx) error {
	code := c.Params("code")

	var pack models.Pack
	err := h.db.Preload("Beatmaps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("User").Where("share_code = ?", code).First(&pack).Error

	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "pack not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	// Increment view count (fire and forget, but don't use goroutine to avoid connection leaks)
	h.db.Model(&models.Pack{}).Where("id = ?", pack.ID).Update("views", gorm.Expr("views + 1"))

	return c.JSON(fiber.Map{
		"id":          pack.ID,
		"share_code":  pack.ShareCode,
		"name":        pack.Name,
		"description": pack.Description,
		"views":       pack.Views + 1,
		"user": fiber.Map{
			"id":           pack.User.ID,
			"osu_id":       pack.User.OsuID,
			"username":     pack.User.Username,
			"country_code": pack.User.CountryCode,
			"avatar_url":   pack.User.AvatarURL,
		},
		"beatmaps":   pack.Beatmaps,
		"created_at": pack.CreatedAt,
		"updated_at": pack.UpdatedAt,
	})
}

func (h *PackHandler) CreatePack(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if !claims.HasPermission("create") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "access key lacks 'create' permission"})
	}

	var req CreatePackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "pack name is required",
		})
	}
	if len(name) > maxNameLength {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("pack name must be under %d characters", maxNameLength),
		})
	}

	description := strings.TrimSpace(req.Description)
	if len(description) > maxDescriptionLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("description must be under %d characters", maxDescriptionLen),
		})
	}

	if len(req.Beatmaps) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "at least one beatmap is required",
		})
	}
	if len(req.Beatmaps) > maxBeatmapsPerPack {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("maximum %d beatmaps per pack", maxBeatmapsPerPack),
		})
	}

	user, err := h.getOrCreateUser(claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get or create user",
		})
	}

	// Generate unique share code with retry limit
	var shareCode string
	for i := 0; i < maxShareCodeRetry; i++ {
		code, err := generateShareCode()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "failed to generate share code",
			})
		}
		var existing models.Pack
		if err := h.db.Where("share_code = ?", code).First(&existing).Error; err == gorm.ErrRecordNotFound {
			shareCode = code
			break
		} else if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "database error",
			})
		}
	}
	if shareCode == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to generate unique share code",
		})
	}

	// Use a transaction for pack + beatmaps
	var pack models.Pack
	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		pack = models.Pack{
			ShareCode:   shareCode,
			Name:        name,
			Description: description,
			UserID:      user.ID,
		}

		if err := tx.Create(&pack).Error; err != nil {
			return err
		}

		beatmaps := make([]models.PackBeatmap, len(req.Beatmaps))
		for i, bm := range req.Beatmaps {
			beatmaps[i] = models.PackBeatmap{
				PackID:         pack.ID,
				BeatmapID:      bm.BeatmapsetID,
				Title:          truncate(bm.Title, maxFieldLength),
				Artist:         truncate(bm.Artist, maxFieldLength),
				Creator:        truncate(bm.Creator, maxFieldLength),
				BPM:            bm.BPM,
				Keys:           bm.Keys,
				StarRating:     bm.StarRating,
				DifficultyName: truncate(bm.DifficultyName, maxFieldLength),
				Status:         truncate(bm.Status, 50),
				SortOrder:      i,
			}
		}
		if err := tx.Create(&beatmaps).Error; err != nil {
			return err
		}

		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create pack",
		})
	}

	// Reload with beatmaps
	h.db.Preload("Beatmaps").First(&pack, pack.ID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          pack.ID,
		"share_code":  pack.ShareCode,
		"name":        pack.Name,
		"description": pack.Description,
		"beatmaps":    pack.Beatmaps,
		"created_at":  pack.CreatedAt,
	})
}

func (h *PackHandler) UpdatePack(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if !claims.HasPermission("edit") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "access key lacks 'edit' permission"})
	}

	code := c.Params("code")

	var pack models.Pack
	err = h.db.Preload("User").Where("share_code = ?", code).First(&pack).Error
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "pack not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	if pack.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't own this pack",
		})
	}

	var req CreatePackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	// Validate name if provided
	if req.Name != "" {
		name := strings.TrimSpace(req.Name)
		if len(name) > maxNameLength {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("pack name must be under %d characters", maxNameLength),
			})
		}
		pack.Name = name
	}

	// Only update description if explicitly provided in the JSON
	if req.Description != "" || c.Body() != nil {
		desc := strings.TrimSpace(req.Description)
		if len(desc) > maxDescriptionLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("description must be under %d characters", maxDescriptionLen),
			})
		}
		pack.Description = desc
	}

	if len(req.Beatmaps) > maxBeatmapsPerPack {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("maximum %d beatmaps per pack", maxBeatmapsPerPack),
		})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&pack).Error; err != nil {
			return err
		}

		if len(req.Beatmaps) > 0 {
			if err := tx.Where("pack_id = ?", pack.ID).Delete(&models.PackBeatmap{}).Error; err != nil {
				return err
			}

			beatmaps := make([]models.PackBeatmap, len(req.Beatmaps))
			for i, bm := range req.Beatmaps {
				beatmaps[i] = models.PackBeatmap{
					PackID:         pack.ID,
					BeatmapID:      bm.BeatmapsetID,
					Title:          truncate(bm.Title, maxFieldLength),
					Artist:         truncate(bm.Artist, maxFieldLength),
					Creator:        truncate(bm.Creator, maxFieldLength),
					BPM:            bm.BPM,
					Keys:           bm.Keys,
					StarRating:     bm.StarRating,
					DifficultyName: truncate(bm.DifficultyName, maxFieldLength),
					Status:         truncate(bm.Status, 50),
					SortOrder:      i,
				}
			}
			if err := tx.Create(&beatmaps).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update pack",
		})
	}

	// Reload
	h.db.Preload("Beatmaps").First(&pack, pack.ID)

	return c.JSON(fiber.Map{
		"id":          pack.ID,
		"share_code":  pack.ShareCode,
		"name":        pack.Name,
		"description": pack.Description,
		"beatmaps":    pack.Beatmaps,
		"updated_at":  pack.UpdatedAt,
	})
}

func (h *PackHandler) DeletePack(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if !claims.HasPermission("delete") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "access key lacks 'delete' permission"})
	}

	code := c.Params("code")

	var pack models.Pack
	err = h.db.Preload("User").Where("share_code = ?", code).First(&pack).Error
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "pack not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	if pack.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't own this pack",
		})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("pack_id = ?", pack.ID).Delete(&models.PackBeatmap{}).Error; err != nil {
			return err
		}
		return tx.Delete(&pack).Error
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete pack",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *PackHandler) GetMyPacks(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var user models.User
	err = h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return c.JSON([]fiber.Map{})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var packs []models.Pack
	if err := h.db.Preload("Beatmaps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Where("user_id = ?", user.ID).Order("created_at DESC").
		Offset(offset).Limit(limit).Find(&packs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	result := make([]fiber.Map, len(packs))
	for i, pack := range packs {
		result[i] = fiber.Map{
			"id":          pack.ID,
			"share_code":  pack.ShareCode,
			"name":        pack.Name,
			"description": pack.Description,
			"views":       pack.Views,
			"beatmaps":    pack.Beatmaps,
			"created_at":  pack.CreatedAt,
			"updated_at":  pack.UpdatedAt,
		}
	}

	return c.JSON(result)
}

func (h *PackHandler) ListUsers(c *fiber.Ctx) error {
	type userResult struct {
		ID          uint   `json:"id"`
		Username    string `json:"username"`
		AvatarURL   string `json:"avatar_url"`
		CountryCode string `json:"country_code"`
		PackCount   int64  `json:"pack_count"`
	}

	var users []userResult
	err := h.db.Model(&models.User{}).
		Select("users.id, users.username, users.avatar_url, users.country_code, COUNT(packs.id) as pack_count").
		Joins("LEFT JOIN packs ON packs.user_id = users.id").
		Group("users.id").
		Having("COUNT(packs.id) > 0").
		Order("pack_count DESC").
		Find(&users).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	return c.JSON(users)
}

func (h *PackHandler) BrowsePacks(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	sort := c.Query("sort", "recent")
	search := c.Query("search", "")
	userID := c.QueryInt("user_id", 0)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var packs []models.Pack
	query := h.db.Preload("Beatmaps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("User")

	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern)
	}

	switch sort {
	case "popular":
		query = query.Order("views DESC, created_at DESC")
	case "views":
		query = query.Order("views DESC")
	default:
		query = query.Order("created_at DESC")
	}

	var total int64
	countQuery := h.db.Model(&models.Pack{})
	if userID > 0 {
		countQuery = countQuery.Where("user_id = ?", userID)
	}
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	if err := query.Offset(offset).Limit(limit).Find(&packs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	result := make([]fiber.Map, len(packs))
	for i, pack := range packs {
		beatmapsetIDs := make([]int64, len(pack.Beatmaps))
		for j, bm := range pack.Beatmaps {
			beatmapsetIDs[j] = bm.BeatmapID
		}

		result[i] = fiber.Map{
			"id":            pack.ID,
			"share_code":    pack.ShareCode,
			"name":          pack.Name,
			"description":   pack.Description,
			"views":         pack.Views,
			"user": fiber.Map{
				"id":           pack.User.ID,
				"osu_id":       pack.User.OsuID,
				"username":     pack.User.Username,
				"country_code": pack.User.CountryCode,
				"avatar_url":   pack.User.AvatarURL,
			},
			"beatmap_count":  len(pack.Beatmaps),
			"beatmapset_ids": beatmapsetIDs,
			"created_at":     pack.CreatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"packs": result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
