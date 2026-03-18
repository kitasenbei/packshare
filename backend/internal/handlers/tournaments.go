package handlers

import (
	"fmt"
	"net/url"
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
	maxPlayersPerTourney  = 128
	maxAnnouncementsPerTourney = 100
	maxAnnouncementTitleLen    = 200
	maxAnnouncementBodyLen     = 10000
	maxBracketDataLen          = 100000
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

func isValidURL(raw string) bool {
	if raw == "" {
		return true
	}
	u, err := url.Parse(raw)
	return err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != ""
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
	Name        string `json:"name"`
	BannerURL   string `json:"banner_url"`
	LogoURL     string `json:"logo_url"`
	Status      string `json:"status"`
	SlotConfigs string `json:"slot_configs"`
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
	if !isValidURL(req.BannerURL) || !isValidURL(req.LogoURL) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid URL: must be http or https"})
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
			errMsg := strings.ToLower(err.Error())
			if strings.Contains(errMsg, "duplicate") || strings.Contains(errMsg, "unique") {
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
	}).Preload("Players", func(db *gorm.DB) *gorm.DB {
		return db.Order("seed ASC")
	}).Preload("Announcements", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
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
		if !isValidURL(req.BannerURL) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid URL: must be http or https"})
		}
		tournament.BannerURL = req.BannerURL
	}

	if req.LogoURL != "" {
		if len(req.LogoURL) > maxURLLen {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "URL too long"})
		}
		if !isValidURL(req.LogoURL) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid URL: must be http or https"})
		}
		tournament.LogoURL = req.LogoURL
	}

	if req.Status != "" {
		if !validStatuses[req.Status] {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status must be one of: upcoming, live, completed"})
		}
		tournament.Status = req.Status
	}

	if req.SlotConfigs != "" {
		if len(req.SlotConfigs) > 10000 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slot_configs too large"})
		}
		tournament.SlotConfigs = req.SlotConfigs
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
		if err := tx.Model(&models.TournamentStage{}).Where("tournament_id = ?", tournament.ID).Pluck("id", &stageIDs).Error; err != nil {
			return err
		}
		if len(stageIDs) > 0 {
			if err := tx.Where("stage_id IN ?", stageIDs).Delete(&models.TournamentMap{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentStage{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentPlayer{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentAnnouncement{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentSite{}).Error; err != nil {
			return err
		}
		return tx.Delete(tournament).Error
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete tournament"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TournamentHandler) AddStage(c *fiber.Ctx) error {
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

	var req CreateStageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stage name is required"})
	}

	var stage models.TournamentStage
	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		var stageCount int64
		if err := tx.Model(&models.TournamentStage{}).Where("tournament_id = ?", tournament.ID).Count(&stageCount).Error; err != nil {
			return err
		}
		if stageCount >= int64(maxStagesPerTourney) {
			return fmt.Errorf("maximum %d stages", maxStagesPerTourney)
		}

		var maxSort int
		if err := tx.Model(&models.TournamentStage{}).Where("tournament_id = ?", tournament.ID).Select("COALESCE(MAX(sort_order), -1)").Scan(&maxSort).Error; err != nil {
			return err
		}

		stage = models.TournamentStage{
			TournamentID: tournament.ID,
			Name:         name,
			SortOrder:    maxSort + 1,
		}

		return tx.Create(&stage).Error
	})

	if txErr != nil {
		if txErr.Error() == fmt.Sprintf("maximum %d stages", maxStagesPerTourney) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": txErr.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create stage"})
	}

	return c.Status(fiber.StatusCreated).JSON(stage)
}

func (h *TournamentHandler) RenameStage(c *fiber.Ctx) error {
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

	stageId, err := c.ParamsInt("stageId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stage ID"})
	}

	var req CreateStageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "stage name is required"})
	}
	if len(name) > maxStageNameLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("stage name must be under %d characters", maxStageNameLen)})
	}

	var stage models.TournamentStage
	if err := h.db.Where("id = ? AND tournament_id = ?", stageId, tournament.ID).First(&stage).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "stage not found"})
	}

	stage.Name = name
	if err := h.db.Save(&stage).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to rename stage"})
	}

	return c.JSON(stage)
}

