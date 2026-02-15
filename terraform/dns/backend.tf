terraform {
  backend "s3" {
    bucket         = "packshare-terraform-state"
    key            = "dns/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "packshare-terraform-locks"
    encrypt        = true
  }
}
