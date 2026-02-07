#!/bin/bash

# Database Setup Script for Sync2Gear
# This script creates the RDS database and runs migrations

set -e

echo "🚀 Starting database setup..."

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
    echo -e "${YELLOW}Run: npx serverless deploy --stage ${STAGE} --region ${REGION}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database endpoint: ${DB_ENDPOINT}${NC}"

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
    echo -e "${YELLOW}Please set it first:${NC}"
    echo "aws ssm put-parameter --name \"/${SERVICE_NAME}/${STAGE}/DB_PASSWORD\" --value \"YOUR_PASSWORD\" --type \"SecureString\" --region ${REGION}"
    exit 1
fi

echo -e "${GREEN}✓ Database password retrieved${NC}"

# Set environment variables
export DATABASE_URL="postgresql://sync2gear_admin:${DB_PASSWORD}@${DB_ENDPOINT}:5432/sync2gear"
export DJANGO_SETTINGS_MODULE="config.settings.production"
export AWS_REGION=${REGION}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠ psql not found. Installing PostgreSQL client...${NC}"
    echo "Please install PostgreSQL client tools to run migrations."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Wait for database to be available
echo -e "${YELLOW}Waiting for database to be available...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_ENDPOINT}" -U sync2gear_admin -d postgres -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ Database is available${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "${YELLOW}Attempt ${ATTEMPT}/${MAX_ATTEMPTS}...${NC}"
    sleep 5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Database is not available after ${MAX_ATTEMPTS} attempts${NC}"
    exit 1
fi

# Create database if it doesn't exist
echo -e "${YELLOW}Creating database if it doesn't exist...${NC}"
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_ENDPOINT}" -U sync2gear_admin -d postgres -c "CREATE DATABASE sync2gear;" 2>/dev/null || echo "Database already exists"

# Run Django migrations
echo -e "${YELLOW}Running Django migrations...${NC}"
cd sync2gear_backend

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Run migrations
python manage.py migrate --noinput

echo -e "${GREEN}✓ Migrations completed${NC}"

# Create superuser (optional)
echo -e "${YELLOW}Do you want to create a superuser? (y/n)${NC}"
read -r CREATE_SUPERUSER

if [ "$CREATE_SUPERUSER" = "y" ] || [ "$CREATE_SUPERUSER" = "Y" ]; then
    python manage.py createsuperuser
fi

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo -e "${GREEN}Database endpoint: ${DB_ENDPOINT}${NC}"

