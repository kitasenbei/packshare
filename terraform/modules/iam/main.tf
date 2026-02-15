# IAM Module - Roles and Policies for Lambda functions

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Lambda execution role for backend
resource "aws_iam_role" "lambda_backend" {
  name = "${var.environment}-lambda-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-lambda-backend-role"
    Environment = var.environment
  }
}

# Lambda execution role for auth
resource "aws_iam_role" "lambda_auth" {
  name = "${var.environment}-lambda-auth-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-lambda-auth-role"
    Environment = var.environment
  }
}

# Basic Lambda execution policy (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_backend_basic" {
  role       = aws_iam_role.lambda_backend.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_auth_basic" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access for Lambda
resource "aws_iam_role_policy_attachment" "lambda_backend_vpc" {
  role       = aws_iam_role.lambda_backend.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Secrets Manager access policy for backend
resource "aws_iam_policy" "lambda_secrets_backend" {
  name        = "${var.environment}-lambda-backend-secrets-policy"
  description = "Allow Lambda backend to read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_arns
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_backend_secrets" {
  role       = aws_iam_role.lambda_backend.name
  policy_arn = aws_iam_policy.lambda_secrets_backend.arn
}

# Secrets Manager access policy for auth
resource "aws_iam_policy" "lambda_secrets_auth" {
  name        = "${var.environment}-lambda-auth-secrets-policy"
  description = "Allow Lambda auth to read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_arns
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_auth_secrets" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = aws_iam_policy.lambda_secrets_auth.arn
}
