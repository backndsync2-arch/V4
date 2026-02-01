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
    """
    Serializer for creating new users with comprehensive validation.
    
    NOTE: Passwords are NOT accepted in user creation. Users are created inactive
    and must set their password via the invite email link.
    """
    
    # Explicitly define client_id and floor_id as UUIDFields to ensure proper parsing
    client_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    floor_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'name',
            'client_id', 'floor_id', 'role', 'phone', 'timezone'
        ]
    
    def validate_role(self, value):
        """Validate role is one of the 4 allowed values."""
        allowed_roles = ['admin', 'staff', 'client', 'floor_user']
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f"Role must be one of: {', '.join(allowed_roles)}"
            )
        return value
    
    def validate(self, attrs):
        """
        Comprehensive cross-field validation for user creation.
        
        Enforces:
        1. Valid role/client/floor combinations
        2. Creator permissions
        3. Cross-ownership rules
        """
        role = attrs.get('role')
        client_id = attrs.get('client_id')
        floor_id = attrs.get('floor_id')
        
        # Get creator from context (set by view)
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required to create users")
        
        creator = request.user
        
        # 1. Validate role is allowed
        allowed_roles = ['admin', 'staff', 'client', 'floor_user']
        if role not in allowed_roles:
            raise serializers.ValidationError(
                {"role": f"Role must be one of: {', '.join(allowed_roles)}"}
            )
        
        # 2. Enforce valid state matrix based on role
        if role in ['admin', 'staff']:
            # Admin and staff MUST have client=null and floor=null
            if client_id is not None:
                raise serializers.ValidationError(
                    {"client_id": f"client field must be null when role is '{role}'"}
                )
            if floor_id is not None:
                raise serializers.ValidationError(
                    {"floor_id": f"floor field must be null when role is '{role}'"}
                )
        
        elif role == 'client':
            # Client role MUST have client set, floor must be null
            if client_id is None:
                raise serializers.ValidationError(
                    {"client_id": "client field is required when role is 'client'"}
                )
            if floor_id is not None:
                raise serializers.ValidationError(
                    {"floor_id": "floor field must be null when role is 'client'"}
                )
            
            # Validate client exists
            try:
                client = Client.objects.get(id=client_id)
            except Client.DoesNotExist:
                raise serializers.ValidationError(
                    {"client_id": f"Client with id '{client_id}' does not exist"}
                )
        
        elif role == 'floor_user':
            # Floor_user MUST have both client and floor set
            if client_id is None:
                raise serializers.ValidationError(
                    {"client_id": "client field is required when role is 'floor_user'"}
                )
            if floor_id is None:
                raise serializers.ValidationError(
                    {"floor_id": "floor field is required when role is 'floor_user'"}
                )
            
            # Validate client exists
            try:
                client = Client.objects.get(id=client_id)
            except Client.DoesNotExist:
                raise serializers.ValidationError(
                    {"client_id": f"Client with id '{client_id}' does not exist"}
                )
            
            # Validate floor exists
            from apps.zones.models import Floor
            try:
                floor = Floor.objects.get(id=floor_id)
            except Floor.DoesNotExist:
                raise serializers.ValidationError(
                    {"floor_id": f"Floor with id '{floor_id}' does not exist"}
                )
            
            # Validate floor belongs to the specified client
            if floor.client_id != client_id:
                raise serializers.ValidationError(
                    {"floor_id": "floor does not belong to the specified client"}
                )
        
        # 3. Enforce creator permissions
        if creator.role == 'staff':
            # Staff can only create client and floor_user roles
            if role in ['admin', 'staff']:
                raise serializers.ValidationError(
                    {"role": "staff users cannot create admin or staff role users"}
                )
        
        elif creator.role == 'client':
            # Client users can only create floor_user roles within their own client
            if role != 'floor_user':
                raise serializers.ValidationError(
                    {"role": "client users can only create floor_user role users"}
                )
            
            # Ensure client_id matches creator's client
            if client_id != str(creator.client_id):
                raise serializers.ValidationError(
                    {"client_id": "client users can only create users for their own client"}
                )
        
        elif creator.role == 'floor_user':
            # Floor users cannot create any users
            raise serializers.ValidationError(
                {"role": "floor_user role users cannot create other users"}
            )
        
        return attrs
    
    def create(self, validated_data):
        """
        Create new user with validated data.
        
        Users are always created without a password and must set it via invite email.
        """
        
        # Convert client_id and floor_id to actual objects
        client_id = validated_data.pop('client_id', None)
        floor_id = validated_data.pop('floor_id', None)
        
        if client_id:
            validated_data['client_id'] = client_id
        if floor_id:
            validated_data['floor_id'] = floor_id
        
        # Create user without password - password must be set via invite
        from django.utils import timezone
        from datetime import timedelta
        import secrets
        from .models import UserInviteToken
        
        # Create user without password (will be set via invite)
        # Note: create_user requires a password, so we'll set a random one and then clear it
        temp_password = secrets.token_urlsafe(32)
        user = User.objects.create_user(password=temp_password, **validated_data)
        # Clear the password so user must set it via invite
        user.set_unusable_password()
        user.is_active = False
        user.save(update_fields=['is_active', 'password'])
        
        # Generate invite token
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        
        UserInviteToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # Store token in user object for email sending (will be handled in view)
        user._invite_token = token
        
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
        # This will raise AuthenticationFailed if credentials are invalid
        data = super().validate(attrs)
        
        # After parent validation succeeds, we know credentials are valid
        # Get the user by email (parent validates but doesn't expose user object)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            from rest_framework_simplejwt.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Invalid credentials.')
        
        # Add user data to response
        user_serializer = UserSerializer(user)
        data['user'] = user_serializer.data

        # Update last_seen
        user.update_last_seen()

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
