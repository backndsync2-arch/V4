#!/bin/bash
# Setup AWS Credentials Script
# This script helps configure AWS credentials securely

set -e

echo "Setting up AWS credentials..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Configure AWS credentials
echo "Configuring AWS credentials..."
aws configure set aws_access_key_id AKIA2HVQ5SVB56AGSDC6
aws configure set aws_secret_access_key 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
aws configure set default.region us-east-1
aws configure set default.output json

# Verify credentials
echo "Verifying credentials..."
aws sts get-caller-identity

echo "AWS credentials configured successfully!"
echo ""
echo "Note: For production, consider using IAM roles instead of access keys."
echo "These credentials are now stored in ~/.aws/credentials"

