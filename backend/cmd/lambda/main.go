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

// DBCredentials represents the structure of database credentials in Secrets Manager
type DBCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
}

func init() {
	// Check if running in AWS Lambda environment
	if os.Getenv("AWS_SECRETS_MANAGER") == "true" {
		if err := loadSecretsFromAWS(); err != nil {
			log.Printf("Warning: Failed to load secrets from AWS: %v", err)
		}
	}

	// Load config
	cfg := appconfig.Load()

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Create Fiber app
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

	// Setup routes
	routes.Setup(app, db, cfg)

	// Create Lambda adapter
	fiberLambda = fiberadapter.New(app)
}

func loadSecretsFromAWS() error {
	ctx := context.Background()

	// Load AWS config
	awsCfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return err
	}

	client := secretsmanager.NewFromConfig(awsCfg)

	// Load database credentials
	dbSecretARN := os.Getenv("DB_SECRETS_ARN")
	if dbSecretARN != "" {
		result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
			SecretId: &dbSecretARN,
		})
		if err != nil {
			return err
		}

		var creds DBCredentials
		if err := json.Unmarshal([]byte(*result.SecretString), &creds); err != nil {
			return err
		}

		// Build DATABASE_URL from credentials
		databaseURL := buildDatabaseURL(creds)
		os.Setenv("DATABASE_URL", databaseURL)
	}

	// Load JWT secret
	jwtSecretARN := os.Getenv("JWT_SECRET_ARN")
	if jwtSecretARN != "" {
		result, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
			SecretId: &jwtSecretARN,
		})
		if err != nil {
			return err
		}
		os.Setenv("JWT_SECRET", *result.SecretString)
	}

	return nil
}

func buildDatabaseURL(creds DBCredentials) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=require",
		url.QueryEscape(creds.Username), url.QueryEscape(creds.Password), creds.Host, creds.Port, creds.Database)
}

// Handler is the Lambda function handler
func Handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return fiberLambda.ProxyWithContextV2(ctx, req)
}

func main() {
	lambda.Start(Handler)
}
