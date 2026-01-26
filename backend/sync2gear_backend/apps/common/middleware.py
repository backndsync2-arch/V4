"""
Custom middleware for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from apps.admin_panel.models import AuditLog

logger = logging.getLogger(__name__)


class AuditLogMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log user actions for audit purposes.
    
    Logs:
    - POST, PUT, PATCH, DELETE requests
    - User actions on resources
    - IP address and user agent
    """
    
    def process_response(self, request, response):
        """Process response and create audit log if needed."""
        # Only log authenticated requests
        if not request.user or not request.user.is_authenticated:
            return response
        
        # Only log write operations
        if request.method not in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return response
        
        # Skip certain endpoints
        skip_paths = ['/api/health/', '/api/auth/login/', '/api/auth/refresh/']
        if any(request.path.startswith(path) for path in skip_paths):
            return response
        
        try:
            # Determine action type
            action_map = {
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete',
            }
            action = action_map.get(request.method, 'unknown')
            
            # Extract resource type from URL
            resource_type = self._extract_resource_type(request.path)
            
            # Extract resource ID from URL or request body
            resource_id = self._extract_resource_id(request)
            
            # Get request body (for details)
            try:
                body = json.loads(request.body.decode('utf-8')) if request.body else {}
            except:
                body = {}
            
            # Create audit log asynchronously (don't block response)
            # Use Celery task for this in production
            try:
                AuditLog.objects.create(
                    user=request.user,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    client=request.user.client if hasattr(request.user, 'client') else None,
                    details={
                        'path': request.path,
                        'method': request.method,
                        'body': body,
                        'status_code': response.status_code,
                    },
                    ip_address=self._get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                )
            except Exception as e:
                # Don't fail the request if audit logging fails
                logger.error(f"Failed to create audit log: {e}")
        
        except Exception as e:
            logger.error(f"Audit log middleware error: {e}")
        
        return response
    
    def _extract_resource_type(self, path):
        """Extract resource type from URL path."""
        parts = path.strip('/').split('/')
        if len(parts) >= 2 and parts[0] == 'api':
            return parts[-1].rstrip('/') or 'unknown'
        return 'unknown'
    
    def _extract_resource_id(self, request):
        """Extract resource ID from URL or request body."""
        # Try URL first (e.g., /api/music/files/{id}/)
        path_parts = request.path.strip('/').split('/')
        for part in reversed(path_parts):
            if part and part not in ['api', 'v1', 'files', 'folders', 'announcements', 'schedules', 'zones', 'devices']:
                try:
                    # Check if it's a valid UUID
                    import uuid
                    uuid.UUID(part)
                    return part
                except:
                    pass
        
        # Try request body
        try:
            body = json.loads(request.body.decode('utf-8')) if request.body else {}
            if 'id' in body:
                return str(body['id'])
        except:
            pass
        
        return None
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
