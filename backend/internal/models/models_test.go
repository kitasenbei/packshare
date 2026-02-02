package models

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(&User{}, &Pack{}, &PackBeatmap{})
	assert.NoError(t, err)

	return db
}

func TestUserModel(t *testing.T) {
	db := setupTestDB(t)

	t.Run("create user", func(t *testing.T) {
		user := User{
			OsuID:       12345678,
			Username:    "peppy",
			CountryCode: "AU",
			AvatarURL:   "https://a.ppy.sh/12345678",
		}

		err := db.Create(&user).Error
		assert.NoError(t, err)
		assert.NotZero(t, user.ID)
		assert.NotZero(t, user.CreatedAt)
	})

	t.Run("osu_id must be unique", func(t *testing.T) {
		user1 := User{OsuID: 99999, Username: "user1"}
		user2 := User{OsuID: 99999, Username: "user2"}

		err := db.Create(&user1).Error
		assert.NoError(t, err)

		err = db.Create(&user2).Error
		assert.Error(t, err) // should fail due to unique constraint
	})

	t.Run("find user by osu_id", func(t *testing.T) {
		user := User{OsuID: 11111, Username: "testuser"}
		db.Create(&user)

		var found User
		err := db.Where("osu_id = ?", 11111).First(&found).Error
		assert.NoError(t, err)
		assert.Equal(t, "testuser", found.Username)
	})
}

func TestPackModel(t *testing.T) {
	db := setupTestDB(t)

	// Create a user first
	user := User{OsuID: 12345, Username: "packmaker"}
	db.Create(&user)

	t.Run("create pack", func(t *testing.T) {
		pack := Pack{
			ShareCode:   "abc123",
			Name:        "Test Pack",
			Description: "A test pack",
			UserID:      user.ID,
		}

		err := db.Create(&pack).Error
		assert.NoError(t, err)
		assert.NotZero(t, pack.ID)
		assert.NotZero(t, pack.CreatedAt)
	})

	t.Run("share_code must be unique", func(t *testing.T) {
		pack1 := Pack{ShareCode: "unique1", Name: "Pack 1", UserID: user.ID}
		pack2 := Pack{ShareCode: "unique1", Name: "Pack 2", UserID: user.ID}

		err := db.Create(&pack1).Error
		assert.NoError(t, err)

		err = db.Create(&pack2).Error
		assert.Error(t, err) // should fail due to unique constraint
	})

	t.Run("pack belongs to user", func(t *testing.T) {
		pack := Pack{ShareCode: "userpack", Name: "User Pack", UserID: user.ID}
		db.Create(&pack)

		var found Pack
		err := db.Preload("User").First(&found, pack.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, user.ID, found.User.ID)
		assert.Equal(t, "packmaker", found.User.Username)
	})

	t.Run("increment view count", func(t *testing.T) {
		pack := Pack{ShareCode: "viewtest", Name: "View Test", UserID: user.ID, Views: 0}
		db.Create(&pack)

		db.Model(&pack).Update("views", gorm.Expr("views + 1"))

		var found Pack
		db.First(&found, pack.ID)
		assert.Equal(t, int64(1), found.Views)
	})
}

