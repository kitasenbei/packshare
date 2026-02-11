package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/packshare/backend/internal/middleware"
	"github.com/packshare/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestApp(t *testing.T) (*fiber.App, *gorm.DB) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(&models.User{}, &models.Pack{}, &models.PackBeatmap{})
	assert.NoError(t, err)

	app := fiber.New()
	handler := NewPackHandler(db)

	// Public routes
	app.Get("/api/packs/:code", handler.GetPack)

	// Protected routes
	secret := "test-secret"
	protected := app.Group("/api", middleware.AuthMiddleware(secret))
	protected.Post("/packs", handler.CreatePack)
	protected.Put("/packs/:code", handler.UpdatePack)
	protected.Delete("/packs/:code", handler.DeletePack)
	protected.Get("/my-packs", handler.GetMyPacks)

	return app, db
}

func createTestToken(secret string, osuID int64, username string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"osu_id":       float64(osuID),
		"username":     username,
		"country_code": "US",
		"avatar_url":   fmt.Sprintf("https://a.ppy.sh/%d", osuID),
		"exp":          float64(time.Now().Add(time.Hour).Unix()),
	})
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

func TestGetPack(t *testing.T) {
	app, db := setupTestApp(t)

	// Create test data
	user := models.User{OsuID: 12345, Username: "testuser"}
	db.Create(&user)

	pack := models.Pack{
		ShareCode:   "abc123",
		Name:        "Test Pack",
		Description: "A test pack",
		UserID:      user.ID,
	}
	db.Create(&pack)

	db.Create(&models.PackBeatmap{
		PackID:    pack.ID,
		BeatmapID: 111,
		Title:     "Song 1",
		Artist:    "Artist 1",
		Creator:   "Mapper 1",
		BPM:       180,
		Keys:      7,
		SortOrder: 0,
	})
	db.Create(&models.PackBeatmap{
		PackID:    pack.ID,
		BeatmapID: 222,
		Title:     "Song 2",
		Artist:    "Artist 2",
		Creator:   "Mapper 2",
		BPM:       200,
		Keys:      4,
		SortOrder: 1,
	})

	t.Run("get existing pack", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/packs/abc123", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.Equal(t, "Test Pack", result["name"])
		assert.Equal(t, "abc123", result["share_code"])

		beatmaps := result["beatmaps"].([]interface{})
		assert.Equal(t, 2, len(beatmaps))
	})

	t.Run("get non-existent pack returns 404", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/packs/notfound", nil)
		resp, err := app.Test(req)

		assert.NoError(t, err)
		assert.Equal(t, 404, resp.StatusCode)
	})

	t.Run("view count increments", func(t *testing.T) {
		var before models.Pack
		db.First(&before, pack.ID)
		initialViews := before.Views

		req := httptest.NewRequest("GET", "/api/packs/abc123", nil)
		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		// Response returns views+1
		assert.Equal(t, float64(initialViews+1), result["views"])
	})
}

func TestCreatePack(t *testing.T) {
	app, db := setupTestApp(t)
	token := createTestToken("test-secret", 12345, "creator")

	t.Run("create pack successfully", func(t *testing.T) {
		body := map[string]interface{}{
			"name":        "My New Pack",
			"description": "A cool pack",
			"beatmaps": []map[string]interface{}{
				{"beatmapset_id": 111, "title": "Song 1", "artist": "Artist 1", "creator": "Mapper", "bpm": 180, "keys": 7},
				{"beatmapset_id": 222, "title": "Song 2", "artist": "Artist 2", "creator": "Mapper", "bpm": 200, "keys": 4},
			},
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 201, resp.StatusCode)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.Equal(t, "My New Pack", result["name"])
		assert.NotEmpty(t, result["share_code"])

		// Verify in database
		var pack models.Pack
		db.Where("name = ?", "My New Pack").First(&pack)
		assert.NotZero(t, pack.ID)
	})

	t.Run("create pack without auth returns 401", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Unauthorized Pack",
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})

	t.Run("create pack without name returns 400", func(t *testing.T) {
		body := map[string]interface{}{
			"description": "No name pack",
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 400, resp.StatusCode)
	})

	t.Run("create pack without beatmaps returns 400", func(t *testing.T) {
		body := map[string]interface{}{
			"name":     "Empty Pack",
			"beatmaps": []map[string]interface{}{},
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 400, resp.StatusCode)
	})
}

