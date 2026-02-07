"""
Base settings for sync2gear project.

These settings are shared across all environments.
"""

import os
from pathlib import Path
from datetime import timedelta
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-this-in-production')

# Application definition
INSTALLED_APPS = [
    # Minimal Django apps for API only
    'django.contrib.auth',  # Needed for JWT
    'django.contrib.contenttypes',  # Needed for DRF
    'django.contrib.sessions',  # Needed for sessions (optional, can remove if not using)
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    
    # Local apps
    'apps.common',
    'apps.authentication',
    'apps.music',
    'apps.announcements',
    'apps.scheduler',
    'apps.zones',
    'apps.playback',
    'apps.admin_panel',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.common.middleware.ImpersonationLogMiddleware',  # Impersonation logging (before audit log)
    'apps.common.middleware.AuditLogMiddleware',  # Custom audit logging
]

# Impersonation session timeout (in hours)
IMPERSONATION_SESSION_TIMEOUT_HOURS = 8

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
# ASGI_APPLICATION = 'config.asgi.application'  # Disabled - not needed for Lambda

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=int(env('JWT_ACCESS_TOKEN_LIFETIME_HOURS', default=1))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(env('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET_KEY', default=SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS Settings
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5173',
    'http://127.0.0.1:5173',
])
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
    'x-impersonate-client',  # Custom header for admin impersonation
]

# Channels (WebSocket) - Disabled for Lambda
# CHANNEL_LAYERS = {}

# Celery Configuration - Disabled for Lambda (use separate service if needed)
# CELERY_BROKER_URL = None

# File Upload Limits
DATA_UPLOAD_MAX_MEMORY_SIZE = int(env('MAX_UPLOAD_SIZE_MB', default=50)) * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = int(env('MAX_UPLOAD_SIZE_MB', default=50)) * 1024 * 1024
MAX_MUSIC_FILE_SIZE = int(env('MAX_MUSIC_FILE_SIZE_MB', default=100)) * 1024 * 1024

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'sync2gear API',
    'DESCRIPTION': 'Music and announcements management system API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v1/',
    'COMPONENT_SPLIT_REQUEST': True,
}

# Logging Configuration
# Lambda has read-only filesystem except /tmp
if os.environ.get('AWS_LAMBDA_FUNCTION_NAME'):
    # Running in Lambda - use /tmp for logs directory
    LOG_DIR = '/tmp/logs'
    # Lambda uses CloudWatch for logs, not file-based logging
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'root': {
            'handlers': ['console'],
            'level': env('LOG_LEVEL', default='INFO'),
        },
        'loggers': {
            'django': {
                'handlers': ['console'],
                'level': env('LOG_LEVEL', default='INFO'),
                'propagate': False,
            },
            'apps': {
                'handlers': ['console'],
                'level': env('LOG_LEVEL', default='INFO'),
                'propagate': False,
            },
        },
    }
else:
    # Local development - use file-based logging
    LOG_DIR = BASE_DIR / 'logs'
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
            'file': {
                'class': 'logging.FileHandler',
                'filename': LOG_DIR / 'django.log',
                'formatter': 'verbose',
            },
        },
        'root': {
            'handlers': ['console', 'file'],
            'level': env('LOG_LEVEL', default='INFO'),
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file'],
                'level': env('LOG_LEVEL', default='INFO'),
                'propagate': False,
            },
            'apps': {
                'handlers': ['console', 'file'],
                'level': env('LOG_LEVEL', default='INFO'),
                'propagate': False,
            },
        },
    }
    # Create logs directory if it doesn't exist (only in local development)
    os.makedirs(LOG_DIR, exist_ok=True)
