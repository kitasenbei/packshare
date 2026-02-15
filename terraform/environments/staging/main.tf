# PackShare Staging Environment

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

# Pull shared DNS state (hosted zone + ACM cert)
data "terraform_remote_state" "dns" {
  backend = "s3"

  config = {
    bucket = "packshare-terraform-state"
    key    = "dns/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  domain_name     = "staging.packshare.cloud"
  zone_id         = data.terraform_remote_state.dns.outputs.zone_id
  certificate_arn = data.terraform_remote_state.dns.outputs.certificate_arn
}

# VPC
module "vpc" {
  source = "../../modules/vpc"

  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = "10.0.0.0/16"
  az_count           = 2
  enable_nat_gateway = false  # Auth Lambda moved out of VPC, backend uses VPC endpoint for Secrets Manager
  single_nat_gateway = true
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

  # Staging configuration
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 50
  multi_az              = false
  backup_retention_days = 1
  deletion_protection   = false

  master_password = module.secrets.db_password
}

# API Gateway (created before Lambdas to get execution ARN)
module "api_gateway" {
  source = "../../modules/api-gateway"

  environment               = var.environment
  backend_lambda_invoke_arn = module.lambda_backend.invoke_arn
  auth_lambda_invoke_arn    = module.lambda_auth.invoke_arn
  allowed_origins           = ["https://${local.domain_name}"]

  # Staging throttling limits
  throttling_burst_limit = 50
  throttling_rate_limit  = 25
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

  # Staging configuration
  memory_size          = 256
  timeout              = 30
  reserved_concurrency = -1  # No reservation for staging

  db_secrets_arn  = module.secrets.db_credentials_arn
  jwt_secret_arn  = module.secrets.jwt_secret_arn
  allowed_origins = "https://${local.domain_name}"
}

# Lambda Auth (no VPC — only needs osu! API + Secrets Manager via internet)
module "lambda_auth" {
  source = "../../modules/lambda-auth"

  environment               = var.environment
  lambda_role_arn           = module.iam.lambda_auth_role_arn
  lambda_zip_path           = var.auth_lambda_zip
  api_gateway_execution_arn = module.api_gateway.execution_arn

  # Staging configuration
  memory_size          = 256
  timeout              = 30
  reserved_concurrency = -1  # No reservation for staging

  jwt_secret_arn   = module.secrets.jwt_secret_arn
  osu_oauth_arn    = module.secrets.osu_oauth_arn
  default_redirect = "https://${local.domain_name}"
  allowed_origins  = "https://${local.domain_name}"
}

# Frontend (S3 + CloudFront)
module "frontend" {
  source = "../../modules/frontend"

  environment            = var.environment
  aws_account_id         = data.aws_caller_identity.current.account_id
  cloudfront_price_class = "PriceClass_100"  # US, Canada, Europe
  api_gateway_domain     = replace(module.api_gateway.api_endpoint, "https://", "")
  acm_certificate_arn    = local.certificate_arn
  domain_names           = [local.domain_name]
}

# DNS record: staging.packshare.cloud → CloudFront
resource "aws_route53_record" "staging" {
  zone_id = local.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_ipv6" {
  zone_id = local.zone_id
  name    = local.domain_name
  type    = "AAAA"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
