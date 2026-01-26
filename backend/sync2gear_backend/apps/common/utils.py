"""
Common utility functions for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from typing import Optional


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


def validate_uuid(value: str) -> bool:
    """Validate if a string is a valid UUID."""
    try:
        uuid.UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def get_client_from_request(request) -> Optional[object]:
    """Get client object from request user."""
    if not request.user or not request.user.is_authenticated:
        return None
    
    if hasattr(request.user, 'client'):
        return request.user.client
    
    return None
