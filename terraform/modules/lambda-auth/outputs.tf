output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.auth.function_name
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.auth.arn
}

output "invoke_arn" {
  description = "Lambda invoke ARN"
  value       = aws_lambda_function.auth.invoke_arn
}
