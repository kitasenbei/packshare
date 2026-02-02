# Staging Environment Configuration
# Copy this file and fill in the values

aws_region  = "us-east-1"
environment = "staging"

# osu! OAuth credentials (required)
# Get these from https://osu.ppy.sh/home/account/edit#oauth
# osu_client_id     = "your-client-id"
# osu_client_secret = "your-client-secret"

# Optional: Provide your own secrets or leave empty to auto-generate
# db_password = ""
# jwt_secret  = ""

# Lambda deployment zips (set via CI/CD or leave empty for initial setup)
# backend_lambda_zip = "../../../backend/deployment.zip"
# auth_lambda_zip    = "../../../auth/deployment.zip"

# Optional: Custom domain configuration
# domain_name         = "staging.packshare.example.com"
# acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