func TestPackBeatmapModel(t *testing.T) {
	db := setupTestDB(t)

	user := User{OsuID: 12345, Username: "mapper"}
	db.Create(&user)

	pack := Pack{ShareCode: "beatmaps", Name: "Beatmap Pack", UserID: user.ID}
	db.Create(&pack)

	t.Run("add beatmap to pack", func(t *testing.T) {
		beatmap := PackBeatmap{
			PackID:      pack.ID,
			BeatmapID:   1234567,
			Title:       "Test Song",
			Artist:      "Test Artist",
			Creator:     "Test Mapper",
			BPM:         180,
			Keys:        7,
			Status:      "ranked",
			SortOrder:   0,
		}

		err := db.Create(&beatmap).Error
		assert.NoError(t, err)
		assert.NotZero(t, beatmap.ID)
	})

	t.Run("pack has many beatmaps", func(t *testing.T) {
		// Add more beatmaps
		db.Create(&PackBeatmap{PackID: pack.ID, BeatmapID: 2222, Title: "Song 2", SortOrder: 1})
		db.Create(&PackBeatmap{PackID: pack.ID, BeatmapID: 3333, Title: "Song 3", SortOrder: 2})

		var found Pack
		err := db.Preload("Beatmaps").First(&found, pack.ID).Error
		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(found.Beatmaps), 3)
	})

	t.Run("beatmaps ordered by sort_order", func(t *testing.T) {
		newPack := Pack{ShareCode: "ordered", Name: "Ordered Pack", UserID: user.ID}
		db.Create(&newPack)

		db.Create(&PackBeatmap{PackID: newPack.ID, BeatmapID: 111, Title: "Third", SortOrder: 2})
		db.Create(&PackBeatmap{PackID: newPack.ID, BeatmapID: 222, Title: "First", SortOrder: 0})
		db.Create(&PackBeatmap{PackID: newPack.ID, BeatmapID: 333, Title: "Second", SortOrder: 1})

		var found Pack
		db.Preload("Beatmaps", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).First(&found, newPack.ID)

		assert.Equal(t, "First", found.Beatmaps[0].Title)
		assert.Equal(t, "Second", found.Beatmaps[1].Title)
		assert.Equal(t, "Third", found.Beatmaps[2].Title)
	})

	t.Run("delete pack cascades to beatmaps", func(t *testing.T) {
		cascadePack := Pack{ShareCode: "cascade", Name: "Cascade Pack", UserID: user.ID}
		db.Create(&cascadePack)
		db.Create(&PackBeatmap{PackID: cascadePack.ID, BeatmapID: 999, Title: "Will be deleted"})

		var countBefore int64
		db.Model(&PackBeatmap{}).Where("pack_id = ?", cascadePack.ID).Count(&countBefore)
		assert.Equal(t, int64(1), countBefore)

		db.Delete(&cascadePack)

		var countAfter int64
		db.Model(&PackBeatmap{}).Where("pack_id = ?", cascadePack.ID).Count(&countAfter)
		assert.Equal(t, int64(0), countAfter)
	})
}

func TestUserPacksRelation(t *testing.T) {
	db := setupTestDB(t)

	user := User{OsuID: 55555, Username: "multipack"}
	db.Create(&user)

	t.Run("user has many packs", func(t *testing.T) {
		db.Create(&Pack{ShareCode: "pack1", Name: "Pack 1", UserID: user.ID})
		db.Create(&Pack{ShareCode: "pack2", Name: "Pack 2", UserID: user.ID})
		db.Create(&Pack{ShareCode: "pack3", Name: "Pack 3", UserID: user.ID})

		var found User
		err := db.Preload("Packs").First(&found, user.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 3, len(found.Packs))
	})
}

func TestPackTimestamps(t *testing.T) {
	db := setupTestDB(t)

	user := User{OsuID: 77777, Username: "timestamp"}
	db.Create(&user)

	t.Run("created_at and updated_at are set", func(t *testing.T) {
		pack := Pack{ShareCode: "timestamps", Name: "Timestamp Test", UserID: user.ID}
		db.Create(&pack)

		assert.NotZero(t, pack.CreatedAt)
		assert.NotZero(t, pack.UpdatedAt)
	})

	t.Run("updated_at changes on update", func(t *testing.T) {
		pack := Pack{ShareCode: "updatetest", Name: "Update Test", UserID: user.ID}
		db.Create(&pack)

		originalUpdatedAt := pack.UpdatedAt
		time.Sleep(10 * time.Millisecond)

		db.Model(&pack).Update("name", "Updated Name")

		var found Pack
		db.First(&found, pack.ID)
		assert.True(t, found.UpdatedAt.After(originalUpdatedAt))
	})
}
