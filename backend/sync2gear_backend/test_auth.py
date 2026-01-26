#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

# Test authentication
print("Testing authentication...")
user = authenticate(email='admin@sync2gear.com', password='admin123')
print(f"User authenticated: {user is not None}")

if user:
    print(f"User details: {user.email}, role: {user.role}, client: {user.client}")

    # Test LoginSerializer with email
    print("\nTesting LoginSerializer with email...")
    try:
        from apps.authentication.serializers import LoginSerializer
        serializer = LoginSerializer()
        result = serializer.validate({'email': 'admin@sync2gear.com', 'password': 'admin123'})
        print("LoginSerializer with email successful")
        print(f"Result keys: {list(result.keys())}")
    except Exception as e:
        print(f"LoginSerializer with email error: {e}")
        import traceback
        traceback.print_exc()
else:
    print("Authentication failed - checking all users...")
    users = User.objects.all()
    for u in users:
        print(f"  {u.email} - active: {u.is_active}")