#!/usr/bin/env python3
"""
Seed users using Django's User model (works with login system).
This script requires Django to be installed and uses the actual User model.
"""
import os
import sys
import django

# Add sync2gear_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync2gear_backend'))

# Setup Django - Use development settings for local seeding
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def seed_users():
    """Seed users using Django's User model"""
    print("🔐 Seeding users for login...\n")
    
    # Check existing users
    try:
        existing_count = User.objects.count()
        print(f"Existing users: {existing_count}\n")
    except Exception as e:
        print(f"⚠️  Note: {e}")
        print("This is normal on first run - database will be created.\n")
        existing_count = 0
    
    # Default users to create
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
    
    for user_data in default_users:
        email = user_data['email']
        password = user_data.pop('password')
        
        try:
            # Check if user exists
            user = User.objects.get(email=email)
            
            # Update password and other fields
            print(f"  ⚠️  User {email} already exists. Updating password...")
            user.set_password(password)
            for key, value in user_data.items():
                setattr(user, key, value)
            user.save()
            updated_count += 1
            print(f"     ✅ Updated {email}")
            
        except User.DoesNotExist:
            # Create new user
            print(f"  ➕ Creating user {email}...")
            try:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    **user_data
                )
                created_count += 1
                print(f"     ✅ Created {email}")
            except Exception as e:
                print(f"     ❌ Error creating {email}: {e}")
        except Exception as e:
            print(f"     ❌ Error with {email}: {e}")
    
    # Final count
    try:
        final_count = User.objects.count()
        print(f"\n✅ Seeding complete!")
        print(f"   Created: {created_count} users")
        print(f"   Updated: {updated_count} users")
        print(f"   Total users: {final_count}")
        print(f"\n📋 Default Login Credentials:")
        print(f"   Admin: admin@sync2gear.com / Admin@Sync2Gear2025!")
        print(f"   Staff: staff@sync2gear.com / Staff@Sync2Gear2025!")
        print(f"   Client: client@example.com / Client@Example2025!")
        print(f"\n✅ Users are ready for login!")
    except Exception as e:
        print(f"\n⚠️  Could not get final count: {e}")

if __name__ == '__main__':
    try:
        seed_users()
    except Exception as e:
        print(f"\n❌ Error seeding users: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

