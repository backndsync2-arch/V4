"""
Common utility functions for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
import logging
from typing import Optional, Dict, Any
from django.http import HttpRequest
from apps.admin_panel.models import AuditLog

logger = logging.getLogger(__name__)


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


def validate_uuid(value: str) -> bool:
    """Validate if a string is a valid UUID."""
    try:
        uuid.UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def get_client_from_request(request) -> Optional[object]:
    """Get client object from request user."""
    if not request.user or not request.user.is_authenticated:
        return None
    
    if hasattr(request.user, 'client'):
        return request.user.client
    
    return None


def get_impersonated_client(request) -> Optional[object]:
    """
    Get impersonated client from request header with hardened validation.
    
    Admin users can impersonate clients by sending X-Impersonate-Client header
    with the client ID. This allows admins to view/manage client accounts.
    
    This function now validates:
    1. User is admin (returns None if not, middleware will reject with 403)
    2. Client exists (returns None if not, middleware will reject with 404)
    3. Session hasn't expired (checks timeout)
    
    Returns:
        Client object if impersonating, None otherwise
    """
    from apps.authentication.models import Client
    from django.conf import settings
    from datetime import timedelta
    
    # Only allow impersonation for admin users
    if not request.user or not request.user.is_authenticated:
        return None
    
    # HARDENED: Reject non-admin users (middleware will return 403)
    if request.user.role != 'admin':
        return None
    
    # Check for impersonation header - Django converts headers to uppercase with underscores
    # X-Impersonate-Client becomes HTTP_X_IMPERSONATE_CLIENT in request.META
    impersonate_client_id = request.META.get('HTTP_X_IMPERSONATE_CLIENT')
    
    # Also check alternative formats (case variations)
    if not impersonate_client_id:
        # Try lowercase
        impersonate_client_id = request.META.get('HTTP_X_IMPERSONATE_CLIENT'.lower())
    if not impersonate_client_id:
        # Try checking all META keys that might match
        for key in request.META.keys():
            if 'impersonate' in key.lower() and 'client' in key.lower():
                impersonate_client_id = request.META.get(key)
                logger.debug(f"Found impersonation header in META key: {key} = {impersonate_client_id}")
                break
    
    if not impersonate_client_id:
        return None
    
    # Clean up the client ID (remove any whitespace)
    impersonate_client_id = str(impersonate_client_id).strip()
    
    # HARDENED: Validate client exists (middleware will return 404 if not)
    try:
        client = Client.objects.get(id=impersonate_client_id)
    except (Client.DoesNotExist, ValueError, TypeError) as e:
        logger.warning(f"Failed to get impersonated client {impersonate_client_id}: {e}")
        return None
    
    # HARDENED: Check session expiry
    from apps.admin_panel.models import ImpersonationLog
    timeout_hours = getattr(settings, 'IMPERSONATION_SESSION_TIMEOUT_HOURS', 8)
    timeout = timedelta(hours=timeout_hours)
    
    # Check for active session
    active_session = ImpersonationLog.objects.filter(
        admin_user=request.user,
        impersonated_client=client,
        ended_at__isnull=True
    ).first()
    
    if active_session:
        # Check if session expired
        from django.utils import timezone
        if timezone.now() - active_session.started_at > timeout:
            # Session expired - end it
            active_session.ended_at = timezone.now()
            active_session.save(update_fields=['ended_at'])
            logger.info(
                f"Impersonation session expired for admin {request.user.email} -> client {client.name}"
            )
            return None
    
    logger.debug(f"Admin {request.user.email} impersonating client: {client.name} (ID: {client.id})")
    return client


def get_effective_client(request) -> Optional[object]:
    """
    Get the effective client for filtering data.
    
    If admin is impersonating a client, return that client.
    Otherwise, return the user's client.
    
    Returns:
        Client object or None
    """
    # Check for impersonation first
    impersonated_client = get_impersonated_client(request)
    if impersonated_client:
        logger.debug(f"Using impersonated client: {impersonated_client.name} (ID: {impersonated_client.id})")
        return impersonated_client
    
    # Otherwise, use user's client
    user_client = get_client_from_request(request)
    if user_client:
        logger.debug(f"Using user's client: {user_client.name} (ID: {user_client.id})")
    else:
        logger.debug(f"No client found for user {request.user.email if request.user and request.user.is_authenticated else 'anonymous'} (role: {request.user.role if request.user and request.user.is_authenticated else 'N/A'})")
    return user_client


def log_audit_event(
    request: HttpRequest,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user: Optional[Any] = None,
    client: Optional[Any] = None,
    status_code: Optional[int] = None
) -> Optional[AuditLog]:
    """
    Create an audit log entry for a user action.
    
    This is the central function for creating audit logs across the application.
    Use this for explicit logging in views where middleware might not capture
    all necessary details.
    
    Args:
        request: Django request object
        action: Action performed (e.g., 'login', 'upload', 'delete', 'play', 'view')
        resource_type: Type of resource (e.g., 'music_file', 'announcement', 'user')
        resource_id: Optional UUID of the resource
        details: Optional dictionary with additional details
        user: Optional user object (defaults to request.user)
        client: Optional client object (defaults to user.client if available)
        status_code: Optional HTTP status code
    
    Returns:
        AuditLog instance or None if logging failed
    """
    try:
        # Get user
        if not user:
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return None
        
        # Get client
        if not client:
            client = getattr(user, 'client', None) if user else None
        
        # Get IP address
        ip_address = None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
        
        # Prepare details
        audit_details = details or {}
        if 'path' not in audit_details:
            audit_details['path'] = request.path
        if 'method' not in audit_details:
            audit_details['method'] = request.method
        if status_code:
            audit_details['status_code'] = status_code
        
        # Convert resource_id to UUID if it's a string
        resource_id_uuid = None
        if resource_id:
            try:
                if isinstance(resource_id, str):
                    resource_id_uuid = uuid.UUID(resource_id)
                else:
                    resource_id_uuid = resource_id
            except (ValueError, TypeError):
                pass
        
        # Create audit log
        audit_log = AuditLog.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id_uuid,
            client=client,
            details=audit_details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return audit_log
        
    except Exception as e:
        # Don't fail the request if audit logging fails
        logger.error(f"Failed to create audit log: {e}", exc_info=True)
        return None
