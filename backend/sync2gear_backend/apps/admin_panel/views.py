"""
Admin panel views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, AIProvider
from .serializers import AuditLogSerializer, AIProviderSerializer, AIProviderCreateSerializer
from apps.authentication.models import Client, User
from apps.authentication.serializers import ClientSerializer, UserSerializer
from apps.common.permissions import IsAdmin
from apps.common.exceptions import ValidationError
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
        client.is_active = not client.is_active
        client.save(update_fields=['is_active'])
        
        return Response({
            'id': str(client.id),
            'is_active': client.is_active,
            'message': 'Client activated' if client.is_active else 'Client deactivated'
        })


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users (admin only).
    """
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email']
    ordering_fields = ['name', 'email', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get all users."""
        queryset = User.objects.all()
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by client
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        return queryset.select_related('client', 'floor')


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
    ViewSet for viewing audit logs (admin only).
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['action', 'resource_type', 'user__name', 'user__email']
    ordering_fields = ['created_at', 'action']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get all audit logs."""
        queryset = AuditLog.objects.all()
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Filter by client
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by resource type
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.select_related('user', 'client')


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
