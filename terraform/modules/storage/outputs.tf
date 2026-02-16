output "bucket_name" {
  description = "S3 uploads bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "bucket_arn" {
  description = "S3 uploads bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}
