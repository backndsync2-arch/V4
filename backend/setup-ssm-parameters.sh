#!/bin/bash

# SSM Parameter Setup Script for Sync2Gear
# This script sets up all required SSM parameters before deployment

set -e

echo "🔐 Setting up SSM Parameters..."

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

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to generate secret key
generate_secret_key() {
    python3 -c "import secrets; print(secrets.token_urlsafe(50))" 2>/dev/null || \
    openssl rand -hex 32
}

# Check if parameter exists
parameter_exists() {
    aws ssm get-parameter --name "$1" --region "$REGION" &>/dev/null
}

# Set parameter (create or update)
set_parameter() {
    local name=$1
    local value=$2
    local type=${3:-String}
    
    if parameter_exists "$name"; then
        echo -e "${YELLOW}Parameter $name already exists. Updating...${NC}"
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "$type" \
            --overwrite \
            --region "$REGION" > /dev/null
    else
        echo -e "${YELLOW}Creating parameter $name...${NC}"
        aws ssm put-parameter \
            --name "$name" \
            --value "$value" \
            --type "$type" \
            --region "$REGION" > /dev/null
    fi
    echo -e "${GREEN}✓ Parameter $name set${NC}"
}

# Database Password
echo -e "\n${YELLOW}Setting up database password...${NC}"
if parameter_exists "/${SERVICE_NAME}/${STAGE}/DB_PASSWORD"; then
    echo -e "${YELLOW}Database password already exists.${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_DB_PASSWORD
    if [ "$UPDATE_DB_PASSWORD" = "y" ] || [ "$UPDATE_DB_PASSWORD" = "Y" ]; then
        read -sp "Enter new database password: " DB_PASSWORD
        echo
        set_parameter "/${SERVICE_NAME}/${STAGE}/DB_PASSWORD" "$DB_PASSWORD" "SecureString"
    fi
else
    DB_PASSWORD=$(generate_password)
    set_parameter "/${SERVICE_NAME}/${STAGE}/DB_PASSWORD" "$DB_PASSWORD" "SecureString"
    echo -e "${GREEN}Generated database password: ${DB_PASSWORD}${NC}"
    echo -e "${YELLOW}⚠ Save this password securely!${NC}"
fi

# Django Secret Key
echo -e "\n${YELLOW}Setting up Django secret key...${NC}"
if parameter_exists "/${SERVICE_NAME}/${STAGE}/SECRET_KEY"; then
    echo -e "${YELLOW}Secret key already exists.${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_SECRET
    if [ "$UPDATE_SECRET" = "y" ] || [ "$UPDATE_SECRET" = "Y" ]; then
        SECRET_KEY=$(generate_secret_key)
        set_parameter "/${SERVICE_NAME}/${STAGE}/SECRET_KEY" "$SECRET_KEY" "SecureString"
    fi
else
    SECRET_KEY=$(generate_secret_key)
    set_parameter "/${SERVICE_NAME}/${STAGE}/SECRET_KEY" "$SECRET_KEY" "SecureString"
fi

# JWT Secret Key
echo -e "\n${YELLOW}Setting up JWT secret key...${NC}"
if parameter_exists "/${SERVICE_NAME}/${STAGE}/JWT_SECRET_KEY"; then
    echo -e "${YELLOW}JWT secret key already exists.${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_JWT
    if [ "$UPDATE_JWT" = "y" ] || [ "$UPDATE_JWT" = "Y" ]; then
        JWT_SECRET_KEY=$(generate_secret_key)
        set_parameter "/${SERVICE_NAME}/${STAGE}/JWT_SECRET_KEY" "$JWT_SECRET_KEY" "SecureString"
    fi
else
    JWT_SECRET_KEY=$(generate_secret_key)
    set_parameter "/${SERVICE_NAME}/${STAGE}/JWT_SECRET_KEY" "$JWT_SECRET_KEY" "SecureString"
fi

# CORS Allowed Origins
echo -e "\n${YELLOW}Setting up CORS allowed origins...${NC}"
if parameter_exists "/${SERVICE_NAME}/${STAGE}/CORS_ALLOWED_ORIGINS"; then
    CURRENT_ORIGINS=$(aws ssm get-parameter \
        --name "/${SERVICE_NAME}/${STAGE}/CORS_ALLOWED_ORIGINS" \
        --region "$REGION" \
        --query 'Parameter.Value' \
        --output text)
    echo -e "${YELLOW}Current CORS origins: ${CURRENT_ORIGINS}${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_CORS
    if [ "$UPDATE_CORS" = "y" ] || [ "$UPDATE_CORS" = "Y" ]; then
        read -p "Enter CORS allowed origins (comma-separated, e.g., https://app.amplifyapp.com): " CORS_ORIGINS
        set_parameter "/${SERVICE_NAME}/${STAGE}/CORS_ALLOWED_ORIGINS" "$CORS_ORIGINS" "String"
    fi
else
    read -p "Enter CORS allowed origins (comma-separated, e.g., https://app.amplifyapp.com): " CORS_ORIGINS
    CORS_ORIGINS=${CORS_ORIGINS:-"*"}
    set_parameter "/${SERVICE_NAME}/${STAGE}/CORS_ALLOWED_ORIGINS" "$CORS_ORIGINS" "String"
fi

# Frontend Domain
echo -e "\n${YELLOW}Setting up frontend domain...${NC}"
if parameter_exists "/${SERVICE_NAME}/${STAGE}/FRONTEND_DOMAIN"; then
    CURRENT_DOMAIN=$(aws ssm get-parameter \
        --name "/${SERVICE_NAME}/${STAGE}/FRONTEND_DOMAIN" \
        --region "$REGION" \
        --query 'Parameter.Value' \
        --output text)
    echo -e "${YELLOW}Current frontend domain: ${CURRENT_DOMAIN}${NC}"
    read -p "Do you want to update it? (y/n): " UPDATE_DOMAIN
    if [ "$UPDATE_DOMAIN" = "y" ] || [ "$UPDATE_DOMAIN" = "Y" ]; then
        read -p "Enter frontend domain (e.g., app.amplifyapp.com): " FRONTEND_DOMAIN
        set_parameter "/${SERVICE_NAME}/${STAGE}/FRONTEND_DOMAIN" "$FRONTEND_DOMAIN" "String"
    fi
else
    read -p "Enter frontend domain (e.g., app.amplifyapp.com, or press Enter to skip): " FRONTEND_DOMAIN
    if [ -n "$FRONTEND_DOMAIN" ]; then
        set_parameter "/${SERVICE_NAME}/${STAGE}/FRONTEND_DOMAIN" "$FRONTEND_DOMAIN" "String"
    fi
fi

echo -e "\n${GREEN}✅ All SSM parameters set up successfully!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review the parameters in AWS Systems Manager"
echo "2. Run: npx serverless deploy --region ${REGION}"


