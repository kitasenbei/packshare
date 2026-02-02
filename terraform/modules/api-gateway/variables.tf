variable "environment" {
  description = "Environment name"
  type        = string
}

variable "backend_lambda_invoke_arn" {
  description = "Backend Lambda invoke ARN"
  type        = string
}

variable "auth_lambda_invoke_arn" {
  description = "Auth Lambda invoke ARN"
  type        = string
}

variable "allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

variable "throttling_burst_limit" {
  description = "API throttling burst limit"
  type        = number
  default     = 100
}

variable "throttling_rate_limit" {
  description = "API throttling rate limit"
  type        = number
  default     = 50
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}
