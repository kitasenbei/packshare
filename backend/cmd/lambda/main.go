package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/gofiber/fiber/v2"
	appconfig "github.com/packshare/backend/internal/config"
	"github.com/packshare/backend/internal/database"
	"github.com/packshare/backend/internal/routes"
)

var fiberLambda *fiberadapter.FiberLambda

type DBCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
}

func init() {
	if os.Getenv("AWS_SECRETS_MANAGER") == "true" {
		if err := loadSecretsFromAWS(); err != nil {
			log.Fatalf("Failed to load secrets from AWS Secrets Manager: %v", err)
		}
	}

	cfg := appconfig.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	routes.Setup(app, db, cfg)

	fiberLambda = fiberadapter.New(app)
}

func loadSecretsFromAWS() error {
	ctx := context.Background()

	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := secretsmanager.NewFromConfig(awsCfg)

	dbSecretARN := os.Getenv("DB_SECRETS_ARN")
	if dbSecretARN != "" {
		result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
			SecretId: &dbSecretARN,
		})
		if err != nil {
			return fmt.Errorf("failed to load database credentials: %w", err)
		}

		var creds DBCredentials
		if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
			return fmt.Errorf("failed to parse database credentials: %w", err)
		}

		os.Setenv("DATABASE_URL", buildDatabaseURL(creds))
	}

	jwtSecretARN := os.Getenv("JWT_SECRET_ARN")
	if jwtSecretARN != "" {
		result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
			SecretId: &jwtSecretARN,
		})
		if err != nil {
			return fmt.Errorf("failed to load JWT secret: %w", err)
		}
		os.Setenv("JWT_SECRET", *result.SecretString)
	}

	return nil
}

func buildDatabaseURL(creds DBCredentials) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=require",
		url.QueryEscape(creds.Username), url.QueryEscape(creds.Password), creds.Host, creds.Port, creds.Database)
}

func Handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return fiberLambda.ProxyWithContextV2(ctx, req)
}

func main() {
	lambda.Start(Handler)
}