func (h *TournamentHandler) DeleteStage(c *fiber.Ctx) error {
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

	stageId, err := c.ParamsInt("stageId")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stage ID"})
	}

	var stage models.TournamentStage
	if err := h.db.Where("id = ? AND tournament_id = ?", stageId, tournament.ID).First(&stage).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "stage not found"})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("stage_id = ?", stage.ID).Delete(&models.TournamentMap{}).Error; err != nil {
			return err
		}
		return tx.Delete(&stage).Error
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete stage"})
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

	req.SlotType = strings.TrimSpace(req.SlotType)
	if req.SlotType == "" || len(req.SlotType) > 20 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slot_type is required and must be under 20 characters"})
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
	if err := h.db.Model(&models.TournamentMap{}).Where("stage_id = ?", stageID).Count(&mapCount).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if mapCount >= int64(maxMapsPerStage) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("maximum %d maps per stage", maxMapsPerStage)})
	}

	// Auto-calculate slot number
	var maxSlotNum int
	if err := h.db.Model(&models.TournamentMap{}).Where("stage_id = ? AND slot_type = ?", stageID, req.SlotType).
		Select("COALESCE(MAX(slot_number), 0)").Scan(&maxSlotNum).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

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
		if err := tx.Where("stage_id = ? AND slot_type = ?", stageID, slotType).
			Order("slot_number ASC").Find(&remaining).Error; err != nil {
			return err
		}

		for i, m := range remaining {
			if m.SlotNumber != i+1 {
				if err := tx.Model(&m).Update("slot_number", i+1).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove map"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

type UpdateMapRequest struct {
	SlotType string `json:"slot_type"`
	Mod      string `json:"mod"`
}

func (h *TournamentHandler) UpdateMap(c *fiber.Ctx) error {
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

	var tournamentMap models.TournamentMap
	if err := h.db.First(&tournamentMap, mapID).Error; err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "map not found"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	var stage models.TournamentStage
	if err := h.db.Where("id = ? AND tournament_id = ?", tournamentMap.StageID, tournament.ID).First(&stage).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "map does not belong to this tournament"})
	}

	var req UpdateMapRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	updates := map[string]interface{}{}
	needsSlotReassign := false

	if req.SlotType != "" {
		req.SlotType = strings.TrimSpace(req.SlotType)
		if len(req.SlotType) > 20 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "slot_type must be under 20 characters"})
		}
		if req.SlotType != tournamentMap.SlotType {
			needsSlotReassign = true
			updates["slot_type"] = req.SlotType
		}
	}

	if req.Mod != "" {
		if !isValidModCombo(req.Mod) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid mod"})
		}
		updates["mod"] = req.Mod
	}

	if len(updates) == 0 {
		return c.JSON(tournamentMap)
	}

	if needsSlotReassign {
		txErr := h.db.Transaction(func(tx *gorm.DB) error {
			var maxSlotNum int
			if err := tx.Model(&models.TournamentMap{}).Where("stage_id = ? AND slot_type = ?", tournamentMap.StageID, req.SlotType).
				Select("COALESCE(MAX(slot_number), 0)").Scan(&maxSlotNum).Error; err != nil {
				return err
			}
			updates["slot_number"] = maxSlotNum + 1
			return tx.Model(&tournamentMap).Updates(updates).Error
		})
		if txErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update map"})
		}
	} else {
		if err := h.db.Model(&tournamentMap).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update map"})
		}
	}

	if err := h.db.First(&tournamentMap, mapID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	return c.JSON(tournamentMap)
}

// ── Players ──

type AddPlayerRequest struct {
	OsuID   int64  `json:"osu_id"`
	Name    string `json:"name"`
	Discord string `json:"discord"`
}

type BulkPlayersRequest struct {
	Players []AddPlayerRequest `json:"players"`
}

type UpdatePlayerRequest struct {
	Name    string `json:"name"`
	Discord string `json:"discord"`
	Seed    *int   `json:"seed"`
}

