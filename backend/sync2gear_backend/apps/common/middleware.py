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
    - POST, PUT, PATCH, DELETE requests (all write operations)
    - GET requests for sensitive operations (downloads, exports, streaming)
    - User actions on resources
    - IP address and user agent
    """
    
    # Sensitive GET endpoints that should be logged
    SENSITIVE_GET_PATHS = [
        '/stream/',  # File streaming
        '/download/',  # File downloads
        '/export/',  # Data exports
        '/audit-logs/',  # Viewing audit logs
        '/stats/',  # System statistics
        '/users/',  # User lists/details
        '/clients/',  # Client lists/details
    ]
    
    # Endpoints to skip logging
    SKIP_PATHS = [
        '/api/health/',
        '/api/auth/refresh/',  # Token refresh (too frequent)
        '/api/schema/',  # API schema
        '/api/docs/',  # API docs
        '/api/redoc/',  # API docs
    ]
    
    def process_response(self, request, response):
        """Process response and create audit log if needed."""
        # Only log authenticated requests
        if not request.user or not request.user.is_authenticated:
            return response
        
        # Skip certain endpoints
        if any(request.path.startswith(path) for path in self.SKIP_PATHS):
            return response
        
        # Log write operations (POST, PUT, PATCH, DELETE)
        should_log = request.method in ['POST', 'PUT', 'PATCH', 'DELETE']
        
        # Also log sensitive GET operations
        if not should_log and request.method == 'GET':
            should_log = any(request.path.find(path) != -1 for path in self.SENSITIVE_GET_PATHS)
        
        if not should_log:
            return response
        
        try:
            # Determine action type
            if request.method == 'GET':
                # For GET requests, determine action based on path
                if 'stream' in request.path or 'download' in request.path:
                    action = 'download'
                elif 'export' in request.path:
                    action = 'export'
                elif 'audit-logs' in request.path:
                    action = 'view'
                elif 'stats' in request.path:
                    action = 'view'
                else:
                    action = 'view'
            else:
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
            
            # Only log successful operations (2xx status codes) to avoid cluttering with errors
            # Failed operations should be logged explicitly in views if needed
            if response.status_code >= 200 and response.status_code < 300:
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
                    logger.debug(f"Audit log created: {action} {resource_type} by {request.user}")
                except Exception as e:
                    # Don't fail the request if audit logging fails
                    logger.error(f"Failed to create audit log: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"Audit log middleware error: {e}")
        
        return response
    
    def _extract_resource_type(self, path):
        """Extract resource type from URL path with better parsing."""
        parts = [p for p in path.strip('/').split('/') if p]
        
        # Look for API prefix
        try:
            api_idx = parts.index('api')
            if api_idx + 1 < len(parts):
                # Get version if present
                version_idx = api_idx + 1
                if parts[version_idx] in ['v1', 'v2']:
                    resource_idx = version_idx + 1
                else:
                    resource_idx = version_idx
                
                if resource_idx < len(parts):
                    resource = parts[resource_idx]
                    # Handle plural resources (e.g., 'files' -> 'file', 'users' -> 'user')
                    if resource.endswith('s') and len(resource) > 1:
                        resource = resource[:-1]
                    # Handle special cases
                    resource_map = {
                        'audit-logs': 'audit_log',
                        'music-files': 'music_file',
                        'cover-art': 'cover_art',
                        'ai-providers': 'ai_provider',
                    }
                    return resource_map.get(resource, resource)
        except (ValueError, IndexError):
            pass
        
        # Fallback: try to extract from path
        if 'music' in path.lower():
            return 'music_file'
        elif 'announcement' in path.lower():
            return 'announcement'
        elif 'user' in path.lower():
            return 'user'
        elif 'client' in path.lower():
            return 'client'
        elif 'device' in path.lower():
            return 'device'
        elif 'zone' in path.lower():
            return 'zone'
        elif 'schedule' in path.lower():
            return 'schedule'
        elif 'playback' in path.lower():
            return 'playback'
        
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
