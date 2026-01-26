"""
Authentication serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import Client, User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model."""
    
    premium_features = serializers.JSONField(required=False, default=dict)
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'business_name', 'email', 'telephone', 'description',
            'subscription_tier', 'subscription_status', 'subscription_price',
            'subscription_start', 'subscription_end', 'trial_days', 'trial_ends_at',
            'stripe_customer_id', 'stripe_subscription_id',
            'premium_features', 'max_devices', 'max_storage_gb', 'max_floors',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (read operations)."""
    
    client = ClientSerializer(read_only=True)
    client_id = serializers.UUIDField(write_only=True, required=False)
    floor_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'client', 'client_id', 'floor', 'floor_id',
            'role', 'avatar', 'phone', 'timezone',
            'is_active', 'last_seen', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_seen']
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users."""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'name', 'password', 'password_confirm',
            'client_id', 'floor_id', 'role', 'phone', 'timezone'
        ]
    
    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        """Create new user."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class SignUpSerializer(serializers.Serializer):
    """Serializer for user sign up (creates user + client)."""
    
    # Demo accounts that cannot be used for signup
    DEMO_ACCOUNTS = {
        'admin@sync2gear.com',
        'client1@example.com',
        'floor1@downtowncoffee.com',
    }
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    telephone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    def validate_email(self, value):
        """Validate email is not a demo account and doesn't already exist."""
        email = value.lower().strip()
        
        # Prevent signup with demo account emails
        if email in self.DEMO_ACCOUNTS:
            raise serializers.ValidationError(
                "This email is reserved for demo accounts. Please use a different email."
            )
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        
        return email
    
    def validate_name(self, value):
        """Validate name is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value.strip()
    
    def validate_company_name(self, value):
        """Validate company name is not empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Company name cannot be empty.")
        return value.strip()
    
    def create(self, validated_data):
        """Create new client and user."""
        from django.utils import timezone
        from datetime import timedelta
        
        # Create client
        client = Client.objects.create(
            name=validated_data['company_name'],
            business_name=validated_data['company_name'],
            email=validated_data['email'],
            telephone=validated_data.get('telephone', ''),
            subscription_status='trial',
            trial_days=14,
            trial_ends_at=timezone.now() + timedelta(days=14),
            premium_features={
                'multiFloor': False,
                'aiCredits': 100,
                'maxFloors': 1,
            }
        )
        
        # Create user
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            client=client,
            role='client'
        )
        
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """Custom login serializer that returns user data with tokens."""
    
    username_field = User.USERNAME_FIELD  # Use email (which is USERNAME_FIELD) instead of username
    
    def validate(self, attrs):
        """Validate credentials and return tokens + user."""
        # Get email from attrs - try multiple possible field names
        # TokenObtainPairSerializer uses username_field which is 'email'
        email = attrs.get('email') or attrs.get(self.username_field, '') or attrs.get('username', '')
        password = attrs.get('password', '')
        
        # Normalize email (lowercase, strip whitespace)
        if email:
            email = email.lower().strip()
            # Update attrs with normalized email
            attrs['email'] = email
        
        # Normal authentication - ALL accounts require proper password
        # TokenObtainPairSerializer will validate email and password
        # Make sure 'email' is in attrs for the parent serializer
        if 'email' not in attrs and email:
            attrs['email'] = email
        
        # Use parent class validation which checks password properly
        data = super().validate(attrs)

        # Add user data to response
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data

        # Update last_seen
        self.user.update_last_seen()

        return data


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validate password change."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords don't match"})
        return attrs
    
    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value
