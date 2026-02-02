output "lambda_backend_role_arn" {
  description = "ARN of the Lambda backend execution role"
  value       = aws_iam_role.lambda_backend.arn
}

output "lambda_backend_role_name" {
  description = "Name of the Lambda backend execution role"
  value       = aws_iam_role.lambda_backend.name
}

output "lambda_auth_role_arn" {
  description = "ARN of the Lambda auth execution role"
  value       = aws_iam_role.lambda_auth.arn
}

output "lambda_auth_role_name" {
  description = "Name of the Lambda auth execution role"
  value       = aws_iam_role.lambda_auth.name
}
