"""
Lambda-specific production settings

These settings are optimized for AWS Lambda deployment.
Lambda uses CloudWatch for logs, not file-based logging.
"""

from .production import *
import os
import pymongo

# MongoDB connection for Lambda
MONGODB_URI = os.environ.get('MONGODB_URI')
if MONGODB_URI:
    # Use connection string if provided (use as-is, don't modify)
    MONGODB_URL = MONGODB_URI
    # Extract database name from URI if not provided separately
    if not os.environ.get('DB_NAME'):
        # Try to extract from URI (mongodb+srv://user:pass@host/dbname)
        try:
            db_name = MONGODB_URI.split('/')[-1].split('?')[0]
            MONGODB_NAME = db_name if db_name else 'sync2gear'
        except:
            MONGODB_NAME = os.environ.get('DB_NAME', 'sync2gear')
    else:
        MONGODB_NAME = os.environ.get('DB_NAME', 'sync2gear')
else:
    # Fallback to individual settings
    DB_HOST = os.environ.get('DB_HOST', 'sync2gear.bjxcwmc.mongodb.net')
    DB_PORT = int(os.environ.get('DB_PORT', 27017))
    DB_NAME = os.environ.get('DB_NAME', 'sync2gear')
    DB_USER = os.environ.get('DB_USER', 'backndsync2_db_user')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'QObM0opJLdHg2b3u')
    
    if DB_USER and DB_PASSWORD:
        # URL encode password if needed
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
        encoded_user = urllib.parse.quote_plus(DB_USER)
        MONGODB_URL = f'mongodb+srv://{encoded_user}:{encoded_password}@{DB_HOST}/{DB_NAME}?retryWrites=true&w=majority&appName=Sync2Gear'
    elif DB_HOST:
        MONGODB_URL = f'mongodb://{DB_HOST}:{DB_PORT}/{DB_NAME}'
    else:
        # Fallback to production default
        MONGODB_URL = 'mongodb+srv://backndsync2_db_user:QObM0opJLdHg2b3u@sync2gear.bjxcwmc.mongodb.net/sync2gear?appName=Sync2Gear'
    
    MONGODB_NAME = DB_NAME

# MongoDB connection using pymongo directly
# Don't fail startup if MongoDB connection fails - let it connect lazily
MONGO_CLIENT = None
MONGO_DB = None

# Lambda uses CloudWatch for logs, not file-based logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '%(levelname)s %(asctime)s %(name)s %(message)s'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Use in-memory cache for Lambda (no Redis required)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Disable file-based sessions (use cache)
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# Static/media for Lambda
STATIC_ROOT = '/tmp/static'
MEDIA_ROOT = '/tmp/media'

