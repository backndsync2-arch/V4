#!/usr/bin/env python3
"""
Seed users directly into MongoDB.
This script uses pymongo directly and implements Django's password hashing.
No Django installation required locally.
"""
import pymongo
from datetime import datetime
import hashlib
import base64
import secrets

# MongoDB connection (hardcoded - same as production)
MONGODB_URL = 'mongodb+srv://backndsync2_db_user:QObM0opJLdHg2b3u@sync2gear.bjxcwmc.mongodb.net/sync2gear?appName=Sync2Gear'
MONGODB_NAME = 'sync2gear'

def hash_password_django_style(password):
    """
    Hash password using Django's pbkdf2_sha256 algorithm.
    Format: pbkdf2_sha256$iterations$salt$hash
    """
    import hashlib
    import base64
    import secrets
    
    # Django uses 600000 iterations by default
    iterations = 600000
    algorithm = 'pbkdf2_sha256'
    
    # Generate salt
    salt = secrets.token_urlsafe(12)
    
    # Hash password using PBKDF2
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    
    # PBKDF2 with SHA256
    dk = hashlib.pbkdf2_hmac('sha256', password_bytes, salt_bytes, iterations)
    hash_value = base64.b64encode(dk).decode('ascii').strip()
    
    # Return in Django format
    return f"{algorithm}${iterations}${salt}${hash_value}"

def seed_users():
    """Seed users into MongoDB"""
    print("🔐 Seeding MongoDB with default users...\n")
    
    # Connect to MongoDB
    try:
        mongo_client = pymongo.MongoClient(MONGODB_URL)
        db = mongo_client[MONGODB_NAME]
        users_collection = db['users']
        
        # Test connection
        mongo_client.admin.command('ping')
        print("✅ Connected to MongoDB\n")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    # Check existing users
    existing_count = users_collection.count_documents({})
    print(f"Existing users in MongoDB: {existing_count}\n")
    
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
            'timezone': 'UTC',
        },
        {
            'email': 'staff@sync2gear.com',
            'name': 'Support Staff',
            'password': 'Staff@Sync2Gear2025!',
            'role': 'staff',
            'is_active': True,
            'is_staff': True,
            'is_superuser': False,
            'timezone': 'UTC',
        },
        {
            'email': 'client@example.com',
            'name': 'Client User',
            'password': 'Client@Example2025!',
            'role': 'client',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
            'timezone': 'UTC',
        },
    ]
    
    created_count = 0
    updated_count = 0
    
    for user_data in default_users:
        email = user_data['email']
        password = user_data.pop('password')
        
        # Hash password using Django's algorithm
        hashed_password = hash_password_django_style(password)
        
        # Check if user exists
        existing_user = users_collection.find_one({'email': email})
        
        if existing_user:
            # Update password if user exists
            print(f"  ⚠️  User {email} already exists. Updating password...")
            
            users_collection.update_one(
                {'email': email},
                {
                    '$set': {
                        'password': hashed_password,
                        'is_active': user_data['is_active'],
                        'is_staff': user_data.get('is_staff', False),
                        'is_superuser': user_data.get('is_superuser', False),
                        'role': user_data['role'],
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            updated_count += 1
            print(f"     ✅ Password updated for {email}")
        else:
            # Create new user
            print(f"  ➕ Creating user {email}...")
            
            # Prepare user document
            user_doc = {
                'email': email,
                'name': user_data['name'],
                'password': hashed_password,
                'role': user_data['role'],
                'is_active': user_data['is_active'],
                'is_staff': user_data.get('is_staff', False),
                'is_superuser': user_data.get('is_superuser', False),
                'timezone': user_data.get('timezone', 'UTC'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            # Insert into MongoDB
            users_collection.insert_one(user_doc)
            created_count += 1
            print(f"     ✅ Created {email}")
    
    # Final count
    final_count = users_collection.count_documents({})
    
    print(f"\n✅ Seeding complete!")
    print(f"   Created: {created_count} users")
    print(f"   Updated: {updated_count} users")
    print(f"   Total users in MongoDB: {final_count}")
    print(f"\n📋 Default Login Credentials:")
    print(f"   Admin: admin@sync2gear.com / Admin@Sync2Gear2025!")
    print(f"   Staff: staff@sync2gear.com / Staff@Sync2Gear2025!")
    print(f"   Client: client@example.com / Client@Example2025!")
    print(f"\n⚠️  Note: Users are stored in MongoDB.")
    print(f"   However, Django authentication uses SQLite. For login to work,")
    print(f"   you may need to sync these users to Django's User model.")
    
    mongo_client.close()

if __name__ == '__main__':
    try:
        seed_users()
    except Exception as e:
        print(f"\n❌ Error seeding users: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
