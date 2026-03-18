package handlers

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/packshare/backend/internal/models"
	"gorm.io/gorm"
)

const (
	maxSiteConfigLen = 500000
	maxSubdomainLen  = 63
)

var subdomainRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)

var reservedSubdomains = map[string]bool{
	"www": true, "api": true, "app": true, "admin": true,
	"staging": true, "prod": true, "mail": true, "ftp": true,
}

type SiteHandler struct {
	db *gorm.DB
}

func NewSiteHandler(db *gorm.DB) *SiteHandler {
	return &SiteHandler{db: db}
}

// ── Public: Get site by subdomain (for renderer) ──

func (h *SiteHandler) GetSiteBySubdomain(c *fiber.Ctx) error {
	subdomain := strings.ToLower(strings.TrimSpace(c.Params("subdomain")))
	if subdomain == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subdomain is required"})
	}

	var site models.TournamentSite
	if err := h.db.Where("subdomain = ? AND published = ?", subdomain, true).First(&site).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "site not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	// Load tournament data for the renderer
	var tournament models.Tournament
	if err := h.db.Preload("User").Preload("Stages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Stages.Maps", func(db *gorm.DB) *gorm.DB {
		return db.Order("slot_type ASC, slot_number ASC")
	}).Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seed ASC")
	}).Preload("Announcements", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(&tournament, site.TournamentID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{
		"site":       site,
		"tournament": tournament,
	})
}

// ── Owner: Get site config ──

func (h *SiteHandler) GetSite(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournament(abbrev)
	if err != nil {
		return h.tournamentError(c, err)
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	var site models.TournamentSite
	if err := h.db.Where("tournament_id = ?", tournament.ID).First(&site).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return empty site config with defaults
			return c.JSON(fiber.Map{
				"site": nil,
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{"site": site})
}

// ── Owner: Create or update site config ──

type SaveSiteRequest struct {
	Subdomain string `json:"subdomain"`
	Config    string `json:"config"`
}

func (h *SiteHandler) SaveSite(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournament(abbrev)
	if err != nil {
		return h.tournamentError(c, err)
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	var req SaveSiteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Validate config JSON
	if req.Config == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "config is required"})
	}
	if len(req.Config) > maxSiteConfigLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "config too large"})
	}
	if !json.Valid([]byte(req.Config)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "config must be valid JSON"})
	}

	// Validate subdomain
	subdomain := strings.ToLower(strings.TrimSpace(req.Subdomain))
	if subdomain != "" {
		if len(subdomain) > maxSubdomainLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("subdomain must be under %d characters", maxSubdomainLen)})
		}
		if len(subdomain) < 3 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subdomain must be at least 3 characters"})
		}
		if !subdomainRegex.MatchString(subdomain) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subdomain must be lowercase alphanumeric with hyphens"})
		}
		if reservedSubdomains[subdomain] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subdomain is reserved"})
		}

		// Check uniqueness (excluding this tournament's site)
		var count int64
		if err := h.db.Model(&models.TournamentSite{}).Where("subdomain = ? AND tournament_id != ?", subdomain, tournament.ID).Count(&count).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
		}
		if count > 0 {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "subdomain already taken"})
		}
	}

	// Upsert
	var site models.TournamentSite
	err = h.db.Where("tournament_id = ?", tournament.ID).First(&site).Error

	if err == gorm.ErrRecordNotFound {
		site = models.TournamentSite{
			TournamentID: tournament.ID,
			Subdomain:    subdomain,
			Config:       req.Config,
			Published:    false,
		}
		if err := h.db.Create(&site).Error; err != nil {
			errMsg := strings.ToLower(err.Error())
			if strings.Contains(errMsg, "duplicate") || strings.Contains(errMsg, "unique") {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "subdomain already taken"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create site"})
		}
		return c.Status(fiber.StatusCreated).JSON(site)
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	// Update existing
	site.Config = req.Config
	if subdomain != "" {
		site.Subdomain = subdomain
	}

	if err := h.db.Save(&site).Error; err != nil {
		errMsg := strings.ToLower(err.Error())
		if strings.Contains(errMsg, "duplicate") || strings.Contains(errMsg, "unique") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "subdomain already taken"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update site"})
	}

	return c.JSON(site)
}

// ── Owner: Publish / unpublish ──

type PublishRequest struct {
	Published bool `json:"published"`
}

func (h *SiteHandler) PublishSite(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournament(abbrev)
	if err != nil {
		return h.tournamentError(c, err)
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	var req PublishRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var site models.TournamentSite
	if err := h.db.Where("tournament_id = ?", tournament.ID).First(&site).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "no site configured yet"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if req.Published && site.Subdomain == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "set a subdomain before publishing"})
	}

	site.Published = req.Published
	if err := h.db.Save(&site).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update site"})
	}

	return c.JSON(site)
}

// ── Owner: Delete site ──

func (h *SiteHandler) DeleteSite(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournament(abbrev)
	if err != nil {
		return h.tournamentError(c, err)
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	if err := h.db.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentSite{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete site"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// ── Helpers ──

func (h *SiteHandler) getTournament(abbrev string) (*models.Tournament, error) {
	var tournament models.Tournament
	err := h.db.Preload("User").Where("abbreviation = ?", abbrev).First(&tournament).Error
	return &tournament, err
}

func (h *SiteHandler) tournamentError(c *fiber.Ctx, err error) error {
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
}
