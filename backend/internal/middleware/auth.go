package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	OsuID       int64    `json:"osu_id"`
	Username    string   `json:"username"`
	CountryCode string   `json:"country_code"`
	AvatarURL   string   `json:"avatar_url"`
	KeyName     string   `json:"key_name,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// HasPermission returns true for OAuth sessions (KeyName == "") or if the key has the given permission.
func (c *UserClaims) HasPermission(perm string) bool {
	if c.KeyName == "" {
		return true
	}
	for _, p := range c.Permissions {
		if p == perm {
			return true
		}
	}
	return false
}

func parseToken(tokenString, secret string) (*UserClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, jwt.ErrSignatureInvalid
	}

	osuIDVal, ok := claims["osu_id"]
	if !ok {
		return nil, jwt.ErrSignatureInvalid
	}
	osuIDFloat, ok := osuIDVal.(float64)
	if !ok {
		return nil, jwt.ErrSignatureInvalid
	}

	username := getStringClaim(claims, "username")
	if username == "" {
		return nil, jwt.ErrSignatureInvalid
	}

	userClaims := &UserClaims{
		OsuID:       int64(osuIDFloat),
		Username:    username,
		CountryCode: getStringClaim(claims, "country_code"),
		AvatarURL:   getStringClaim(claims, "avatar_url"),
		KeyName:     getStringClaim(claims, "key_name"),
	}

	// Parse permissions from comma-separated string
	if permsStr := getStringClaim(claims, "permissions"); permsStr != "" {
		userClaims.Permissions = strings.Split(permsStr, ",")
	}

	return userClaims, nil
}

func getStringClaim(claims jwt.MapClaims, key string) string {
	if val, ok := claims[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func extractToken(c *fiber.Ctx) string {
	auth := c.Get("Authorization")
	if auth == "" {
		return ""
	}

	parts := strings.Split(auth, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

// AuthMiddleware requires a valid JWT token
func AuthMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := extractToken(c)
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization token",
			})
		}

		claims, err := parseToken(tokenString, secret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		c.Locals("user", claims)
		return c.Next()
	}
}

// OAuthOnlyMiddleware requires a valid JWT token from an OAuth session (not a key session)
func OAuthOnlyMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := extractToken(c)
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization token",
			})
		}

		claims, err := parseToken(tokenString, secret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		if claims.KeyName != "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "this endpoint requires OAuth authentication, not an access key",
			})
		}

		c.Locals("user", claims)
		return c.Next()
	}
}

// OptionalAuthMiddleware parses token if present but doesn't require it
func OptionalAuthMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenString := extractToken(c)
		if tokenString == "" {
			return c.Next()
		}

		claims, err := parseToken(tokenString, secret)
		if err != nil {
			// Invalid token, but continue without user
			return c.Next()
		}

		c.Locals("user", claims)
		return c.Next()
	}
}
