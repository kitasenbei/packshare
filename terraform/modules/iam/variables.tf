variable "environment" {
  description = "Environment name"
  type        = string
}

variable "secrets_arns" {
  description = "ARNs of secrets that Lambda can access"
  type        = list(string)
  default     = []
}

variable "uploads_bucket_arn" {
  description = "ARN of the S3 uploads bucket"
  type        = string
  default     = ""
}
