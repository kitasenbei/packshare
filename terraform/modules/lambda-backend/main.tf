# Lambda Backend Module - Go API

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name        = "${var.environment}-lambda-backend-sg"
  description = "Security group for Lambda backend"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "PostgreSQL access"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for Secrets Manager"
  }

  tags = {
    Name        = "${var.environment}-lambda-backend-sg"
    Environment = var.environment
  }
}

# Lambda function
resource "aws_lambda_function" "backend" {
  function_name = "${var.environment}-packshare-backend"
  description   = "PackShare Go API backend"
  role          = var.lambda_role_arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]

  filename         = var.lambda_zip_path
  source_code_hash = var.lambda_zip_path != "" ? filebase64sha256(var.lambda_zip_path) : null

  memory_size                    = var.memory_size
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrency

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT          = var.environment
      DB_SECRETS_ARN       = var.db_secrets_arn
      JWT_SECRET_ARN       = var.jwt_secret_arn
      ALLOWED_ORIGINS      = var.allowed_origins
      AWS_SECRETS_MANAGER  = "true"
    }
  }

  tags = {
    Name        = "${var.environment}-packshare-backend"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.backend.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-lambda-backend-logs"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
