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
# Use environment variables or AWS credentials file
# DO NOT commit actual credentials to git
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set"
    echo "Or use: aws configure"
    exit 1
fi

aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set default.region "${AWS_DEFAULT_REGION:-us-east-1}"
aws configure set default.output json

# Verify credentials
echo "Verifying credentials..."
aws sts get-caller-identity

echo "AWS credentials configured successfully!"
echo ""
echo "Note: For production, consider using IAM roles instead of access keys."
echo "These credentials are now stored in ~/.aws/credentials"

