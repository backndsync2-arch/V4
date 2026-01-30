"""
Admin panel serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from .models import AuditLog, AIProvider
from apps.authentication.serializers import ClientSerializer, UserSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_role',
            'action', 'resource_type', 'resource_id',
            'client', 'client_name', 'details',
            'ip_address', 'user_agent',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_name', 'user_email', 'user_role', 'client_name',
            'created_at', 'updated_at'
        ]


class AIProviderSerializer(serializers.ModelSerializer):
    """Serializer for AIProvider model."""
    
    # Don't expose API key in responses
    api_key = serializers.SerializerMethodField()
    
    class Meta:
        model = AIProvider
        fields = [
            'id', 'name', 'provider_type', 'api_key',
            'is_active', 'daily_request_limit', 'monthly_budget_usd',
            'requests_count', 'tokens_used', 'cost_usd',
            'features', 'last_used_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'requests_count', 'tokens_used', 'cost_usd',
            'last_used_at', 'created_at', 'updated_at'
        ]
    
    def get_api_key(self, obj):
        """Return masked API key (only show last 4 characters)."""
        if obj.api_key and len(obj.api_key) > 4:
            return '*' * (len(obj.api_key) - 4) + obj.api_key[-4:]
        return '****'


class AIProviderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AI providers (includes API key)."""
    
    class Meta:
        model = AIProvider
        fields = [
            'name', 'provider_type', 'api_key',
            'is_active', 'daily_request_limit', 'monthly_budget_usd',
            'features'
        ]
