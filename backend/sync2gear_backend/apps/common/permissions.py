"""
Custom permission classes for sync2gear API.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import permissions
from apps.common.exceptions import PermissionDeniedError
from apps.common.utils import get_effective_client


class IsClientUser(permissions.BasePermission):
    """
    Permission class that allows only client role users.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'client'
        )


class IsStaffOrAdmin(permissions.BasePermission):
    """
    Permission class that allows staff and admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['staff', 'admin']
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission class that allows only admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows owners to edit, others to read.
    
    Assumes the object has a 'client' attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner (same client)
        if hasattr(obj, 'client'):
            return obj.client == request.user.client
        return False


class IsSameClient(permissions.BasePermission):
    """
    Permission class that restricts access to same client data.
    
    Assumes the object has a 'client' attribute.
    Handles impersonation: admin impersonating a client can access that client's data.
    """
    def has_permission(self, request, view):
        """Check if user is authenticated before allowing access."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin can access all clients (or impersonated client)
        if request.user.role == 'admin':
            # If impersonating, only allow access to impersonated client's data
            effective_client = get_effective_client(request)
            if effective_client and hasattr(obj, 'client'):
                return obj.client == effective_client
            # If not impersonating, admin can access all
            return True
        
        # Others can only access their own client's data
        if hasattr(obj, 'client'):
            effective_client = get_effective_client(request)
            if effective_client:
                return obj.client == effective_client
            return obj.client == request.user.client
        
        return False


class IsFloorUserOrAbove(permissions.BasePermission):
    """
    Permission class that allows floor_user, client, staff, and admin.
    
    Floor users are restricted to their assigned floor.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin and staff can access everything
        if request.user.role in ['admin', 'staff']:
            return True
        
        # Client users can access their client's data
        if request.user.role == 'client':
            return True
        
        # Floor users can access (but will be filtered by floor)
        if request.user.role == 'floor_user':
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Admin and staff can access everything
        if request.user.role in ['admin', 'staff']:
            return True
        
        # Floor users can only access their assigned floor
        if request.user.role == 'floor_user' and request.user.floor_id:
            if hasattr(obj, 'floor_id'):
                return obj.floor_id == request.user.floor_id
            if hasattr(obj, 'zone') and hasattr(obj.zone, 'floor_id'):
                return obj.zone.floor_id == request.user.floor_id
        
        # Client users can access their client's data
        if hasattr(obj, 'client'):
            return obj.client == request.user.client
        
        return False


class IsUserManager(permissions.BasePermission):
    """
    Permission class for user management.
    
    Allows:
    - admin: Can manage all users
    - staff: Can manage all users (for support)
    - client: Can manage users from their own client only
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin, staff, and client roles can manage users
        return request.user.role in ['admin', 'staff', 'client']
    
    def has_object_permission(self, request, view, obj):
        """Check if user can manage this specific user object."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin and staff can manage all users
        if request.user.role in ['admin', 'staff']:
            return True
        
        # Client users can only manage users from their own client
        if request.user.role == 'client':
            # Ensure the user being managed belongs to the same client
            if hasattr(obj, 'client'):
                return obj.client == request.user.client
            # If object doesn't have client, deny access
            return False
        
        return False
