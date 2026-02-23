# Frontend Module - S3 + CloudFront

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# S3 bucket for static files
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.environment}-packshare-frontend-${var.aws_account_id}"

  tags = {
    Name        = "${var.environment}-packshare-frontend"
    Environment = var.environment
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy for CloudFront OAC
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.environment}-packshare-oac"
  description                       = "OAC for PackShare frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function for SPA routing (only applies to S3 origin)
# Rewrites paths without file extensions to /index.html so React Router handles them.
# This replaces custom_error_response which incorrectly intercepted API 404s too.
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${var.environment}-packshare-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      // If the URI has a file extension, serve it as-is (JS, CSS, images, etc.)
      if (uri.includes('.')) {
        return request;
      }
      // Otherwise rewrite to index.html for SPA routing
      request.uri = '/index.html';
      return request;
    }
  EOF
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "PackShare ${var.environment} frontend"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # API Gateway origin for /api/* and /auth/*
  dynamic "origin" {
    for_each = var.api_gateway_domain != "" ? [1] : []
    content {
      domain_name = var.api_gateway_domain
      origin_id   = "APIGateway"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    # SPA rewrite — only runs on S3 origin, not API
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # API routes behavior
  dynamic "ordered_cache_behavior" {
    for_each = var.api_gateway_domain != "" ? [1] : []
    content {
      path_pattern           = "/api/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      target_origin_id       = "APIGateway"
      viewer_protocol_policy = "https-only"
      compress               = true

      forwarded_values {
        query_string = true
        headers      = ["Authorization", "Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  # Auth routes behavior
  dynamic "ordered_cache_behavior" {
    for_each = var.api_gateway_domain != "" ? [1] : []
    content {
      path_pattern           = "/auth/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      target_origin_id       = "APIGateway"
      viewer_protocol_policy = "https-only"
      compress               = true

      forwarded_values {
        query_string = true
        headers      = ["Authorization", "Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
        cookies {
          forward = "all"
        }
      }

      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  aliases = var.domain_names

  tags = {
    Name        = "${var.environment}-packshare-cdn"
    Environment = var.environment
  }
}
