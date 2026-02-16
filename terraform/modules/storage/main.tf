# Storage Module - S3 bucket for user uploads (tournament banners/logos)

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.environment}-packshare-uploads"

  tags = {
    Name        = "${var.environment}-packshare-uploads"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false # Allow bucket policy for public reads
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["Content-Type"]
    allowed_methods = ["PUT"]
    allowed_origins = var.allowed_origins
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket     = aws_s3_bucket.uploads.id
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadTournaments"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.uploads.arn}/tournaments/*"
      }
    ]
  })
}
