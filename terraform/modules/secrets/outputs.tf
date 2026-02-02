output "db_credentials_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_credentials_name" {
  description = "Name of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "jwt_secret_name" {
  description = "Name of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.name
}

output "osu_oauth_arn" {
  description = "ARN of the osu! OAuth credentials secret"
  value       = aws_secretsmanager_secret.osu_oauth.arn
}

output "osu_oauth_name" {
  description = "Name of the osu! OAuth credentials secret"
  value       = aws_secretsmanager_secret.osu_oauth.name
}

output "all_secrets_arns" {
  description = "List of all secret ARNs"
  value = [
    aws_secretsmanager_secret.db_credentials.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
    aws_secretsmanager_secret.osu_oauth.arn
  ]
}

output "db_password" {
  description = "Generated database password"
  value       = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  sensitive   = true
}
