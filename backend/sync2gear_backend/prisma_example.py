"""
Example usage of Prisma client in Lambda handlers.

This shows how to use the Prisma database client in your Lambda functions.
"""

import asyncio
from db import get_db, ensure_connected


async def example_get_users():
    """Example: Get all users."""
    db = get_db()
    await ensure_connected()
    
    users = await db.user.find_many()
    return users


async def example_get_tracks():
    """Example: Get all tracks."""
    db = get_db()
    await ensure_connected()
    
    tracks = await db.track.find_many(
        take=10,
        order_by={'created_at': 'desc'}
    )
    return tracks


async def example_create_user(email: str, name: str, password: str):
    """Example: Create a new user."""
    db = get_db()
    await ensure_connected()
    
    user = await db.user.create(
        data={
            'email': email,
            'name': name,
            'password': password,  # Should be hashed in production
            'role': 'client',
        }
    )
    return user


async def example_get_schedules():
    """Example: Get all enabled schedules."""
    db = get_db()
    await ensure_connected()
    
    schedules = await db.schedule.find_many(
        where={'enabled': True},
        order_by={'created_at': 'desc'}
    )
    return schedules


async def example_get_announcements():
    """Example: Get all announcements."""
    db = get_db()
    await ensure_connected()
    
    announcements = await db.announcement.find_many(
        where={'enabled': True},
        include={'play_logs': True}  # Include related play_logs
    )
    return announcements


async def example_get_play_logs():
    """Example: Get play logs with related announcement."""
    db = get_db()
    await ensure_connected()
    
    play_logs = await db.playlog.find_many(
        where={'status': 'completed'},
        include={'announcement': True},
        order_by={'created_at': 'desc'},
        take=50
    )
    return play_logs


# Lambda handler example (synchronous wrapper)
def lambda_handler_example(event, context):
    """
    Example Lambda handler using Prisma.
    
    Note: Lambda handlers are synchronous, but Prisma is async.
    We need to use asyncio.run() to run async code.
    """
    async def handle():
        db = get_db()
        await ensure_connected()
        
        # Example: Get users
        users = await db.user.find_many(take=10)
        
        return {
            'statusCode': 200,
            'body': {
                'users': [{'id': u.id, 'email': u.email, 'name': u.name} for u in users]
            }
        }
    
    # Run async code in sync handler
    return asyncio.run(handle())

