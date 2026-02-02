# PackShare Terraform Infrastructure

This directory contains Terraform configurations for deploying PackShare to AWS.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │     │   API Gateway   │     │   API Gateway   │
│   + S3 Bucket   │     │   /api/*        │     │   /auth/*       │
│   (Frontend)    │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────▼────────┐     ┌────────▼────────┐
         │              │  Lambda (Go)    │     │  Lambda (Python)│
         │              │  Backend API    │     │  Auth Service   │
         │              └────────┬────────┘     └─────────────────┘
         │                       │
         │              ┌────────▼────────┐
         │              │  RDS PostgreSQL │
         │              │  (Private VPC)  │
         │              └─────────────────┘
```

## Directory Structure

```
terraform/
├── environments/
│   ├── staging/     # Staging environment
│   └── prod/        # Production environment
├── modules/
│   ├── vpc/         # VPC, subnets, NAT, endpoints
│   ├── rds/         # PostgreSQL database
│   ├── lambda-backend/  # Go API Lambda
│   ├── lambda-auth/     # Python auth Lambda
│   ├── api-gateway/     # HTTP API routing
│   ├── frontend/        # S3 + CloudFront
│   ├── secrets/         # Secrets Manager
│   └── iam/             # Roles and policies
└── global/          # Terraform state bucket
```

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0
3. osu! OAuth credentials from https://osu.ppy.sh/home/account/edit#oauth

## Initial Setup

### 1. Create State Bucket (one-time)

```bash
cd terraform/global
terraform init
terraform apply
```

### 2. Configure Environment Variables

Copy and edit the tfvars file for your environment:

```bash
cd terraform/environments/staging
cp terraform.tfvars terraform.tfvars.local
# Edit terraform.tfvars.local with your osu! OAuth credentials
```

### 3. Deploy Staging

```bash
cd terraform/environments/staging
terraform init
terraform plan -var-file=terraform.tfvars.local
terraform apply -var-file=terraform.tfvars.local
```

### 4. Deploy Production

```bash
cd terraform/environments/prod
terraform init
terraform plan -var-file=terraform.tfvars.local
terraform apply -var-file=terraform.tfvars.local
```

## Environment Differences

| Resource | Staging | Production |
|----------|---------|------------|
| RDS Instance | db.t3.micro | db.t3.small |
| RDS Multi-AZ | No | Yes |
| RDS Storage | 20 GB | 50 GB |
| NAT Gateway | Single | Per-AZ |
| Lambda Concurrency | 5 | 100 |
| Lambda Memory | 256 MB | 512 MB |
| CloudFront | PriceClass_100 | PriceClass_200 |
| Backups | 1 day | 7 days |

## GitHub Actions Deployment

The project includes GitHub Actions workflows for automated deployment:

1. **On push to main**: Deploys to staging automatically
2. **Manual dispatch**: Choose staging or prod environment
3. **Production**: Requires manual approval via GitHub environments

### Required GitHub Secrets

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `OSU_CLIENT_ID` - osu! OAuth client ID
- `OSU_CLIENT_SECRET` - osu! OAuth client secret

### Required GitHub Environments

Create two environments in GitHub repository settings:
- `staging` - No protection rules
- `prod` - Enable "Required reviewers" protection

## Building Lambda Functions

### Backend (Go)

```bash
cd backend
./scripts/build-lambda.sh
# Output: backend/dist/deployment.zip
```

### Auth (Python)

```bash
cd auth
./scripts/build-lambda.sh
# Output: auth/dist/deployment.zip
```

## Outputs

After deployment, Terraform outputs:

- `application_url` - Main application URL (CloudFront)
- `api_url` - API Gateway URL for /api/*
- `auth_url` - API Gateway URL for /auth/*
- `frontend_bucket_name` - S3 bucket for frontend files
- `cloudfront_distribution_id` - For cache invalidation

## Cost Estimates

- **Staging**: ~$50-70/month
- **Production**: ~$200-300/month (traffic dependent)

## Troubleshooting

### Lambda can't connect to RDS

Check that:
1. Lambda is in VPC private subnets
2. Security group allows outbound to RDS security group on port 5432
3. RDS security group allows inbound from Lambda security group

### Lambda can't access Secrets Manager

Ensure the VPC endpoint for Secrets Manager is created and the Lambda IAM role has the necessary permissions.

### CloudFront returns 403 for SPA routes

The CloudFront distribution includes custom error responses to return index.html for 403/404 errors, enabling SPA routing.
