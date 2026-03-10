package routes

import (
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/packshare/backend/api"
	"github.com/packshare/backend/internal/config"
	"github.com/packshare/backend/internal/handlers"
	"github.com/packshare/backend/internal/middleware"
	"gorm.io/gorm"
)

func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config, s3Client *s3.Client, awsRegion string) {
	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: cfg.AllowedOrigins != "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// OpenAPI spec
	app.Get("/api/docs/openapi.yaml", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/yaml")
		return c.Send(api.OpenAPISpec)
	})

	// Swagger UI (CDN-hosted)
	app.Get("/api/docs", func(c *fiber.Ctx) error {
		c.Set("Content-Type", "text/html")
		return c.SendString(`<!DOCTYPE html>
<html><head><title>PackShare API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:"/api/docs/openapi.yaml",dom_id:"#swagger-ui"})</script>
</body></html>`)
	})

	// Handlers
	packHandler := handlers.NewPackHandler(db)
	keyHandler := handlers.NewAccessKeyHandler(db, cfg.JWTSecret)
	tournamentHandler := handlers.NewTournamentHandler(db)
	siteHandler := handlers.NewSiteHandler(db)

	// API routes
	apiGroup := app.Group("/api")

	// Public routes
	apiGroup.Get("/users", packHandler.ListUsers)
	apiGroup.Get("/packs", packHandler.BrowsePacks)
	apiGroup.Get("/packs/:code", packHandler.GetPack)
	apiGroup.Post("/packs/:code/download/:beatmapsetId", packHandler.TrackDownload)
	apiGroup.Post("/auth/key", keyHandler.KeyLogin)
	apiGroup.Get("/tournaments", tournamentHandler.ListTournaments)
	apiGroup.Get("/tournaments/:abbrev", tournamentHandler.GetTournament)
	apiGroup.Get("/tournaments/:abbrev/bracket", tournamentHandler.GetBracket)
	apiGroup.Get("/sites/:subdomain", siteHandler.GetSiteBySubdomain)

	// Upload routes (requires auth + S3 configuration)
	if s3Client != nil && cfg.UploadsBucket != "" {
		uploadHandler := handlers.NewUploadHandler(s3Client, cfg.UploadsBucket, awsRegion)
		uploadGroup := apiGroup.Group("", middleware.AuthMiddleware(cfg.JWTSecret))
		uploadGroup.Post("/uploads/presign", uploadHandler.GetPresignedURL)
	}

	// Protected routes (OAuth or key auth)
	protected := apiGroup.Group("", middleware.AuthMiddleware(cfg.JWTSecret))
	protected.Post("/packs", packHandler.CreatePack)
	protected.Put("/packs/:code", packHandler.UpdatePack)
	protected.Delete("/packs/:code", packHandler.DeletePack)
	protected.Get("/my-packs", packHandler.GetMyPacks)
	protected.Post("/tournaments", tournamentHandler.CreateTournament)
	protected.Put("/tournaments/:abbrev", tournamentHandler.UpdateTournament)
	protected.Delete("/tournaments/:abbrev", tournamentHandler.DeleteTournament)
	protected.Post("/tournaments/:abbrev/stages", tournamentHandler.AddStage)
	protected.Put("/tournaments/:abbrev/stages/:stageId", tournamentHandler.RenameStage)
	protected.Delete("/tournaments/:abbrev/stages/:stageId", tournamentHandler.DeleteStage)
	protected.Post("/tournaments/:abbrev/stages/:stageId/maps", tournamentHandler.AddMapToStage)
	protected.Delete("/tournaments/:abbrev/maps/:mapId", tournamentHandler.RemoveMapFromStage)
	protected.Patch("/tournaments/:abbrev/maps/:mapId", tournamentHandler.UpdateMap)
	// Players
	protected.Post("/tournaments/:abbrev/players", tournamentHandler.AddPlayer)
	protected.Post("/tournaments/:abbrev/players/bulk", tournamentHandler.BulkAddPlayers)
	protected.Put("/tournaments/:abbrev/players/reorder", tournamentHandler.ReorderPlayers)
	protected.Put("/tournaments/:abbrev/players/:playerId", tournamentHandler.UpdatePlayer)
	protected.Delete("/tournaments/:abbrev/players/:playerId", tournamentHandler.RemovePlayer)
	protected.Delete("/tournaments/:abbrev/players", tournamentHandler.ClearPlayers)
	// Bracket
	protected.Put("/tournaments/:abbrev/bracket", tournamentHandler.SaveBracket)
	// Announcements
	protected.Post("/tournaments/:abbrev/announcements", tournamentHandler.CreateAnnouncement)
	protected.Put("/tournaments/:abbrev/announcements/:annId", tournamentHandler.UpdateAnnouncement)
	protected.Delete("/tournaments/:abbrev/announcements/:annId", tournamentHandler.DeleteAnnouncement)
	// Site builder
	protected.Get("/tournaments/:abbrev/site", siteHandler.GetSite)
	protected.Put("/tournaments/:abbrev/site", siteHandler.SaveSite)
	protected.Put("/tournaments/:abbrev/site/publish", siteHandler.PublishSite)
	protected.Delete("/tournaments/:abbrev/site", siteHandler.DeleteSite)

	// OAuth-only routes (key management)
	oauthOnly := apiGroup.Group("", middleware.OAuthOnlyMiddleware(cfg.JWTSecret))
	oauthOnly.Post("/keys", keyHandler.CreateKey)
	oauthOnly.Get("/keys", keyHandler.ListKeys)
	oauthOnly.Delete("/keys/:id", keyHandler.RevokeKey)
}
