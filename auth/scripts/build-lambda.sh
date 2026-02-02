#!/bin/bash
# Build script for Python Lambda deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/dist"
PACKAGE_DIR="${OUTPUT_DIR}/package"

echo "Building Python Lambda function..."
echo "Project directory: ${PROJECT_DIR}"

# Clean previous build
rm -rf "${OUTPUT_DIR}"
mkdir -p "${PACKAGE_DIR}"

# Install dependencies for Lambda (Linux x86_64)
echo "Installing dependencies..."
pip install -r "${PROJECT_DIR}/requirements.txt" -t "${PACKAGE_DIR}" \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.12 \
    --only-binary=:all: \
    --quiet

# Copy source files
echo "Copying source files..."
cp "${PROJECT_DIR}"/*.py "${PACKAGE_DIR}/"
cp -r "${PROJECT_DIR}/utils" "${PACKAGE_DIR}/"

# Create zip
echo "Creating deployment.zip..."
cd "${PACKAGE_DIR}"
zip -rq "${OUTPUT_DIR}/deployment.zip" .

# Clean up package directory
rm -rf "${PACKAGE_DIR}"

echo "Build complete!"
echo "Deployment package: ${OUTPUT_DIR}/deployment.zip"
echo ""
echo "To deploy manually:"
echo "  aws lambda update-function-code --function-name <function-name> --zip-file fileb://${OUTPUT_DIR}/deployment.zip"
