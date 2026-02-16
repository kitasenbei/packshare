package handlers

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/packshare/backend/internal/middleware"
)

var allowedContentTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

type UploadHandler struct {
	presignClient *s3.PresignClient
	bucket        string
	region        string
}

func NewUploadHandler(s3Client *s3.Client, bucket, region string) *UploadHandler {
	return &UploadHandler{
		presignClient: s3.NewPresignClient(s3Client),
		bucket:        bucket,
		region:        region,
	}
}

type PresignRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type PresignResponse struct {
	UploadURL string `json:"upload_url"`
	FileURL   string `json:"file_url"`
}

func (h *UploadHandler) GetPresignedURL(c *fiber.Ctx) error {
	claims, ok := c.Locals("user").(*middleware.UserClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req PresignRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Filename == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "filename is required"})
	}

	ext, ok := allowedContentTypes[req.ContentType]
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("invalid content type: allowed types are %s", strings.Join(allowedContentTypesList(), ", ")),
		})
	}

	// Ignore the original extension, use the one matching the content type
	_ = filepath.Ext(req.Filename)
	key := fmt.Sprintf("tournaments/%d/%s%s", claims.OsuID, uuid.New().String(), ext)

	presignResult, err := h.presignClient.PresignPutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(h.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(req.ContentType),
	}, s3.WithPresignExpires(5*time.Minute))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate upload URL"})
	}

	fileURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", h.bucket, h.region, key)

	return c.JSON(PresignResponse{
		UploadURL: presignResult.URL,
		FileURL:   fileURL,
	})
}

func allowedContentTypesList() []string {
	types := make([]string, 0, len(allowedContentTypes))
	for ct := range allowedContentTypes {
		types = append(types, ct)
	}
	return types
}
