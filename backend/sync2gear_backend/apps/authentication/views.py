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
from apps.common.utils import log_audit_event
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
        
        # Log registration
        log_audit_event(
            request=request,
            action='register',
            resource_type='user',
            resource_id=str(user.id),
            details={
                'email': user.email,
                'name': user.name,
                'role': user.role,
            },
            user=user,
            status_code=status.HTTP_201_CREATED
        )
        
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
    
    def post(self, request, *args, **kwargs):
        """Handle login and log audit event."""
        try:
            response = super().post(request, *args, **kwargs)
            
            # Log successful login
            if response.status_code == 200:
                try:
                    # Get user from serializer
                    serializer = self.get_serializer(data=request.data)
                    if serializer.is_valid():
                        user = serializer.user
                        log_audit_event(
                            request=request,
                            action='login',
                            resource_type='user',
                            resource_id=str(user.id),
                            details={
                                'email': user.email,
                                'role': user.role,
                                'success': True,
                            },
                            user=user,
                            status_code=200
                        )
                except Exception as e:
                    logger.error(f"Failed to log login event: {e}")
            else:
                # Log failed login attempt
                try:
                    email = request.data.get('email', 'unknown')
                    log_audit_event(
                        request=request,
                        action='login_failed',
                        resource_type='user',
                        details={
                            'email': email,
                            'success': False,
                            'reason': 'Invalid credentials',
                        },
                        user=None,
                        status_code=response.status_code
                    )
                except Exception as e:
                    logger.error(f"Failed to log failed login: {e}")
            
            return response
        except Exception as e:
            # Log the error
            logger.error(f"Login error: {e}", exc_info=True)
            
            # Log failed login attempt (when exception is raised)
            try:
                email = request.data.get('email', 'unknown')
                log_audit_event(
                    request=request,
                    action='login_failed',
                    resource_type='user',
                    details={
                        'email': email,
                        'success': False,
                        'reason': str(e),
                    },
                    user=None,
                    status_code=500
                )
            except Exception as log_error:
                logger.error(f"Failed to log failed login: {log_error}")
            
            # Return proper error response instead of raising
            from rest_framework_simplejwt.exceptions import AuthenticationFailed
            if isinstance(e, AuthenticationFailed):
                return Response(
                    {'detail': str(e)},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            else:
                # For other errors, return 500 but with proper format
                return Response(
                    {'detail': 'An error occurred during login. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


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
            
            # Log logout
            log_audit_event(
                request=request,
                action='logout',
                resource_type='user',
                resource_id=str(request.user.id),
                details={
                    'email': request.user.email,
                },
                user=request.user,
                status_code=status.HTTP_200_OK
            )
            
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
        
        # Log password change
        log_audit_event(
            request=request,
            action='password_change',
            resource_type='user',
            resource_id=str(user.id),
            details={
                'email': user.email,
            },
            user=user,
            status_code=status.HTTP_200_OK
        )
        
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


class SetPasswordView(generics.GenericAPIView):
    """
    Set password endpoint for user invite flow.
    
    Accepts a token from the invite email and a new password.
    Validates the token, sets the password, marks user as active, and invalidates the token.
    """
    permission_classes = [permissions.AllowAny]  # Public endpoint for invite flow
    
    def post(self, request):
        """Set password using invite token."""
        from .models import UserInviteToken
        from django.utils import timezone
        from django.contrib.auth.password_validation import validate_password
        
        token = request.data.get('token')
        password = request.data.get('password')
        
        if not token:
            raise ValidationError("Token is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        # Validate password
        try:
            validate_password(password)
        except Exception as e:
            raise ValidationError(f"Invalid password: {', '.join(e.messages) if hasattr(e, 'messages') else str(e)}")
        
        # Find invite token
        try:
            invite_token = UserInviteToken.objects.get(token=token)
        except UserInviteToken.DoesNotExist:
            raise ValidationError("Invalid or expired invite token")
        
        # Validate token
        if not invite_token.is_valid():
            raise ValidationError("Invalid or expired invite token")
        
        # Set password
        user = invite_token.user
        user.set_password(password)
        user.is_active = True
        user.save(update_fields=['password', 'is_active'])
        
        # Invalidate token
        invite_token.mark_used()
        
        # Log password set
        log_audit_event(
            request=request,
            action='set_password',
            resource_type='user',
            resource_id=str(user.id),
            details={
                'email': user.email,
                'via_invite': True,
            },
            user=user,
            status_code=status.HTTP_200_OK
        )
        
        return Response({
            'message': 'Password set successfully. You can now log in.',
            'user_id': str(user.id),
            'email': user.email
        }, status=status.HTTP_200_OK)


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

        # Log password reset request
        log_audit_event(
            request=request,
            action='password_reset_request',
            resource_type='user',
            resource_id=str(user.id),
            details={
                'email': email,
            },
            user=user,
            status_code=status.HTTP_200_OK
        )

        response = {
            'message': 'Password reset email sent (if account exists)'
        }
        # In development, return token for testing. In production, send via email.
        if settings.DEBUG:
            response.update({'uid': uid, 'token': token})

        return Response(response, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        # Don't reveal if email exists, but still log the attempt
        log_audit_event(
            request=request,
            action='password_reset_request',
            resource_type='user',
            details={
                'email': email,
                'user_not_found': True,
            },
            user=None,
            status_code=status.HTTP_200_OK
        )
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

    # Log password reset confirmation
    log_audit_event(
        request=request,
        action='password_reset_confirm',
        resource_type='user',
        resource_id=str(user.id),
        details={
            'email': user.email,
        },
        user=user,
        status_code=status.HTTP_200_OK
    )

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

        # Log settings update
        log_audit_event(
            request=request,
            action='update',
            resource_type='user_settings',
            resource_id=str(user.id),
            details={
                'updated_settings': list(settings_data.keys()),
            },
            user=user,
            status_code=status.HTTP_200_OK
        )

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Allow for initial setup
def seed_users(request):
    """
    Seed default users endpoint.
    Can be called once after deployment to create initial users.
    """
    import os
    
    # Simple security: Check for a secret token (optional)
    secret_token = request.data.get('token', '')
    expected_token = os.environ.get('SEED_TOKEN', 'sync2gear-seed-2025')
    
    if secret_token != expected_token:
        return Response(
            {'error': 'Invalid token. Provide token in request body.'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    default_users = [
        {
            'email': 'admin@sync2gear.com',
            'name': 'System Admin',
            'password': 'Admin@Sync2Gear2025!',
            'role': 'admin',
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
        },
        {
            'email': 'staff@sync2gear.com',
            'name': 'Support Staff',
            'password': 'Staff@Sync2Gear2025!',
            'role': 'staff',
            'is_active': True,
            'is_staff': True,
            'is_superuser': False,
        },
        {
            'email': 'client@example.com',
            'name': 'Client User',
            'password': 'Client@Example2025!',
            'role': 'client',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
        },
    ]
    
    created_count = 0
    updated_count = 0
    errors = []
    
    for user_data in default_users:
        email = user_data['email']
        password = user_data.pop('password')
        
        try:
            user = User.objects.get(email=email)
            # Update password
            user.set_password(password)
            for key, value in user_data.items():
                setattr(user, key, value)
            user.save()
            updated_count += 1
        except User.DoesNotExist:
            try:
                User.objects.create_user(
                    email=email,
                    password=password,
                    **user_data
                )
                created_count += 1
            except Exception as e:
                errors.append(f"{email}: {str(e)}")
        except Exception as e:
            errors.append(f"{email}: {str(e)}")
    
    return Response({
        'message': 'Users seeded successfully',
        'created': created_count,
        'updated': updated_count,
        'errors': errors if errors else None,
        'credentials': {
            'admin': 'admin@sync2gear.com / Admin@Sync2Gear2025!',
            'staff': 'staff@sync2gear.com / Staff@Sync2Gear2025!',
            'client': 'client@example.com / Client@Example2025!',
        }
    }, status=status.HTTP_200_OK)