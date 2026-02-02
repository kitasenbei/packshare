# Terraform Backend Configuration for Production
# Note: Run terraform/global first to create the state bucket

terraform {
  backend "s3" {
    bucket         = "packshare-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "packshare-terraform-locks"
    encrypt        = true
  }
}
