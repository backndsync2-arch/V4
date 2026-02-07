#!/bin/bash

# Database Seeding Script for Sync2Gear
# This script seeds the database with initial data

set -e

echo "🌱 Starting database seeding..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
STAGE=${1:-prod}
REGION=${2:-us-east-1}
SERVICE_NAME="sync2gear-api"

echo -e "${YELLOW}Stage: ${STAGE}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"

# Get database endpoint from CloudFormation
echo -e "${YELLOW}Getting database endpoint from CloudFormation...${NC}"
DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${SERVICE_NAME}-${STAGE} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$DB_ENDPOINT" ]; then
    echo -e "${RED}❌ Database endpoint not found. Make sure the serverless stack is deployed first.${NC}"
    exit 1
fi

# Get database password from SSM Parameter Store
echo -e "${YELLOW}Getting database password from SSM...${NC}"
DB_PASSWORD=$(aws ssm get-parameter \
    --name "/${SERVICE_NAME}/${STAGE}/DB_PASSWORD" \
    --with-decryption \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ Database password not found in SSM Parameter Store.${NC}"
    exit 1
fi

# Set environment variables
export DATABASE_URL="postgresql://sync2gear_admin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/sync2gear"
export DJANGO_SETTINGS_MODULE="config.settings.production"
export AWS_REGION=${REGION}

# Change to backend directory
cd sync2gear_backend

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
fi

# Check for seed commands
echo -e "${YELLOW}Checking for seed commands...${NC}"

# Seed announcements templates if command exists
if python manage.py help | grep -q "seed_templates"; then
    echo -e "${YELLOW}Seeding announcement templates...${NC}"
    python manage.py seed_templates || echo -e "${YELLOW}⚠ seed_templates command failed or not needed${NC}"
fi

# Seed dev data if command exists
if python manage.py help | grep -q "seed_dev_data"; then
    echo -e "${YELLOW}Seeding development data...${NC}"
    python manage.py seed_dev_data || echo -e "${YELLOW}⚠ seed_dev_data command failed or not needed${NC}"
fi

# Seed music data if command exists
if python manage.py help | grep -q "seed_music"; then
    echo -e "${YELLOW}Seeding music data...${NC}"
    python manage.py seed_music || echo -e "${YELLOW}⚠ seed_music command failed or not needed${NC}"
fi

echo -e "${GREEN}✅ Database seeding completed!${NC}"

