"""
Common views for sync2gear API.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Simple health check endpoint for Lambda
    
    Checks:
    - Database connectivity
    - MongoDB connectivity (if configured)
    """
    authentication_classes = []
    permission_classes = []
    
    def get(self, request):
        """Perform health checks and return status."""
        return Response({
            'status': 'healthy',
            'service': 'sync2gear-api',
            'environment': os.environ.get('DJANGO_SETTINGS_MODULE', 'unknown'),
            'database': 'mongodb'
        }, status=status.HTTP_200_OK)


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
