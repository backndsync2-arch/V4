"""
Database connection singleton for Lambda using MongoDB.

This module provides a singleton MongoDB client instance that:
- Reuses connections across Lambda invocations (connection pooling)
- Handles connection lifecycle properly
- Works with Lambda's execution model

Usage:
    from db import get_db
    
    db = get_db()
    # MongoDB client is automatically connected
    collection = db['users']
    users = collection.find({})
"""

import os
import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

# Global MongoDB client instance (singleton)
_mongo_client: Optional[MongoClient] = None
_mongo_db: Optional[Database] = None


def get_db():
    """
    Get or create the MongoDB database instance (singleton pattern).
    
    This function ensures we only create one MongoDB client per Lambda container,
    which is critical for connection pooling and performance.
    
    Returns:
        MongoDB database instance
    """
    global _mongo_client, _mongo_db
    
    if _mongo_client is None:
        try:
            # Get MongoDB URL from environment or use default
            mongodb_url = os.environ.get('MONGODB_URI') or os.environ.get('MONGODB_URL')
            
            if not mongodb_url:
                # Build from individual environment variables
                db_host = os.environ.get('DB_HOST', 'sync2gear.bjxcwmc.mongodb.net')
                db_user = os.environ.get('DB_USER', 'backndsync2_db_user')
                db_password = os.environ.get('DB_PASSWORD', 'QObM0opJLdHg2b3u')
                db_name = os.environ.get('DB_NAME', 'sync2gear')
                
                # URL encode credentials
                import urllib.parse
                encoded_user = urllib.parse.quote_plus(db_user)
                encoded_password = urllib.parse.quote_plus(db_password)
                mongodb_url = f'mongodb+srv://{encoded_user}:{encoded_password}@{db_host}/{db_name}?retryWrites=true&w=majority&appName=Sync2Gear'
            else:
                db_name = os.environ.get('DB_NAME', 'sync2gear')
            
            # Create MongoDB client with connection pooling
            _mongo_client = MongoClient(
                mongodb_url,
                maxPoolSize=10,  # Connection pool size
                minPoolSize=1,
                retryWrites=True,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
            
            # Get database
            _mongo_db = _mongo_client[db_name]
            
            # Test connection (don't fail if it doesn't work, just log)
            try:
                _mongo_client.admin.command('ping')
                logger.info(f"MongoDB client initialized successfully for database: {db_name}")
            except Exception as ping_error:
                logger.warning(f"MongoDB ping failed (connection may still work): {ping_error}")
            
        except Exception as e:
            logger.error(f"Failed to initialize MongoDB client: {e}")
            # Don't raise - allow lazy connection
            _mongo_client = None
            _mongo_db = None
    
    if _mongo_db is None:
        raise ConnectionError("MongoDB connection not available. Check your credentials and network access.")
    
    return _mongo_db


def get_client():
    """
    Get the MongoDB client instance.
    
    Returns:
        MongoDB client instance
    """
    if _mongo_client is None:
        get_db()  # This will initialize the client
    return _mongo_client


def disconnect_db():
    """
    Disconnect from the database.
    
    Note: In Lambda, you typically don't want to disconnect between invocations
    to reuse connections. Only disconnect if you're sure the container is being
    destroyed or for testing.
    """
    global _mongo_client, _mongo_db
    
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None
        logger.info("MongoDB disconnected")


def reset_db():
    """
    Reset the database connection (for testing or error recovery).
    
    This will disconnect and clear the singleton, forcing a new connection
    on the next get_db() call.
    """
    disconnect_db()
    logger.info("Database connection reset")

