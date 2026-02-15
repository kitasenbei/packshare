variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_role_arn" {
  description = "IAM role ARN for Lambda"
  type        = string
}

variable "lambda_zip_path" {
  description = "Path to Lambda deployment zip"
  type        = string
  default     = ""
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "reserved_concurrency" {
  description = "Reserved concurrent executions"
  type        = number
  default     = -1
}

variable "jwt_secret_arn" {
  description = "ARN of JWT secret"
  type        = string
}

variable "osu_oauth_arn" {
  description = "ARN of osu! OAuth credentials secret"
  type        = string
}

variable "default_redirect" {
  description = "Default redirect URL after OAuth"
  type        = string
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = "*"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN for Lambda permission"
  type        = string
}
