package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/packshare/backend/internal/middleware"
	"github.com/packshare/backend/internal/models"
	"gorm.io/gorm"
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
	BeatmapsetID int64   `json:"beatmapset_id"`
	Title        string  `json:"title"`
	Artist       string  `json:"artist"`
	Creator      string  `json:"creator"`
	BPM          float64 `json:"bpm"`
	Keys         int     `json:"keys"`
	Status       string  `json:"status"`
}

func generateShareCode() string {
	b := make([]byte, 6)
	rand.Read(b)
	code := base64.URLEncoding.EncodeToString(b)
	// Remove padding and special chars
	code = strings.ReplaceAll(code, "=", "")
	code = strings.ReplaceAll(code, "-", "")
	code = strings.ReplaceAll(code, "_", "")
	if len(code) > 8 {
		code = code[:8]
	}
	return code
}

func (h *PackHandler) getOrCreateUser(claims *middleware.UserClaims) (*models.User, error) {
	var user models.User
	err := h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = models.User{
			OsuID:       claims.OsuID,
			Username:    claims.Username,
			CountryCode: claims.CountryCode,
			AvatarURL:   claims.AvatarURL,
		}
		if err := h.db.Create(&user).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
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

	// Increment view count
	h.db.Model(&pack).Update("views", gorm.Expr("views + 1"))

	return c.JSON(fiber.Map{
		"id":          pack.ID,
		"share_code":  pack.ShareCode,
		"name":        pack.Name,
		"description": pack.Description,
		"views":       pack.Views,
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
	claims := c.Locals("user").(*middleware.UserClaims)

	var req CreatePackRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "pack name is required",
		})
	}

	if len(req.Beatmaps) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "at least one beatmap is required",
		})
	}

	user, err := h.getOrCreateUser(claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to get or create user",
		})
	}

	// Generate unique share code
	var shareCode string
	for {
		shareCode = generateShareCode()
		var existing models.Pack
		if h.db.Where("share_code = ?", shareCode).First(&existing).Error == gorm.ErrRecordNotFound {
			break
		}
	}

	pack := models.Pack{
		ShareCode:   shareCode,
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		UserID:      user.ID,
	}

	if err := h.db.Create(&pack).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to create pack",
		})
	}

	// Create beatmaps
	for i, bm := range req.Beatmaps {
		beatmap := models.PackBeatmap{
			PackID:    pack.ID,
			BeatmapID: bm.BeatmapsetID,
			Title:     bm.Title,
			Artist:    bm.Artist,
			Creator:   bm.Creator,
			BPM:       bm.BPM,
			Keys:      bm.Keys,
			Status:    bm.Status,
			SortOrder: i,
		}
		h.db.Create(&beatmap)
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
	claims := c.Locals("user").(*middleware.UserClaims)
	code := c.Params("code")

	var pack models.Pack
	err := h.db.Preload("User").Where("share_code = ?", code).First(&pack).Error
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

	// Check ownership
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

	// Update pack fields
	if req.Name != "" {
		pack.Name = strings.TrimSpace(req.Name)
	}
	pack.Description = strings.TrimSpace(req.Description)

	if err := h.db.Save(&pack).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update pack",
		})
	}

	// Update beatmaps if provided
	if len(req.Beatmaps) > 0 {
		// Delete old beatmaps
		h.db.Where("pack_id = ?", pack.ID).Delete(&models.PackBeatmap{})

		// Create new ones
		for i, bm := range req.Beatmaps {
			beatmap := models.PackBeatmap{
				PackID:    pack.ID,
				BeatmapID: bm.BeatmapsetID,
				Title:     bm.Title,
				Artist:    bm.Artist,
				Creator:   bm.Creator,
				BPM:       bm.BPM,
				Keys:      bm.Keys,
				Status:    bm.Status,
				SortOrder: i,
			}
			h.db.Create(&beatmap)
		}
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
	claims := c.Locals("user").(*middleware.UserClaims)
	code := c.Params("code")

	var pack models.Pack
	err := h.db.Preload("User").Where("share_code = ?", code).First(&pack).Error
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

	// Check ownership
	if pack.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "you don't own this pack",
		})
	}

	// Delete beatmaps first (cascade)
	h.db.Where("pack_id = ?", pack.ID).Delete(&models.PackBeatmap{})

	// Delete pack
	if err := h.db.Delete(&pack).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to delete pack",
		})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *PackHandler) GetMyPacks(c *fiber.Ctx) error {
	claims := c.Locals("user").(*middleware.UserClaims)

	var user models.User
	err := h.db.Where("osu_id = ?", claims.OsuID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		// User has no packs yet
		return c.JSON([]fiber.Map{})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "database error",
		})
	}

	var packs []models.Pack
	h.db.Preload("Beatmaps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Where("user_id = ?", user.ID).Order("created_at DESC").Find(&packs)

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

func (h *PackHandler) BrowsePacks(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	sort := c.Query("sort", "recent") // recent, popular, views

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

	// Apply sorting
	switch sort {
	case "popular":
		query = query.Order("views DESC, created_at DESC")
	case "views":
		query = query.Order("views DESC")
	default: // recent
		query = query.Order("created_at DESC")
	}

	// Get total count
	var total int64
	h.db.Model(&models.Pack{}).Count(&total)

	// Get paginated results
	query.Offset(offset).Limit(limit).Find(&packs)

	result := make([]fiber.Map, len(packs))
	for i, pack := range packs {
		result[i] = fiber.Map{
			"id":          pack.ID,
			"share_code":  pack.ShareCode,
			"name":        pack.Name,
			"description": pack.Description,
			"views":       pack.Views,
			"user": fiber.Map{
				"id":           pack.User.ID,
				"osu_id":       pack.User.OsuID,
				"username":     pack.User.Username,
				"country_code": pack.User.CountryCode,
				"avatar_url":   pack.User.AvatarURL,
			},
			"beatmap_count": len(pack.Beatmaps),
			"created_at":    pack.CreatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"packs": result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}
