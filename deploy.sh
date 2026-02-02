#!/bin/bash
set -e

# PackShare Deployment Script
# Usage: ./deploy.sh [staging|prod] [component]
# Components: all, frontend, auth, backend

ENVIRONMENT="${1:-staging}"
COMPONENT="${2:-all}"
REGION="us-east-1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[x]${NC} $1"; exit 1; }

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "prod" ]]; then
    error "Invalid environment: $ENVIRONMENT (use 'staging' or 'prod')"
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [[ -z "$AWS_ACCOUNT_ID" ]]; then
    error "Failed to get AWS account ID. Check your AWS credentials."
fi

# Set environment-specific variables
if [[ "$ENVIRONMENT" == "staging" ]]; then
    S3_BUCKET="staging-packshare-frontend-${AWS_ACCOUNT_ID}"
    CLOUDFRONT_ID="E2Q87J8EKCJCYB"
    AUTH_LAMBDA="staging-packshare-auth"
    BACKEND_LAMBDA="staging-packshare-backend"
else
    S3_BUCKET="prod-packshare-frontend-${AWS_ACCOUNT_ID}"
    CLOUDFRONT_ID=""  # TODO: Set prod CloudFront ID
    AUTH_LAMBDA="prod-packshare-auth"
    BACKEND_LAMBDA="prod-packshare-backend"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Deploy Frontend
deploy_frontend() {
    log "Building frontend..."
    cd "$SCRIPT_DIR/frontend"
    npm run build

    log "Deploying frontend to S3 ($S3_BUCKET)..."
    aws s3 sync dist/ "s3://${S3_BUCKET}" --delete --region "$REGION"

    if [[ -n "$CLOUDFRONT_ID" ]]; then
        log "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_ID" \
            --paths "/*" \
            --region "$REGION" \
            --output text --query 'Invalidation.Id'
    else
        warn "No CloudFront distribution ID set, skipping cache invalidation"
    fi

    log "Frontend deployed!"
}

# Deploy Auth Lambda
deploy_auth() {
    log "Building auth Lambda..."
    cd "$SCRIPT_DIR/auth"

    # Use Docker to build for Lambda Linux environment
    if command -v docker &> /dev/null; then
        log "Using Docker for Linux-compatible build..."

        # Copy to temp dir to avoid permission issues
        TEMP_DIR=$(mktemp -d)
        cp -r "$SCRIPT_DIR/auth/"* "$TEMP_DIR/"
        chmod -R 777 "$TEMP_DIR"

        # Login to ECR public
        aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws 2>/dev/null

        docker run --rm -v "$TEMP_DIR:/var/task" \
            public.ecr.aws/sam/build-python3.12:latest \
            /bin/bash -c "cd /var/task && pip install -r requirements.txt -t package --quiet && cp -r *.py utils/ package/"

        cd "$TEMP_DIR/package"
        zip -r9 "$SCRIPT_DIR/auth-lambda.zip" . -x "*.pyc" -x "__pycache__/*" > /dev/null
        rm -rf "$TEMP_DIR"
    else
        warn "Docker not available, using pip with platform flag (may not work for all packages)..."
        TEMP_DIR=$(mktemp -d)
        pip install -r requirements.txt -t "$TEMP_DIR" \
            --quiet --upgrade \
            --platform manylinux2014_x86_64 \
            --only-binary=:all:
        cp -r *.py utils/ "$TEMP_DIR/"
        cd "$TEMP_DIR"
        zip -r9 "$SCRIPT_DIR/auth-lambda.zip" . -x "*.pyc" -x "__pycache__/*" > /dev/null
        rm -rf "$TEMP_DIR"
    fi

    log "Deploying auth Lambda ($AUTH_LAMBDA)..."
    aws lambda update-function-code \
        --function-name "$AUTH_LAMBDA" \
        --zip-file "fileb://$SCRIPT_DIR/auth-lambda.zip" \
        --region "$REGION" \
        --output text --query 'LastModified'

    rm -f "$SCRIPT_DIR/auth-lambda.zip"
    log "Auth Lambda deployed!"
}

# Deploy Backend Lambda
deploy_backend() {
    log "Building backend Lambda..."
    cd "$SCRIPT_DIR/backend"

    # Build Go binary for Lambda
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap ./cmd/lambda

    # Create zip
    zip -j "$SCRIPT_DIR/backend-lambda.zip" bootstrap > /dev/null

    log "Deploying backend Lambda ($BACKEND_LAMBDA)..."
    aws lambda update-function-code \
        --function-name "$BACKEND_LAMBDA" \
        --zip-file "fileb://$SCRIPT_DIR/backend-lambda.zip" \
        --region "$REGION" \
        --output text --query 'LastModified'

    rm bootstrap "$SCRIPT_DIR/backend-lambda.zip"
    log "Backend Lambda deployed!"
}

# Main
echo ""
echo "=========================================="
echo "  PackShare Deploy - ${ENVIRONMENT^^}"
echo "=========================================="
echo ""

case "$COMPONENT" in
    all)
        deploy_frontend
        echo ""
        deploy_auth
        echo ""
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    auth)
        deploy_auth
        ;;
    backend)
        deploy_backend
        ;;
    *)
        error "Invalid component: $COMPONENT (use 'all', 'frontend', 'auth', or 'backend')"
        ;;
esac

echo ""
log "Deployment complete!"
