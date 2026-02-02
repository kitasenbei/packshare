variable "environment" {
  description = "Environment name"
  type        = string
}

variable "secrets_arns" {
  description = "ARNs of secrets that Lambda can access"
  type        = list(string)
  default     = []
}
