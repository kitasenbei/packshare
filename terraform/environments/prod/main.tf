# PackShare Production Environment

terraform {
  required_version = ">= 1.0"

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

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "packshare"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = "10.1.0.0/16"  # Different CIDR from staging
  az_count           = 2
  single_nat_gateway = false  # NAT per AZ for high availability
}

# Secrets Manager
module "secrets" {
  source = "../../modules/secrets"

  environment       = var.environment
  db_username       = "packshare_admin"
  db_password       = var.db_password
  db_host           = module.rds.address
  db_port           = 5432
  db_name           = "packshare"
  jwt_secret        = var.jwt_secret
  osu_client_id     = var.osu_client_id
  osu_client_secret = var.osu_client_secret
}

# IAM Roles
module "iam" {
  source = "../../modules/iam"

  environment  = var.environment
  secrets_arns = module.secrets.all_secrets_arns
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  db_subnet_group_name    = module.vpc.db_subnet_group_name
  allowed_security_groups = [module.lambda_backend.security_group_id]

  # Production configuration
  instance_class               = "db.t3.small"
  allocated_storage            = 50
  max_allocated_storage        = 100
  multi_az                     = true
  backup_retention_days        = 7
  deletion_protection          = true
  performance_insights_enabled = true

  master_password = module.secrets.db_password
}

# API Gateway (created before Lambdas to get execution ARN)
module "api_gateway" {
  source = "../../modules/api-gateway"

  environment               = var.environment
  backend_lambda_invoke_arn = module.lambda_backend.invoke_arn
  auth_lambda_invoke_arn    = module.lambda_auth.invoke_arn
  allowed_origins           = var.domain_name != "" ? ["https://${var.domain_name}"] : ["*"]

  # Production throttling limits
  throttling_burst_limit = 200
  throttling_rate_limit  = 100
}

# Lambda Backend
module "lambda_backend" {
  source = "../../modules/lambda-backend"

  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  vpc_cidr                  = module.vpc.vpc_cidr
  subnet_ids                = module.vpc.private_subnet_ids
  lambda_role_arn           = module.iam.lambda_backend_role_arn
  lambda_zip_path           = var.backend_lambda_zip
  api_gateway_execution_arn = module.api_gateway.execution_arn

  # Production configuration
  memory_size          = 512
  timeout              = 30
  reserved_concurrency = 100

  db_secrets_arn  = module.secrets.db_credentials_arn
  jwt_secret_arn  = module.secrets.jwt_secret_arn
  allowed_origins = var.domain_name != "" ? "https://${var.domain_name}" : "*"
}

# Lambda Auth
module "lambda_auth" {
  source = "../../modules/lambda-auth"

  environment               = var.environment
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  lambda_role_arn           = module.iam.lambda_auth_role_arn
  lambda_zip_path           = var.auth_lambda_zip
  api_gateway_execution_arn = module.api_gateway.execution_arn

  # Production configuration
  memory_size          = 512
  timeout              = 30
  reserved_concurrency = 100

  jwt_secret_arn   = module.secrets.jwt_secret_arn
  osu_oauth_arn    = module.secrets.osu_oauth_arn
  default_redirect = var.domain_name != "" ? "https://${var.domain_name}" : module.frontend.cloudfront_url
  allowed_origins  = var.domain_name != "" ? "https://${var.domain_name}" : "*"
}

# Frontend (S3 + CloudFront)
module "frontend" {
  source = "../../modules/frontend"

  environment            = var.environment
  aws_account_id         = data.aws_caller_identity.current.account_id
  cloudfront_price_class = "PriceClass_200"  # US, Canada, Europe, Asia, Middle East, Africa
  api_gateway_domain     = replace(module.api_gateway.api_endpoint, "https://", "")
  acm_certificate_arn    = var.acm_certificate_arn
  domain_names           = var.domain_name != "" ? [var.domain_name] : []
}