func (h *TournamentHandler) AddPlayer(c *fiber.Ctx) error {
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

	var req AddPlayerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.OsuID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "osu_id is required"})
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = fmt.Sprintf("Player %d", req.OsuID)
	}

	var player models.TournamentPlayer
	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		// Check duplicate
		var count int64
		if err := tx.Model(&models.TournamentPlayer{}).Where("tournament_id = ? AND osu_id = ?", tournament.ID, req.OsuID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("player already in roster")
		}

		// Check limit
		var total int64
		if err := tx.Model(&models.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Count(&total).Error; err != nil {
			return err
		}
		if total >= maxPlayersPerTourney {
			return fmt.Errorf("maximum %d players", maxPlayersPerTourney)
		}

		player = models.TournamentPlayer{
			TournamentID: tournament.ID,
			OsuID:        req.OsuID,
			Name:         truncate(name, maxFieldLength),
			Seed:         int(total) + 1,
			Discord:      truncate(strings.TrimSpace(req.Discord), maxFieldLength),
		}

		return tx.Create(&player).Error
	})

	if txErr != nil {
		if txErr.Error() == "player already in roster" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": txErr.Error()})
		}
		if txErr.Error() == fmt.Sprintf("maximum %d players", maxPlayersPerTourney) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": txErr.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add player"})
	}

	return c.Status(fiber.StatusCreated).JSON(player)
}

func (h *TournamentHandler) BulkAddPlayers(c *fiber.Ctx) error {
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

	var req BulkPlayersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if len(req.Players) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no players provided"})
	}

	var existing int64
	if err := h.db.Model(&models.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Count(&existing).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	if existing+int64(len(req.Players)) > maxPlayersPerTourney {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("would exceed maximum %d players", maxPlayersPerTourney)})
	}

	// Get existing osu IDs to skip duplicates
	var existingIDs []int64
	if err := h.db.Model(&models.TournamentPlayer{}).Where("tournament_id = ?", tournament.ID).Pluck("osu_id", &existingIDs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	existingSet := make(map[int64]bool, len(existingIDs))
	for _, id := range existingIDs {
		existingSet[id] = true
	}

	players := make([]models.TournamentPlayer, 0, len(req.Players))
	seed := int(existing)
	for _, p := range req.Players {
		if p.OsuID <= 0 || existingSet[p.OsuID] {
			continue
		}
		existingSet[p.OsuID] = true
		seed++
		name := strings.TrimSpace(p.Name)
		if name == "" {
			name = fmt.Sprintf("Player %d", p.OsuID)
		}
		players = append(players, models.TournamentPlayer{
			TournamentID: tournament.ID,
			OsuID:        p.OsuID,
			Name:         truncate(name, maxFieldLength),
			Seed:         seed,
			Discord:      truncate(strings.TrimSpace(p.Discord), maxFieldLength),
		})
	}

	if len(players) == 0 {
		return c.JSON([]models.TournamentPlayer{})
	}

	if err := h.db.Create(&players).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to add players"})
	}

	return c.Status(fiber.StatusCreated).JSON(players)
}

func (h *TournamentHandler) UpdatePlayer(c *fiber.Ctx) error {
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

	playerID, err := c.ParamsInt("playerId")
	if err != nil || playerID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid player ID"})
	}

	var player models.TournamentPlayer
	if err := h.db.Where("id = ? AND tournament_id = ?", playerID, tournament.ID).First(&player).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "player not found"})
	}

	var req UpdatePlayerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if name := strings.TrimSpace(req.Name); name != "" {
		player.Name = truncate(name, maxFieldLength)
	}
	player.Discord = truncate(strings.TrimSpace(req.Discord), maxFieldLength)
	if req.Seed != nil && *req.Seed > 0 {
		player.Seed = *req.Seed
	}

	if err := h.db.Save(&player).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update player"})
	}

	return c.JSON(player)
}

