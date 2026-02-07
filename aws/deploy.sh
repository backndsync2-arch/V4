#!/bin/bash
# AWS Deployment Script for Sync2Gear V4
# This script deploys the entire infrastructure and application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="sync2gear-${ENVIRONMENT}"
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32)}

echo -e "${GREEN}Starting Sync2Gear V4 AWS Deployment${NC}"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Stack Name: $STACK_NAME"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# Step 1: Deploy CloudFormation Stack
echo -e "\n${YELLOW}Step 1: Deploying CloudFormation Stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation-template.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        DatabasePassword="$DB_PASSWORD" \
        Environment="$ENVIRONMENT" \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

if [ $? -ne 0 ]; then
    echo -e "${RED}CloudFormation deployment failed!${NC}"
    exit 1
fi

# Get stack outputs
echo -e "\n${YELLOW}Retrieving stack outputs...${NC}"
AURORA_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`AuroraEndpoint`].OutputValue' \
    --output text \
    --region $AWS_REGION)

ECR_REPO_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryUri`].OutputValue' \
    --output text \
    --region $AWS_REGION)

MUSIC_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`MusicBucketName`].OutputValue' \
    --output text \
    --region $AWS_REGION)

LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaExecutionRoleArn`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "Aurora Endpoint: $AURORA_ENDPOINT"
echo "ECR Repository: $ECR_REPO_URI"
echo "Music Bucket: $MUSIC_BUCKET"

# Step 2: Build and Push Docker Image
echo -e "\n${YELLOW}Step 2: Building Docker image...${NC}"
cd ../backend/sync2gear_backend

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REPO_URI

# Build image
echo "Building Docker image..."
docker build -t sync2gear-api:latest .

# Tag image
IMAGE_TAG="${ECR_REPO_URI}:latest"
docker tag sync2gear-api:latest $IMAGE_TAG

# Push image
echo "Pushing image to ECR..."
docker push $IMAGE_TAG

cd ../../aws

# Step 3: Create Lambda Function
echo -e "\n${YELLOW}Step 3: Creating/Updating Lambda Function...${NC}"
LAMBDA_FUNCTION_NAME="${ENVIRONMENT}-sync2gear-api"

# Check if function exists
if aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $AWS_REGION &> /dev/null; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION_NAME \
        --image-uri $IMAGE_TAG \
        --region $AWS_REGION
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION_NAME \
        --environment "Variables={
            DJANGO_SETTINGS_MODULE=config.settings.production,
            DATABASE_SECRET_NAME=${ENVIRONMENT}/sync2gear/database,
            AWS_STORAGE_BUCKET_NAME=$MUSIC_BUCKET,
            AWS_REGION=$AWS_REGION,
            DEBUG=False
        }" \
        --timeout 30 \
        --memory-size 1024 \
        --region $AWS_REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $LAMBDA_FUNCTION_NAME \
        --package-type Image \
        --code ImageUri=$IMAGE_TAG \
        --role $LAMBDA_ROLE_ARN \
        --timeout 30 \
        --memory-size 1024 \
        --environment "Variables={
            DJANGO_SETTINGS_MODULE=config.settings.production,
            DATABASE_SECRET_NAME=${ENVIRONMENT}/sync2gear/database,
            AWS_STORAGE_BUCKET_NAME=$MUSIC_BUCKET,
            AWS_REGION=$AWS_REGION,
            DEBUG=False
        }" \
        --region $AWS_REGION
fi

# Step 4: Create API Gateway
echo -e "\n${YELLOW}Step 4: Setting up API Gateway...${NC}"
# This would typically be done via CloudFormation or Terraform
# For now, we'll provide instructions

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Create API Gateway REST API and connect to Lambda"
echo "2. Configure API Gateway WebSocket for real-time features"
echo "3. Set up EventBridge rules for scheduled tasks"
echo "4. Deploy frontend to Amplify"
echo "5. Configure custom domain and SSL certificates"

echo -e "\n${GREEN}Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs' \
    --output table \
    --region $AWS_REGION

