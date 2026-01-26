"""
Common views for sync2gear API.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache
import redis
import logging

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring system status.
    
    Checks:
    - Database connectivity
    - Redis connectivity
    - S3 storage (if configured)
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        """Perform health checks and return status."""
        checks = {
            'database': self._check_database(),
            'redis': self._check_redis(),
            's3': self._check_s3(),
        }
        
        # Overall status
        all_healthy = all(checks.values())
        overall_status = 'healthy' if all_healthy else 'degraded'
        
        status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response({
            'status': overall_status,
            'checks': checks,
        }, status=status_code)
    
    def _check_database(self):
        """Check database connectivity."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def _check_redis(self):
        """Check Redis connectivity."""
        try:
            r = redis.Redis(
                host=cache._cache.get_master_client().connection_pool.connection_kwargs.get('host', 'localhost'),
                port=cache._cache.get_master_client().connection_pool.connection_kwargs.get('port', 6379),
                socket_connect_timeout=2
            )
            r.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    def _check_s3(self):
        """Check S3 storage connectivity (if configured)."""
        try:
            from django.conf import settings
            if hasattr(settings, 'USE_S3') and settings.USE_S3:
                import boto3
                s3 = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                s3.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
                return True
            return True  # S3 not required
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False


class APIRootView(APIView):
    """
    Root API endpoint that provides information about available endpoints.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        """Return API information and available endpoints."""
        base_url = request.build_absolute_uri('/')
        
        return Response({
            'name': 'sync2gear API',
            'version': '1.0.0',
            'description': 'sync2gear Backend API - Music and Announcement Management System',
            'documentation': {
                'swagger': f'{base_url}api/docs/',
                'redoc': f'{base_url}api/redoc/',
                'schema': f'{base_url}api/schema/',
            },
            'endpoints': {
                'authentication': {
                    'base': f'{base_url}api/v1/auth/',
                    'login': f'{base_url}api/v1/auth/login/',
                    'signup': f'{base_url}api/v1/auth/signup/',
                    'logout': f'{base_url}api/v1/auth/logout/',
                    'current_user': f'{base_url}api/v1/auth/me/',
                    'refresh_token': f'{base_url}api/v1/auth/refresh/',
                },
                'music': {
                    'base': f'{base_url}api/v1/music/',
                    'folders': f'{base_url}api/v1/music/folders/',
                    'files': f'{base_url}api/v1/music/files/',
                    'upload': f'{base_url}api/v1/music/files/',
                },
                'announcements': {
                    'base': f'{base_url}api/v1/announcements/',
                    'list': f'{base_url}api/v1/announcements/',
                    'tts': f'{base_url}api/v1/announcements/tts/',
                },
                'schedules': {
                    'base': f'{base_url}api/v1/schedules/',
                },
                'zones': {
                    'base': f'{base_url}api/v1/zones/',
                    'devices': {
                        'base': f'{base_url}api/v1/zones/devices/',
                        'register': f'{base_url}api/v1/zones/devices/register/',
                    },
                },
                'playback': {
                    'base': f'{base_url}api/v1/playback/',
                    'state': f'{base_url}api/v1/playback/state/',
                    'control': {
                        'play': f'{base_url}api/v1/playback/control/play/',
                        'pause': f'{base_url}api/v1/playback/control/pause/',
                        'resume': f'{base_url}api/v1/playback/control/resume/',
                        'next': f'{base_url}api/v1/playback/control/next/',
                        'previous': f'{base_url}api/v1/playback/control/previous/',
                        'volume': f'{base_url}api/v1/playback/control/volume/',
                        'seek': f'{base_url}api/v1/playback/control/seek/',
                    },
                },
                'admin': {
                    'base': f'{base_url}api/v1/admin/',
                    'clients': f'{base_url}api/v1/admin/clients/',
                    'users': f'{base_url}api/v1/admin/users/',
                    'stats': f'{base_url}api/v1/admin/stats/',
                },
                'websocket': {
                    'playback': f'ws://{request.get_host()}/ws/playback/{{zone_id}}/',
                    'events': f'ws://{request.get_host()}/ws/events/',
                },
            },
        })
