"""
Admin panel views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, AIProvider
from .serializers import AuditLogSerializer, AIProviderSerializer, AIProviderCreateSerializer
from apps.authentication.models import Client, User
from apps.authentication.serializers import ClientSerializer, UserSerializer
from apps.common.permissions import IsAdmin, IsUserManager
from apps.common.exceptions import ValidationError
from apps.common.utils import log_audit_event, get_effective_client
import logging

logger = logging.getLogger(__name__)


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients (admin only).
    """
    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'business_name', 'email']
    ordering_fields = ['name', 'created_at', 'subscription_status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get all clients."""
        queryset = Client.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(subscription_status=status_filter)
        
        return queryset.prefetch_related('users')
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle client active status."""
        client = self.get_object()
        old_status = client.is_active
        client.is_active = not client.is_active
        client.save(update_fields=['is_active'])
        
        # Log client status change
        log_audit_event(
            request=request,
            action='toggle_status',
            resource_type='client',
            resource_id=str(client.id),
            details={
                'client_name': client.name,
                'old_status': old_status,
                'new_status': client.is_active,
            },
            user=request.user,
            status_code=status.HTTP_200_OK
        )
        
        return Response({
            'id': str(client.id),
            'is_active': client.is_active,
            'message': 'Client activated' if client.is_active else 'Client deactivated'
        })
    
    @action(detail=True, methods=['post'])
    def impersonate(self, request, pk=None):
        """
        Start impersonating a client (admin only).
        
        This allows admin users to view and manage the client's account
        as if they were a client user. All API requests will be filtered
        to show only the impersonated client's data.
        """
        client = self.get_object()
        
        # Log impersonation start
        log_audit_event(
            request=request,
            action='impersonate_start',
            resource_type='client',
            resource_id=str(client.id),
            details={
                'client_name': client.name,
                'client_email': client.email,
                'admin_user': request.user.email,
            },
            user=request.user,
            client=client,
            status_code=status.HTTP_200_OK
        )
        
        return Response({
            'client_id': str(client.id),
            'client_name': client.name,
            'message': f'Now impersonating {client.name}. All data will be filtered to this client.',
            'impersonation_active': True
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def stop_impersonate(self, request):
        """
        Stop impersonating a client (admin only).
        """
        # Log impersonation stop
        log_audit_event(
            request=request,
            action='impersonate_stop',
            resource_type='client',
            details={
                'admin_user': request.user.email,
            },
            user=request.user,
            status_code=status.HTTP_200_OK
        )
        
        return Response({
            'message': 'Stopped impersonating client',
            'impersonation_active': False
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def debug_impersonation(self, request):
        """
        Debug endpoint to check impersonation status and headers.
        """
        from apps.common.utils import get_impersonated_client, get_effective_client
        
        # Get all relevant headers
        relevant_headers = {
            k: v for k, v in request.META.items() 
            if 'impersonate' in k.lower() or 'x-' in k.lower()[:2].lower()
        }
        
        impersonated_client = get_impersonated_client(request)
        effective_client = get_effective_client(request)
        
        return Response({
            'user': {
                'email': request.user.email if request.user.is_authenticated else None,
                'role': request.user.role if request.user.is_authenticated else None,
                'has_client': hasattr(request.user, 'client') if request.user.is_authenticated else False,
                'client_id': str(request.user.client.id) if request.user.is_authenticated and hasattr(request.user, 'client') and request.user.client else None,
            },
            'headers': {
                'HTTP_X_IMPERSONATE_CLIENT': request.META.get('HTTP_X_IMPERSONATE_CLIENT'),
                'all_relevant': relevant_headers,
            },
            'impersonation': {
                'impersonated_client': {
                    'id': str(impersonated_client.id),
                    'name': impersonated_client.name,
                } if impersonated_client else None,
                'effective_client': {
                    'id': str(effective_client.id),
                    'name': effective_client.name,
                } if effective_client else None,
            },
        }, status=status.HTTP_200_OK)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users.
    
    Permissions:
    - admin: Can manage all users
    - staff: Can manage all users (for support)
    - client: Can manage users from their own client only
    - floor_user: Cannot access (no user management)
    """
    serializer_class = UserSerializer
    permission_classes = [IsUserManager]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email']
    ordering_fields = ['name', 'email', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get users based on role-based permissions and impersonation."""
        user = self.request.user
        effective_client = get_effective_client(self.request)
        
        # If admin is impersonating a client, show only that client's users
        if effective_client and user.role == 'admin':
            queryset = User.objects.filter(client=effective_client)
        # Admin and staff can see all users (when not impersonating)
        elif user.role in ['admin', 'staff']:
            queryset = User.objects.all()
        # Client users can only see users from their own client
        elif user.role == 'client' and user.client:
            queryset = User.objects.filter(client=user.client)
        else:
            # No access for other roles
            queryset = User.objects.none()
        
        # Additional filters (available to all)
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by client (only for admin/staff when not impersonating)
        if user.role in ['admin', 'staff'] and not effective_client:
            client_id = self.request.query_params.get('client')
            if client_id:
                queryset = queryset.filter(client_id=client_id)
        
        return queryset.select_related('client', 'floor')
    
    def create(self, request, *args, **kwargs):
        """Create user with password handling and optional email sending."""
        from apps.authentication.serializers import UserCreateSerializer
        from rest_framework import status
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings
        import logging
        import copy
        
        logger = logging.getLogger(__name__)
        
        # Create a mutable copy of request data
        data = copy.deepcopy(request.data)
        
        # For client role users, ensure they can only create users for their own client
        if request.user.role == 'client':
            # Force client_id to be the user's client (prevent creating users for other clients)
            data['client_id'] = str(request.user.client.id)
        
        # Use UserCreateSerializer for creation (handles password)
        serializer = UserCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Get password before saving (it will be hashed)
        password = data.get('password')
        send_email = data.get('send_email', False)
        
        # Create user
        user = serializer.save()
        
        # Send email if requested and password is provided
        if send_email and password:
            try:
                # Get login URL (for local development, use localhost)
                # In production, this will be the actual domain
                if hasattr(request, 'build_absolute_uri'):
                    login_url = request.build_absolute_uri('/login')
                else:
                    # Fallback for local development
                    login_url = 'http://localhost:5173/login'
                
                # Render email template
                email_subject = f'Welcome to sync2gear - Your Account Credentials'
                email_body = render_to_string('admin_panel/email/user_credentials.html', {
                    'user': user,
                    'password': password,
                    'login_url': login_url,
                })
                
                # Send email
                send_mail(
                    email_subject,
                    f'Welcome to sync2gear!\n\nYour account has been created.\n\nEmail: {user.email}\nPassword: {password}\n\nLogin at: {login_url}\n\nPlease change your password after first login.',  # Plain text fallback
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    html_message=email_body,
                    fail_silently=False,
                )
                
                logger.info(f"Credentials email sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send credentials email to {user.email}: {e}", exc_info=True)
                # Don't fail user creation if email fails, but log the error
        
        # Log user creation
        log_audit_event(
            request=request,
            action='create',
            resource_type='user',
            resource_id=str(user.id),
            details={
                'user_name': user.name,
                'user_email': user.email,
                'user_role': user.role,
                'client_id': str(user.client.id) if user.client else None,
            },
            user=request.user,
            status_code=status.HTTP_201_CREATED
        )
        
        # Return user with UserSerializer (read format)
        user_serializer = UserSerializer(user)
        return Response(user_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update user with role-based restrictions."""
        # For client role users, ensure they can only update users from their own client
        if request.user.role == 'client':
            user_obj = self.get_object()
            if user_obj.client != request.user.client:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only manage users from your own organization.")
            
            # Prevent client users from creating admin/staff roles
            if 'role' in request.data and request.data['role'] in ['admin', 'staff']:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You cannot assign admin or staff roles.")
            
            # Force client_id to be the user's client (prevent changing to another client)
            if 'client_id' in request.data:
                # Create a new QueryDict that's mutable
                from django.http import QueryDict
                mutable_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
                mutable_data['client_id'] = str(request.user.client.id)
                # Replace request.data
                request._full_data = mutable_data
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user with role-based restrictions."""
        # For client role users, ensure they can only delete users from their own client
        if request.user.role == 'client':
            user_obj = self.get_object()
            if user_obj.client != request.user.client:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only manage users from your own organization.")
        
        # Log user deletion
        user_obj = self.get_object()
        log_audit_event(
            request=request,
            action='delete',
            resource_type='user',
            resource_id=str(user_obj.id),
            details={
                'user_name': user_obj.name,
                'user_email': user_obj.email,
            },
            user=request.user,
            status_code=status.HTTP_200_OK
        )
        
        return super().destroy(request, *args, **kwargs)


class SystemStatsView(viewsets.ViewSet):
    """
    ViewSet for system statistics (admin only).
    """
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get system overview statistics."""
        stats = {
            'clients': {
                'total': Client.objects.count(),
                'active': Client.objects.filter(is_active=True).count(),
                'trial': Client.objects.filter(subscription_status='trial').count(),
                'active_subscriptions': Client.objects.filter(subscription_status='active').count(),
            },
            'users': {
                'total': User.objects.count(),
                'active': User.objects.filter(is_active=True).count(),
                'by_role': dict(User.objects.values('role').annotate(count=Count('id')).values_list('role', 'count')),
            },
            'storage': {
                'total_music_files': 0,  # TODO: Calculate from MusicFile
                'total_announcements': 0,  # TODO: Calculate from Announcement
            },
            'devices': {
                'total': 0,  # TODO: Calculate from Device
                'online': 0,  # TODO: Calculate from Device
            },
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def audit_logs(self, request):
        """Get recent audit logs."""
        limit = int(request.query_params.get('limit', 100))
        logs = AuditLog.objects.select_related('user', 'client').order_by('-created_at')[:limit]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs.
    
    - Admin: Can see all logs, filterable by client
    - Client: Can see logs for their client, filterable by floor/role
    - Floor User: Can see logs for their floor only
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]  # Require authentication, authorization handled in get_queryset
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'resource_type', 'user__name', 'user__email']
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get audit logs based on user role."""
        from django.db.models import Case, When, Value, IntegerField, Q
        
        user = self.request.user
        
        # Ensure user is authenticated (permission_classes should handle this, but double-check)
        if not user or not user.is_authenticated:
            return AuditLog.objects.none()
        
        # Admin can see all logs
        if user.role == 'admin':
            queryset = AuditLog.objects.all()
            
            # Filter by client if specified
            # When filtering by client, also include admin actions (client=None)
            client_id = self.request.query_params.get('client')
            if client_id:
                # Include logs for the selected client OR admin actions (client=None)
                queryset = queryset.filter(
                    Q(client_id=client_id) | 
                    Q(client__isnull=True, user__role='admin')
                )
        # Client users see their client's logs
        elif user.role == 'client' and user.client:
            queryset = AuditLog.objects.filter(client=user.client)
            
            # Filter by floor if specified
            floor_id = self.request.query_params.get('floor')
            if floor_id:
                queryset = queryset.filter(user__floor_id=floor_id)
            
            # Filter by role if specified
            role = self.request.query_params.get('role')
            if role:
                queryset = queryset.filter(user__role=role)
        # Floor users see only their floor's logs
        elif user.role == 'floor_user' and user.floor:
            queryset = AuditLog.objects.filter(
                client=user.client,
                user__floor=user.floor
            )
        else:
            # No access
            queryset = AuditLog.objects.none()
        
        # Additional filters (available to all)
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Order by role priority (admin first, then client, then others), then by created_at
        queryset = queryset.annotate(
            role_priority=Case(
                When(user__role='admin', then=Value(1)),
                When(user__role='client', then=Value(2)),
                When(user__role='staff', then=Value(3)),
                When(user__role='floor_user', then=Value(4)),
                default=Value(5),
                output_field=IntegerField(),
            )
        ).order_by('role_priority', '-created_at')
        
        return queryset.select_related('user', 'client', 'user__floor')


class AIProviderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing AI providers (admin only).
    """
    serializer_class = AIProviderSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'provider_type']
    ordering_fields = ['name', 'provider_type', 'last_used_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Get all AI providers."""
        queryset = AIProvider.objects.all()
        
        # Filter by provider type
        provider_type = self.request.query_params.get('provider_type')
        if provider_type:
            queryset = queryset.filter(provider_type=provider_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def get_serializer_class(self):
        """Use create serializer for POST."""
        if self.action == 'create':
            return AIProviderCreateSerializer
        return AIProviderSerializer
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle provider active status."""
        provider = self.get_object()
        provider.is_active = not provider.is_active
        provider.save(update_fields=['is_active'])
        
        return Response({
            'id': str(provider.id),
            'is_active': provider.is_active,
            'message': 'Provider activated' if provider.is_active else 'Provider deactivated'
        })
    
    @action(detail=False, methods=['post'])
    def reset_usage(self, request):
        """Reset usage for all providers (admin action)."""
        AIProvider.objects.all().update(
            requests_count=0,
            tokens_used=0,
            cost_usd=0
        )
        
        return Response({'message': 'Usage reset for all providers'})
