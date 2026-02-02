# Terraform Backend Configuration for Staging
# Note: Run terraform/global first to create the state bucket

terraform {
  backend "s3" {
    bucket         = "packshare-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "packshare-terraform-locks"
    encrypt        = true
  }
}
