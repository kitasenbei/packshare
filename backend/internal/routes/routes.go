package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/packshare/backend/internal/config"
	"github.com/packshare/backend/internal/handlers"
	"github.com/packshare/backend/internal/middleware"
	"gorm.io/gorm"
)

func Setup(app *fiber.App, db *gorm.DB, cfg *config.Config) {
	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowCredentials: cfg.AllowedOrigins != "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Handlers
	packHandler := handlers.NewPackHandler(db)

	// API routes
	api := app.Group("/api")

	// Public routes
	api.Get("/packs", packHandler.BrowsePacks)
	api.Get("/packs/:code", packHandler.GetPack)

	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware(cfg.JWTSecret))
	protected.Post("/packs", packHandler.CreatePack)
	protected.Put("/packs/:code", packHandler.UpdatePack)
	protected.Delete("/packs/:code", packHandler.DeletePack)
	protected.Get("/my-packs", packHandler.GetMyPacks)
}
