#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import authenticate, get_user_model
from apps.authentication.serializers import LoginSerializer

User = get_user_model()

# Test authentication
print("Testing authentication...")
user = authenticate(email='admin@sync2gear.com', password='admin123')
print(f"User authenticated: {user is not None}")

if user:
    print(f"User details: {user.email}, role: {user.role}, client: {user.client}")

    # Test basic TokenObtainPairSerializer
    print("\nTesting TokenObtainPairSerializer directly...")
    try:
        from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
        token_serializer = TokenObtainPairSerializer()
        token_data = token_serializer.validate({'username': 'admin@sync2gear.com', 'password': 'admin123'})
        print(f"TokenObtainPairSerializer successful: {list(token_data.keys())}")
    except Exception as e:
        print(f"TokenObtainPairSerializer error: {e}")
        import traceback
        traceback.print_exc()

    # Test LoginSerializer with username instead of email
    print("\nTesting LoginSerializer with username...")
    try:
        serializer = LoginSerializer()
        result = serializer.validate({'username': 'admin@sync2gear.com', 'password': 'admin123'})
        print("LoginSerializer with username successful")
        print(f"Result keys: {list(result.keys())}")
    except Exception as e:
        print(f"LoginSerializer with username error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("Authentication failed - checking all users...")
    users = User.objects.all()
    for u in users:
        print(f"  {u.email} - active: {u.is_active}")