import os
import sys

# Add the sync2gear_backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Set Django settings before importing Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.lambda_production')

import django
django.setup()

# Import ASGI application (not WSGI)
from django.core.asgi import get_asgi_application
from mangum import Mangum

# Create ASGI application
application = get_asgi_application()

# Wrap with Mangum for Lambda
handler = Mangum(application, lifespan="off")

