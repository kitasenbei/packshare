variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

# Database
variable "db_password" {
  description = "Database master password (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

# OAuth
variable "osu_client_id" {
  description = "osu! OAuth client ID"
  type        = string
  sensitive   = true
}

variable "osu_client_secret" {
  description = "osu! OAuth client secret"
  type        = string
  sensitive   = true
}

# JWT
variable "jwt_secret" {
  description = "JWT signing secret (leave empty to auto-generate)"
  type        = string
  default     = ""
  sensitive   = true
}

# Lambda deployment paths
variable "backend_lambda_zip" {
  description = "Path to backend Lambda zip file"
  type        = string
  default     = ""
}

variable "auth_lambda_zip" {
  description = "Path to auth Lambda zip file"
  type        = string
  default     = ""
}

# Optional: Custom domain
variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain (must be in us-east-1)"
  type        = string
  default     = ""
}
