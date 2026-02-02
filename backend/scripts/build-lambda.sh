#!/bin/bash
# Build script for Go Lambda deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/dist"

echo "Building Lambda function..."
echo "Project directory: ${PROJECT_DIR}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Build for Linux AMD64 (Lambda runtime)
cd "${PROJECT_DIR}"

echo "Compiling Go binary for Linux/AMD64..."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build \
    -tags lambda.norpc \
    -ldflags="-s -w" \
    -o "${OUTPUT_DIR}/bootstrap" \
    ./cmd/lambda

echo "Creating deployment.zip..."
cd "${OUTPUT_DIR}"
zip -j deployment.zip bootstrap

# Clean up binary (optional, keep zip only)
rm -f bootstrap

echo "Build complete!"
echo "Deployment package: ${OUTPUT_DIR}/deployment.zip"
echo ""
echo "To deploy manually:"
echo "  aws lambda update-function-code --function-name <function-name> --zip-file fileb://${OUTPUT_DIR}/deployment.zip"
