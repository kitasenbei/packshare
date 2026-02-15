# Lambda Auth Module - Python Auth Service

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Lambda function (no VPC — only calls osu! API + Secrets Manager via internet)
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

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      JWT_SECRET_ARN      = var.jwt_secret_arn
      OSU_OAUTH_ARN       = var.osu_oauth_arn
      DEFAULT_REDIRECT    = var.default_redirect
      ALLOWED_ORIGINS     = var.allowed_origins
      AWS_SECRETS_MANAGER = "true"
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
