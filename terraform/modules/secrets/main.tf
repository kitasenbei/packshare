# Secrets Manager Module

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Generate random password for database if not provided
resource "random_password" "db_password" {
  count            = var.db_password == "" ? 1 : 0
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Database credentials secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.environment}/packshare/db-credentials"
  description             = "Database credentials for PackShare"
  recovery_window_in_days = var.environment == "staging" ? 0 : 7

  tags = {
    Name        = "${var.environment}-db-credentials"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
    host     = var.db_host
    port     = var.db_port
    database = var.db_name
  })
}

# Generate JWT secret if not provided
resource "random_password" "jwt_secret" {
  count   = var.jwt_secret == "" ? 1 : 0
  length  = 64
  special = false
}

# JWT secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.environment}/packshare/jwt-secret"
  description             = "JWT signing secret for PackShare"
  recovery_window_in_days = var.environment == "staging" ? 0 : 7

  tags = {
    Name        = "${var.environment}-jwt-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret[0].result
}

# osu! OAuth credentials
resource "aws_secretsmanager_secret" "osu_oauth" {
  name                    = "${var.environment}/packshare/osu-oauth"
  description             = "osu! OAuth credentials for PackShare"
  recovery_window_in_days = var.environment == "staging" ? 0 : 7

  tags = {
    Name        = "${var.environment}-osu-oauth"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "osu_oauth" {
  secret_id = aws_secretsmanager_secret.osu_oauth.id
  secret_string = jsonencode({
    client_id     = var.osu_client_id
    client_secret = var.osu_client_secret
  })
}
