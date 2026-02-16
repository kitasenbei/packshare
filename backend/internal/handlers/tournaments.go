package handlers

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/packshare/backend/internal/models"
	"gorm.io/gorm"
)

const (
	maxTournamentNameLen  = 200
	maxAbbreviationLen    = 50
	maxStageNameLen       = 100
	maxStagesPerTourney   = 20
	maxMapsPerStage       = 50
	maxURLLen             = 2000
)

var abbreviationRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9-]*$`)

var validFormats = map[string]bool{
	"1v1": true, "2v2": true, "3v3": true, "4v4": true,
}

var validStatuses = map[string]bool{
	"upcoming": true, "live": true, "completed": true,
}

var validSlotTypes = map[string]bool{
	"RC": true, "LN": true, "HB": true, "TECH": true,
	"JACK": true, "SPEED": true, "STAM": true, "SV": true, "TB": true,
}

var validMods = map[string]bool{
	"NM": true, "HD": true, "HR": true, "DT": true, "FM": true, "FL": true,
}

// isValidModCombo checks if a mod string is a valid single mod or combination (e.g. "HDDT", "HDHR").
func isValidModCombo(mod string) bool {
	if validMods[mod] {
		return true
	}
	if len(mod) < 4 || len(mod)%2 != 0 {
		return false
	}
	seen := make(map[string]bool)
	for i := 0; i < len(mod); i += 2 {
		part := mod[i : i+2]
		if !validMods[part] || seen[part] {
			return false
		}
		seen[part] = true
	}
	return true
}

type TournamentHandler struct {
	db *gorm.DB
}

func NewTournamentHandler(db *gorm.DB) *TournamentHandler {
	return &TournamentHandler{db: db}
}

type CreateTournamentRequest struct {
	Name         string                `json:"name"`
	Abbreviation string                `json:"abbreviation"`
	Format       string                `json:"format"`
	BannerURL    string                `json:"banner_url"`
	LogoURL      string                `json:"logo_url"`
	Stages       []CreateStageRequest  `json:"stages"`
}

type CreateStageRequest struct {
	Name string `json:"name"`
}

type UpdateTournamentRequest struct {
	Name      string `json:"name"`
	BannerURL string `json:"banner_url"`
	LogoURL   string `json:"logo_url"`
	Status    string `json:"status"`
}

type AddMapRequest struct {
	SlotType       string   `json:"slot_type"`
	Mod            string   `json:"mod"`
	BeatmapsetID   int64    `json:"beatmapset_id"`
	Title          string   `json:"title"`
	Artist         string   `json:"artist"`
	Creator        string   `json:"creator"`
	Keys           int      `json:"keys"`
	StarRating     *float64 `json:"star_rating"`
	DifficultyName string   `json:"difficulty_name"`
}

func (h *TournamentHandler) getTournamentByAbbrev(abbrev string) (*models.Tournament, error) {
	var tournament models.Tournament
	err := h.db.Preload("User").Where("abbreviation = ?", abbrev).First(&tournament).Error
	return &tournament, err
}

func (h *TournamentHandler) CreateTournament(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreateTournamentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tournament name is required"})
	}
	if len(name) > maxTournamentNameLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("name must be under %d characters", maxTournamentNameLen)})
	}

	abbrev := strings.TrimSpace(req.Abbreviation)
	if abbrev == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "abbreviation is required"})
	}
	if len(abbrev) > maxAbbreviationLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("abbreviation must be under %d characters", maxAbbreviationLen)})
	}
	if !abbreviationRegex.MatchString(abbrev) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "abbreviation must be alphanumeric with hyphens only"})
	}

	if !validFormats[req.Format] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format must be one of: 1v1, 2v2, 3v3, 4v4"})
	}

	if len(req.Stages) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "at least one stage is required"})
	}
	if len(req.Stages) > maxStagesPerTourney {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("maximum %d stages", maxStagesPerTourney)})
	}

	for _, s := range req.Stages {
		stageName := strings.TrimSpace(s.Name)
		if stageName == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stage name cannot be empty"})
		}
		if len(stageName) > maxStageNameLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("stage name must be under %d characters", maxStageNameLen)})
		}
	}

	if len(req.BannerURL) > maxURLLen || len(req.LogoURL) > maxURLLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "URL too long"})
	}

	user, err := getOrCreateUser(h.db, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get or create user"})
	}

	var tournament models.Tournament
	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		tournament = models.Tournament{
			Name:         name,
			Abbreviation: strings.ToLower(abbrev),
			Format:       req.Format,
			BannerURL:    truncate(req.BannerURL, maxURLLen),
			LogoURL:      truncate(req.LogoURL, maxURLLen),
			Status:       "upcoming",
			UserID:       user.ID,
		}

		if err := tx.Create(&tournament).Error; err != nil {
			if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "UNIQUE") {
				return fmt.Errorf("DUPLICATE")
			}
			return err
		}

		stages := make([]models.TournamentStage, len(req.Stages))
		for i, s := range req.Stages {
			stages[i] = models.TournamentStage{
				TournamentID: tournament.ID,
				Name:         strings.TrimSpace(s.Name),
				SortOrder:    i,
			}
		}
		return tx.Create(&stages).Error
	})

	if txErr != nil {
		if txErr.Error() == "DUPLICATE" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "abbreviation already taken"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create tournament"})
	}

	// Reload with stages
	h.db.Preload("Stages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("User").First(&tournament, tournament.ID)

	return c.Status(fiber.StatusCreated).JSON(tournament)
}

func (h *TournamentHandler) GetTournament(c *fiber.Ctx) error {
	abbrev := c.Params("abbrev")

	var tournament models.Tournament
	err := h.db.Preload("User").Preload("Stages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Stages.Maps", func(db *gorm.DB) *gorm.DB {
		return db.Order("slot_type ASC, slot_number ASC")
	}).Where("abbreviation = ?", abbrev).First(&tournament).Error

	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(tournament)
}

func (h *TournamentHandler) ListTournaments(c *fiber.Ctx) error {
	status := c.Query("status", "")

	query := h.db.Preload("User").Preload("Stages", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	})

	if status != "" && validStatuses[status] {
		query = query.Where("status = ?", status)
	}

	var tournaments []models.Tournament
	if err := query.Order("created_at DESC").Find(&tournaments).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(tournaments)
}

func (h *TournamentHandler) UpdateTournament(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournamentByAbbrev(abbrev)
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	var req UpdateTournamentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if name := strings.TrimSpace(req.Name); name != "" {
		if len(name) > maxTournamentNameLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("name must be under %d characters", maxTournamentNameLen)})
		}
		tournament.Name = name
	}

	if req.BannerURL != "" {
		if len(req.BannerURL) > maxURLLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "URL too long"})
		}
		tournament.BannerURL = req.BannerURL
	}

	if req.LogoURL != "" {
		if len(req.LogoURL) > maxURLLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "URL too long"})
		}
		tournament.LogoURL = req.LogoURL
	}

	if req.Status != "" {
		if !validStatuses[req.Status] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status must be one of: upcoming, live, completed"})
		}
		tournament.Status = req.Status
	}

	if err := h.db.Save(tournament).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update tournament"})
	}

	return c.JSON(tournament)
}

func (h *TournamentHandler) DeleteTournament(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournamentByAbbrev(abbrev)
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		// Delete maps via stages
		var stageIDs []uint
		tx.Model(&models.TournamentStage{}).Where("tournament_id = ?", tournament.ID).Pluck("id", &stageIDs)
		if len(stageIDs) > 0 {
			if err := tx.Where("stage_id IN ?", stageIDs).Delete(&models.TournamentMap{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentStage{}).Error; err != nil {
			return err
		}
		return tx.Delete(tournament).Error
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete tournament"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TournamentHandler) AddMapToStage(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournamentByAbbrev(abbrev)
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	stageID, err := c.ParamsInt("stageId")
	if err != nil || stageID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stage ID"})
	}

	// Verify stage belongs to this tournament
	var stage models.TournamentStage
	if err := h.db.Where("id = ? AND tournament_id = ?", stageID, tournament.ID).First(&stage).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "stage not found"})
	}

	var req AddMapRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if !validSlotTypes[req.SlotType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid slot type"})
	}
	if !isValidModCombo(req.Mod) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid mod"})
	}
	if req.BeatmapsetID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "beatmapset_id is required"})
	}
	if strings.TrimSpace(req.Title) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title is required"})
	}

	// Check map count for this stage
	var mapCount int64
	h.db.Model(&models.TournamentMap{}).Where("stage_id = ?", stageID).Count(&mapCount)
	if mapCount >= int64(maxMapsPerStage) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("maximum %d maps per stage", maxMapsPerStage)})
	}

	// Auto-calculate slot number
	var maxSlotNum int
	h.db.Model(&models.TournamentMap{}).Where("stage_id = ? AND slot_type = ?", stageID, req.SlotType).
		Select("COALESCE(MAX(slot_number), 0)").Scan(&maxSlotNum)

	tournamentMap := models.TournamentMap{
		StageID:        uint(stageID),
		SlotType:       req.SlotType,
		Mod:            req.Mod,
		SlotNumber:     maxSlotNum + 1,
		BeatmapsetID:   req.BeatmapsetID,
		Title:          truncate(strings.TrimSpace(req.Title), maxFieldLength),
		Artist:         truncate(strings.TrimSpace(req.Artist), maxFieldLength),
		Creator:        truncate(strings.TrimSpace(req.Creator), maxFieldLength),
		Keys:           req.Keys,
		StarRating:     req.StarRating,
		DifficultyName: truncate(strings.TrimSpace(req.DifficultyName), maxFieldLength),
	}

	if err := h.db.Create(&tournamentMap).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add map"})
	}

	return c.Status(fiber.StatusCreated).JSON(tournamentMap)
}

func (h *TournamentHandler) RemoveMapFromStage(c *fiber.Ctx) error {
	claims, err := getUserClaims(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	abbrev := c.Params("abbrev")
	tournament, err := h.getTournamentByAbbrev(abbrev)
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if tournament.User.OsuID != claims.OsuID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "you don't own this tournament"})
	}

	mapID, err := c.ParamsInt("mapId")
	if err != nil || mapID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid map ID"})
	}

	// Find the map and verify it belongs to this tournament
	var tournamentMap models.TournamentMap
	err = h.db.First(&tournamentMap, mapID).Error
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "map not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	// Verify stage belongs to this tournament
	var stage models.TournamentStage
	if err := h.db.Where("id = ? AND tournament_id = ?", tournamentMap.StageID, tournament.ID).First(&stage).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "map does not belong to this tournament"})
	}

	slotType := tournamentMap.SlotType
	stageID := tournamentMap.StageID

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&tournamentMap).Error; err != nil {
			return err
		}

		// Renumber remaining maps of same slot type in this stage
		var remaining []models.TournamentMap
		tx.Where("stage_id = ? AND slot_type = ?", stageID, slotType).
			Order("slot_number ASC").Find(&remaining)

		for i, m := range remaining {
			if m.SlotNumber != i+1 {
				tx.Model(&m).Update("slot_number", i+1)
			}
		}

		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove map"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
