# Staging Environment Outputs

output "environment" {
  description = "Environment name"
  value       = var.environment
}

# VPC
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

# Database
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

# API Gateway
output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

# Frontend
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_url" {
  description = "CloudFront URL"
  value       = module.frontend.cloudfront_url
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend deployment"
  value       = module.frontend.bucket_name
}

# Lambda
output "backend_lambda_function" {
  description = "Backend Lambda function name"
  value       = module.lambda_backend.function_name
}

output "auth_lambda_function" {
  description = "Auth Lambda function name"
  value       = module.lambda_auth.function_name
}

# Secrets
output "db_credentials_secret_name" {
  description = "Database credentials secret name"
  value       = module.secrets.db_credentials_name
}

output "jwt_secret_name" {
  description = "JWT secret name"
  value       = module.secrets.jwt_secret_name
}

# URLs for application
output "application_url" {
  description = "Main application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : module.frontend.cloudfront_url
}

output "api_url" {
  description = "API URL"
  value       = "${module.api_gateway.api_endpoint}/api"
}

output "auth_url" {
  description = "Auth URL"
  value       = "${module.api_gateway.api_endpoint}/auth"
}
