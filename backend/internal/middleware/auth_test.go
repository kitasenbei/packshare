package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func createTestToken(secret string, claims jwt.MapClaims) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

func TestAuthMiddleware(t *testing.T) {
	secret := "test-secret-key"

	t.Run("valid token passes through", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "ok"})
		})

		token := createTestToken(secret, jwt.MapClaims{
			"osu_id":       float64(12345678),
			"username":     "testuser",
			"country_code": "US",
			"avatar_url":   "https://a.ppy.sh/12345678",
			"exp":          float64(time.Now().Add(time.Hour).Unix()),
		})

		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)
	})

	t.Run("missing token returns 401", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "ok"})
		})

		req := httptest.NewRequest("GET", "/protected", nil)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})

	t.Run("invalid token returns 401", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "ok"})
		})

		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})

	t.Run("expired token returns 401", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "ok"})
		})

		token := createTestToken(secret, jwt.MapClaims{
			"osu_id":   float64(12345678),
			"username": "testuser",
			"exp":      float64(time.Now().Add(-time.Hour).Unix()), // expired
		})

		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})

	t.Run("wrong secret returns 401", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"status": "ok"})
		})

		token := createTestToken("wrong-secret", jwt.MapClaims{
			"osu_id":   float64(12345678),
			"username": "testuser",
			"exp":      float64(time.Now().Add(time.Hour).Unix()),
		})

		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})

	t.Run("user claims are set in context", func(t *testing.T) {
		app := fiber.New()
		app.Use(AuthMiddleware(secret))
		app.Get("/protected", func(c *fiber.Ctx) error {
			user := c.Locals("user").(*UserClaims)
			return c.JSON(fiber.Map{
				"osu_id":   user.OsuID,
				"username": user.Username,
			})
		})

		token := createTestToken(secret, jwt.MapClaims{
			"osu_id":       float64(12345678),
			"username":     "peppy",
			"country_code": "AU",
			"avatar_url":   "https://a.ppy.sh/12345678",
			"exp":          float64(time.Now().Add(time.Hour).Unix()),
		})

		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)
	})
}

func TestOptionalAuthMiddleware(t *testing.T) {
	secret := "test-secret-key"

	t.Run("valid token sets user in context", func(t *testing.T) {
		app := fiber.New()
		app.Use(OptionalAuthMiddleware(secret))
		app.Get("/optional", func(c *fiber.Ctx) error {
			user := c.Locals("user")
			if user != nil {
				return c.JSON(fiber.Map{"authenticated": true})
			}
			return c.JSON(fiber.Map{"authenticated": false})
		})

		token := createTestToken(secret, jwt.MapClaims{
			"osu_id":   float64(12345678),
			"username": "testuser",
			"exp":      float64(time.Now().Add(time.Hour).Unix()),
		})

		req := httptest.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)
	})

	t.Run("missing token still passes but user is nil", func(t *testing.T) {
		app := fiber.New()
		app.Use(OptionalAuthMiddleware(secret))
		app.Get("/optional", func(c *fiber.Ctx) error {
			user := c.Locals("user")
			if user != nil {
				return c.JSON(fiber.Map{"authenticated": true})
			}
			return c.JSON(fiber.Map{"authenticated": false})
		})

		req := httptest.NewRequest("GET", "/optional", nil)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)
	})

	t.Run("invalid token still passes but user is nil", func(t *testing.T) {
		app := fiber.New()
		app.Use(OptionalAuthMiddleware(secret))
		app.Get("/optional", func(c *fiber.Ctx) error {
			user := c.Locals("user")
			if user != nil {
				return c.JSON(fiber.Map{"authenticated": true})
			}
			return c.JSON(fiber.Map{"authenticated": false})
		})

		req := httptest.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)
	})
}
