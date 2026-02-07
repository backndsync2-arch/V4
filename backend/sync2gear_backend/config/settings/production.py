"""
Production settings for sync2gear.

These settings are used in production deployment on AWS Lambda.
"""

from .base import *
import os
import pymongo

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['*']  # API Gateway handles host validation

# Database - MongoDB
# Use environment variables if available, otherwise use defaults
MONGODB_URL = os.environ.get('MONGODB_URI') or os.environ.get('MONGODB_URL') or 'mongodb+srv://backndsync2_db_user:QObM0opJLdHg2b3u@sync2gear.bjxcwmc.mongodb.net/sync2gear?appName=Sync2Gear'
MONGODB_NAME = os.environ.get('DB_NAME', 'sync2gear')

# Django's default database - SQLite for Django ORM models (User, Client, etc.)
# Note: MongoDB is used for other data via pymongo (see db.py)
# SQLite is required for Django ORM - MongoDB doesn't have native Django ORM support
# All Django models will be stored in SQLite, other data in MongoDB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/tmp/sync2gear_users.db',  # File-based SQLite for user persistence
    }
}

# MongoDB connection - don't connect at import time, use lazy connection via db.py
# This prevents blocking startup if MongoDB is unavailable
MONGO_CLIENT = None
MONGO_DB = None

# File Storage - Use local storage (S3 can be added later if needed)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
MEDIA_ROOT = '/tmp/media'  # Lambda /tmp directory
STATIC_ROOT = '/tmp/staticfiles'

# Email Configuration (optional - can be configured later)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@sync2gear.com'

# Security Settings (relaxed for API Gateway)
# API Gateway handles SSL termination, so we don't need these strict settings
SECURE_SSL_REDIRECT = False  # API Gateway handles SSL
SESSION_COOKIE_SECURE = False  # Not using cookies for auth (using JWT)
CSRF_COOKIE_SECURE = False  # Not using CSRF cookies
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
# HSTS is handled by API Gateway
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# CORS - Allow all origins for simplicity
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Channel Layers - Disabled for Lambda (WebSocket not supported in HTTP API)
# CHANNEL_LAYERS = {}

# Sentry Error Tracking (disabled - can be enabled later if needed)
# SENTRY_DSN = None
