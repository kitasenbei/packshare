variable "environment" {
  description = "Environment name"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed CORS origins for uploads"
  type        = list(string)
}