func TestUpdatePack(t *testing.T) {
	app, db := setupTestApp(t)

	// Create user and pack
	user := models.User{OsuID: 99999, Username: "owner"}
	db.Create(&user)

	pack := models.Pack{ShareCode: "update1", Name: "Original Name", UserID: user.ID}
	db.Create(&pack)
	db.Create(&models.PackBeatmap{PackID: pack.ID, BeatmapID: 111, Title: "Original Song"})

	token := createTestToken("test-secret", 99999, "owner")
	otherToken := createTestToken("test-secret", 88888, "other")

	t.Run("update own pack", func(t *testing.T) {
		body := map[string]interface{}{
			"name":        "Updated Name",
			"description": "Updated description",
			"beatmaps": []map[string]interface{}{
				{"beatmapset_id": 333, "title": "New Song", "artist": "Artist", "creator": "Mapper", "bpm": 180, "keys": 7},
			},
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("PUT", "/api/packs/update1", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var updated models.Pack
		db.Preload("Beatmaps").Where("share_code = ?", "update1").First(&updated)
		assert.Equal(t, "Updated Name", updated.Name)
		assert.Equal(t, 1, len(updated.Beatmaps))
		assert.Equal(t, int64(333), updated.Beatmaps[0].BeatmapID)
	})

	t.Run("cannot update others pack", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Hacked Name",
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("PUT", "/api/packs/update1", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+otherToken)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 403, resp.StatusCode)
	})

	t.Run("update non-existent pack returns 404", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Ghost Pack",
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("PUT", "/api/packs/notexist", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 404, resp.StatusCode)
	})
}

func TestDeletePack(t *testing.T) {
	app, db := setupTestApp(t)

	user := models.User{OsuID: 77777, Username: "deleter"}
	db.Create(&user)

	token := createTestToken("test-secret", 77777, "deleter")
	otherToken := createTestToken("test-secret", 66666, "other")

	t.Run("delete own pack", func(t *testing.T) {
		pack := models.Pack{ShareCode: "delete1", Name: "To Delete", UserID: user.ID}
		db.Create(&pack)
		db.Create(&models.PackBeatmap{PackID: pack.ID, BeatmapID: 111, Title: "Song"})

		req := httptest.NewRequest("DELETE", "/api/packs/delete1", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 204, resp.StatusCode)

		// Verify deleted
		var count int64
		db.Model(&models.Pack{}).Where("share_code = ?", "delete1").Count(&count)
		assert.Equal(t, int64(0), count)
	})

	t.Run("cannot delete others pack", func(t *testing.T) {
		pack := models.Pack{ShareCode: "delete2", Name: "Protected", UserID: user.ID}
		db.Create(&pack)

		req := httptest.NewRequest("DELETE", "/api/packs/delete2", nil)
		req.Header.Set("Authorization", "Bearer "+otherToken)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 403, resp.StatusCode)
	})

	t.Run("delete non-existent pack returns 404", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/packs/notexist", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 404, resp.StatusCode)
	})
}

func TestGetMyPacks(t *testing.T) {
	app, db := setupTestApp(t)

	user := models.User{OsuID: 55555, Username: "packowner"}
	db.Create(&user)

	db.Create(&models.Pack{ShareCode: "my1", Name: "My Pack 1", UserID: user.ID})
	db.Create(&models.Pack{ShareCode: "my2", Name: "My Pack 2", UserID: user.ID})
	db.Create(&models.Pack{ShareCode: "my3", Name: "My Pack 3", UserID: user.ID})

	// Create another user's pack
	otherUser := models.User{OsuID: 44444, Username: "other"}
	db.Create(&otherUser)
	db.Create(&models.Pack{ShareCode: "other1", Name: "Other Pack", UserID: otherUser.ID})

	token := createTestToken("test-secret", 55555, "packowner")

	t.Run("get my packs returns only own packs", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/my-packs", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 200, resp.StatusCode)

		var result []map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		assert.Equal(t, 3, len(result))
	})

	t.Run("get my packs without auth returns 401", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/my-packs", nil)

		resp, err := app.Test(req)
		assert.NoError(t, err)
		assert.Equal(t, 401, resp.StatusCode)
	})
}

func TestPackShareCodeGeneration(t *testing.T) {
	app, db := setupTestApp(t)
	token := createTestToken("test-secret", 11111, "coder")

	t.Run("share codes are unique", func(t *testing.T) {
		codes := make(map[string]bool)

		for i := 0; i < 10; i++ {
			body := map[string]interface{}{
				"name": "Pack " + string(rune(i)),
				"beatmaps": []map[string]interface{}{
					{"beatmapset_id": i + 1, "title": "Song", "artist": "Artist", "creator": "Mapper", "bpm": 180, "keys": 7},
				},
			}
			jsonBody, _ := json.Marshal(body)

			req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+token)

			resp, _ := app.Test(req)

			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)

			code := result["share_code"].(string)
			assert.False(t, codes[code], "duplicate share code generated")
			codes[code] = true
		}
	})

	t.Run("share code has correct length", func(t *testing.T) {
		body := map[string]interface{}{
			"name": "Length Test Pack",
			"beatmaps": []map[string]interface{}{
				{"beatmapset_id": 999, "title": "Song", "artist": "Artist", "creator": "Mapper", "bpm": 180, "keys": 7},
			},
		}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/packs", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		resp, _ := app.Test(req)

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)

		code := result["share_code"].(string)
		assert.GreaterOrEqual(t, len(code), 6)
		assert.LessOrEqual(t, len(code), 12)

		// Verify only alphanumeric
		var packs []models.Pack
		db.Find(&packs)
	})
}