func (h *TournamentHandler) RemovePlayer(c *fiber.Ctx) error {
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

	playerID, err := c.ParamsInt("playerId")
	if err != nil || playerID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid player ID"})
	}

	var player models.TournamentPlayer
	if err := h.db.Where("id = ? AND tournament_id = ?", playerID, tournament.ID).First(&player).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "player not found"})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&player).Error; err != nil {
			return err
		}
		// Renumber seeds
		var remaining []models.TournamentPlayer
		if err := tx.Where("tournament_id = ?", tournament.ID).Order("seed ASC").Find(&remaining).Error; err != nil {
			return err
		}
		for i, p := range remaining {
			if p.Seed != i+1 {
				if err := tx.Model(&p).Update("seed", i+1).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to remove player"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *TournamentHandler) ClearPlayers(c *fiber.Ctx) error {
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

	if err := h.db.Where("tournament_id = ?", tournament.ID).Delete(&models.TournamentPlayer{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to clear players"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

type ReorderPlayersRequest struct {
	PlayerIDs []uint `json:"player_ids"`
}

func (h *TournamentHandler) ReorderPlayers(c *fiber.Ctx) error {
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

	var req ReorderPlayersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	txErr := h.db.Transaction(func(tx *gorm.DB) error {
		for i, pid := range req.PlayerIDs {
			if err := tx.Model(&models.TournamentPlayer{}).
				Where("id = ? AND tournament_id = ?", pid, tournament.ID).
				Update("seed", i+1).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if txErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reorder players"})
	}

	var players []models.TournamentPlayer
	h.db.Where("tournament_id = ?", tournament.ID).Order("seed ASC").Find(&players)
	return c.JSON(players)
}

// ── Bracket ──

func (h *TournamentHandler) GetBracket(c *fiber.Ctx) error {
	abbrev := c.Params("abbrev")
	tournament, err := h.getTournamentByAbbrev(abbrev)
	if err == gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tournament not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}

	return c.JSON(fiber.Map{"bracket_data": tournament.BracketData})
}

type SaveBracketRequest struct {
	BracketData string `json:"bracket_data"`
}

func (h *TournamentHandler) SaveBracket(c *fiber.Ctx) error {
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

	var req SaveBracketRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if len(req.BracketData) > maxBracketDataLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bracket data too large"})
	}

	tournament.BracketData = req.BracketData
	if err := h.db.Model(tournament).Update("bracket_data", req.BracketData).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save bracket"})
	}

	return c.JSON(fiber.Map{"bracket_data": tournament.BracketData})
}

// ── Announcements ──

type CreateAnnouncementRequest struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Image string `json:"image"`
}

func (h *TournamentHandler) CreateAnnouncement(c *fiber.Ctx) error {
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

	var req CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title is required"})
	}
	if len(title) > maxAnnouncementTitleLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("title must be under %d characters", maxAnnouncementTitleLen)})
	}
	if len(req.Body) > maxAnnouncementBodyLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "body too long"})
	}
	if req.Image != "" && !isValidURL(req.Image) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid image URL"})
	}

	var count int64
	if err := h.db.Model(&models.TournamentAnnouncement{}).Where("tournament_id = ?", tournament.ID).Count(&count).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "database error"})
	}
	if count >= maxAnnouncementsPerTourney {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("maximum %d announcements", maxAnnouncementsPerTourney)})
	}

	announcement := models.TournamentAnnouncement{
		TournamentID: tournament.ID,
		Title:        title,
		Body:         strings.TrimSpace(req.Body),
		Image:        truncate(strings.TrimSpace(req.Image), maxURLLen),
	}

	if err := h.db.Create(&announcement).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create announcement"})
	}

	return c.Status(fiber.StatusCreated).JSON(announcement)
}

func (h *TournamentHandler) UpdateAnnouncement(c *fiber.Ctx) error {
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

	annID, err := c.ParamsInt("annId")
	if err != nil || annID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid announcement ID"})
	}

	var ann models.TournamentAnnouncement
	if err := h.db.Where("id = ? AND tournament_id = ?", annID, tournament.ID).First(&ann).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "announcement not found"})
	}

	var req CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title is required"})
	}
	if len(title) > maxAnnouncementTitleLen {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("title must be under %d characters", maxAnnouncementTitleLen)})
	}

	ann.Title = title
	ann.Body = strings.TrimSpace(req.Body)
	ann.Image = truncate(strings.TrimSpace(req.Image), maxURLLen)

	if err := h.db.Save(&ann).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update announcement"})
	}

	return c.JSON(ann)
}

func (h *TournamentHandler) DeleteAnnouncement(c *fiber.Ctx) error {
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

	annID, err := c.ParamsInt("annId")
	if err != nil || annID < 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid announcement ID"})
	}

	var ann models.TournamentAnnouncement
	if err := h.db.Where("id = ? AND tournament_id = ?", annID, tournament.ID).First(&ann).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "announcement not found"})
	}

	if err := h.db.Delete(&ann).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete announcement"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
