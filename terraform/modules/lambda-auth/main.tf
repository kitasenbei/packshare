# Lambda Auth Module - Python Auth Service

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
  name        = "${var.environment}-lambda-auth-sg"
  description = "Security group for Lambda auth service"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS for osu! API and Secrets Manager"
  }

  tags = {
    Name        = "${var.environment}-lambda-auth-sg"
    Environment = var.environment
  }
}

# Lambda function
resource "aws_lambda_function" "auth" {
  function_name = "${var.environment}-packshare-auth"
  description   = "PackShare Python auth service"
  role          = var.lambda_role_arn
  handler       = "main.handler"
  runtime       = "python3.12"
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
      JWT_SECRET_ARN       = var.jwt_secret_arn
      OSU_OAUTH_ARN        = var.osu_oauth_arn
      DEFAULT_REDIRECT     = var.default_redirect
      ALLOWED_ORIGINS      = var.allowed_origins
      AWS_SECRETS_MANAGER  = "true"
    }
  }

  tags = {
    Name        = "${var.environment}-packshare-auth"
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
  name              = "/aws/lambda/${aws_lambda_function.auth.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.environment}-lambda-auth-logs"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
