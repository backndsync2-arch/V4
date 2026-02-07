#!/usr/bin/env python3
"""
Seed users directly into Prisma users table
"""
import asyncio
import os
import sys
from uuid import uuid4

# Add sync2gear_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync2gear_backend'))
from prisma_client import Prisma

async def seed_users():
    """Seed users into Prisma users table"""
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Check existing users
        existing = await prisma.user.find_many()
        print(f"Existing users: {len(existing)}")
        
        if len(existing) > 0:
            print("Users already exist. Skipping seed.")
            return
        
        # Demo users to create
        users_data = [
            {
                'email': 'admin@sync2gear.com',
                'name': 'System Admin',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',  # Will be hashed properly by Django
                'role': 'admin',
                'is_active': True,
                'is_staff': True,
                'is_superuser': True,
                'timezone': 'UTC',
            },
            {
                'email': 'staff@sync2gear.com',
                'name': 'Support Staff',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'staff',
                'is_active': True,
                'is_staff': True,
                'is_superuser': False,
                'timezone': 'UTC',
            },
            {
                'email': 'client1@example.com',
                'name': 'Client Admin',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'client',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'timezone': 'UTC',
            },
            {
                'email': 'manager@example.com',
                'name': 'Manager User',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'client',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'timezone': 'UTC',
            },
            {
                'email': 'operator@example.com',
                'name': 'Operator User',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'client',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'timezone': 'UTC',
            },
            {
                'email': 'floor1@downtowncoffee.com',
                'name': 'Floor User',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'floor_user',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'timezone': 'UTC',
            },
            {
                'email': 'testclient@retailstore.com',
                'name': 'Test Client Admin',
                'password': 'pbkdf2_sha256$600000$dummy$dummy',
                'role': 'client',
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
                'timezone': 'UTC',
            },
        ]
        
        print(f"Creating {len(users_data)} users...")
        
        for user_data in users_data:
            try:
                user = await prisma.user.create(
                    data={
                        'id': str(uuid4()),
                        **user_data
                    }
                )
                print(f"  ✅ Created {user.email}")
            except Exception as e:
                print(f"  ❌ Error creating {user_data['email']}: {e}")
        
        # Verify
        final_count = await prisma.user.find_many()
        print(f"\n✅ Seed complete! Total users: {len(final_count)}")
        
    finally:
        await prisma.disconnect()

if __name__ == '__main__':
    # Load .env
    from dotenv import load_dotenv
    load_dotenv('../.env')
    
    asyncio.run(seed_users())

