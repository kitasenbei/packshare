package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	OsuID       int64  `json:"osu_id"`
	Username    string `json:"username"`
	CountryCode string `json:"country_code"`
	AvatarURL   string `json:"avatar_url"`
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

	userClaims := &UserClaims{
		OsuID:       int64(claims["osu_id"].(float64)),
		Username:    claims["username"].(string),
		CountryCode: getStringClaim(claims, "country_code"),
		AvatarURL:   getStringClaim(claims, "avatar_url"),
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
