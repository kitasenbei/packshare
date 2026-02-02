# API Gateway Module - HTTP API

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.environment}-packshare-api"
  protocol_type = "HTTP"
  description   = "PackShare API Gateway"

  cors_configuration {
    allow_origins     = var.allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Authorization", "Content-Type", "X-Amz-Date", "X-Api-Key"]
    expose_headers    = ["*"]
    allow_credentials = length(var.allowed_origins) == 1 && var.allowed_origins[0] != "*"
    max_age           = 300
  }

  tags = {
    Name        = "${var.environment}-packshare-api"
    Environment = var.environment
  }
}

# Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  tags = {
    Name        = "${var.environment}-packshare-api-stage"
    Environment = var.environment
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.environment}-packshare-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-api-gateway-logs"
    Environment = var.environment
  }
}

# Backend Lambda Integration
resource "aws_apigatewayv2_integration" "backend" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.backend_lambda_invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Auth Lambda Integration
resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.auth_lambda_invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Backend Routes - /api/*
resource "aws_apigatewayv2_route" "backend_api" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

# Health check route for backend
resource "aws_apigatewayv2_route" "backend_health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

# Auth Routes - /auth/*
resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_callback" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/callback"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_verify" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/verify"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_root" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

# Auth health check
resource "aws_apigatewayv2_route" "auth_health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/health"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

# Auth beatmapset lookup
resource "aws_apigatewayv2_route" "auth_beatmapset" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /auth/beatmapset/{beatmapset_id}"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}
