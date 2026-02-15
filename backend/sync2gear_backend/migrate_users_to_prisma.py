#!/usr/bin/env python3
"""
Migrate users from Django's authentication_user table to Prisma's users table
"""
import os
import sys
import django
from uuid import uuid4

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection
from apps.authentication.models import User as DjangoUser

# Import Prisma
from prisma_client import Prisma
import asyncio

async def migrate_users():
    """Migrate Django users to Prisma users table"""
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Check existing Prisma users
        existing_prisma_users = await prisma.user.find_many()
        print(f"Existing Prisma users: {len(existing_prisma_users)}")
        
        # Get all Django users
        django_users = DjangoUser.objects.all()
        print(f"Django users to migrate: {django_users.count()}")
        
        migrated = 0
        skipped = 0
        
        for django_user in django_users:
            # Check if user already exists in Prisma
            existing = await prisma.user.find_unique(where={'email': django_user.email})
            
            if existing:
                print(f"  ⏭️  Skipping {django_user.email} (already exists)")
                skipped += 1
                continue
            
            # Create user in Prisma format
            try:
                await prisma.user.create(
                    data={
                        'id': str(uuid4()),
                        'email': django_user.email,
                        'name': django_user.name or django_user.email.split('@')[0],
                        'password': django_user.password,  # Django already hashes it
                        'role': django_user.role or 'client',
                        'avatar': django_user.avatar if hasattr(django_user, 'avatar') else None,
                        'phone': django_user.phone if hasattr(django_user, 'phone') else None,
                        'timezone': getattr(django_user, 'timezone', 'UTC'),
                        'is_active': django_user.is_active,
                        'is_staff': django_user.is_staff,
                        'is_superuser': django_user.is_superuser,
                    }
                )
                print(f"  ✅ Migrated {django_user.email}")
                migrated += 1
            except Exception as e:
                print(f"  ❌ Error migrating {django_user.email}: {e}")
        
        print(f"\n✅ Migration complete!")
        print(f"   Migrated: {migrated}")
        print(f"   Skipped: {skipped}")
        
        # Show final count
        final_count = await prisma.user.find_many()
        print(f"   Total Prisma users: {len(final_count)}")
        
    finally:
        await prisma.disconnect()

if __name__ == '__main__':
    asyncio.run(migrate_users())





