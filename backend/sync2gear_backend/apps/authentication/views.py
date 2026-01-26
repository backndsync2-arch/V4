"""
Authentication views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from .models import Client
from .serializers import (
    UserSerializer, UserCreateSerializer, SignUpSerializer,
    LoginSerializer, PasswordChangeSerializer, ClientSerializer
)
from apps.common.exceptions import ValidationError, AuthenticationError
from apps.common.permissions import IsSameClient
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class SignUpView(generics.CreateAPIView):
    """
    User sign up endpoint.
    
    Creates a new client and user account.
    """
    serializer_class = SignUpSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Create new user and client."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Additional security: Check if email already exists (double-check)
        email = serializer.validated_data.get('email', '').lower().strip()
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'A user with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Serialize user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'user': user_serializer.data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    User login endpoint.
    
    Returns JWT tokens and user data.
    """
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(generics.GenericAPIView):
    """
    User logout endpoint.
    
    Blacklists the refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Logout user by blacklisting refresh token."""
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(TokenRefreshView):
    """Refresh access token endpoint."""
    permission_classes = [permissions.AllowAny]


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get and update current user profile.
    
    GET: Returns current user data
    PATCH: Updates user profile
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Return current user."""
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    """Change user password endpoint."""
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Change password."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Update password
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    """Request password reset email."""
    email = request.data.get('email')
    if not email:
        raise ValidationError("Email is required")
    
    try:
        user = User.objects.get(email=email)
        token_generator = PasswordResetTokenGenerator()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)

        response = {
            'message': 'Password reset email sent (if account exists)'
        }
        # In development, return token for testing. In production, send via email.
        if settings.DEBUG:
            response.update({'uid': uid, 'token': token})

        return Response(response, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        # Don't reveal if email exists
        return Response({
            'message': 'Password reset email sent (if account exists)'
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    """Confirm password reset with token."""
    token = request.data.get('token')
    password = request.data.get('password')
    uid = request.data.get('uid')
    
    if not token or not password:
        raise ValidationError("Token and password are required")

    # Allow "uid:token" format for convenience in testing
    if not uid and isinstance(token, str) and ':' in token:
        uid, token = token.split(':', 1)

    if not uid:
        raise ValidationError("uid is required")

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except Exception:
        raise ValidationError("Invalid reset token")

    token_generator = PasswordResetTokenGenerator()
    if not token_generator.check_token(user, token):
        raise ValidationError("Invalid or expired reset token")

    user.set_password(password)
    user.save()

    return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)


class UserSettingsViewSet(generics.RetrieveUpdateAPIView):
    """
    User settings management endpoint.

    Allows users to get and update their personal settings.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameClient]

    def get_object(self):
        """Get the current authenticated user."""
        return self.request.user

    def get_serializer_class(self):
        """Use different serializer for updates to handle settings."""
        if self.request.method in ['PUT', 'PATCH']:
            # For updates, we'll handle settings directly
            return UserSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        """Update user settings."""
        user = self.get_object()
        settings_data = request.data.get('settings', {})

        # Validate settings structure
        if not isinstance(settings_data, dict):
            raise ValidationError("Settings must be a valid JSON object")

        # Update user settings
        if not user.settings:
            user.settings = {}

        # Deep merge settings
        user.settings.update(settings_data)
        user.save(update_fields=['settings'])

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
