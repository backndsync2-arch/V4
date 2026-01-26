"""
Custom exceptions and error handling for sync2gear API.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class APIException(Exception):
    """Base exception for API errors."""
    def __init__(self, message, code=None, status_code=400, details=None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(APIException):
    """Validation error exception."""
    def __init__(self, message, field=None, details=None):
        super().__init__(message, code='VALIDATION_ERROR', status_code=400, details=details)
        self.field = field


class NotFoundError(APIException):
    """Resource not found exception."""
    def __init__(self, resource_type, resource_id=None):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message, code='NOT_FOUND', status_code=404)


class PermissionDeniedError(APIException):
    """Permission denied exception."""
    def __init__(self, message="You don't have permission to perform this action"):
        super().__init__(message, code='PERMISSION_DENIED', status_code=403)


class AuthenticationError(APIException):
    """Authentication error exception."""
    def __init__(self, message="Authentication required"):
        super().__init__(message, code='AUTHENTICATION_REQUIRED', status_code=401)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    
    Returns standardized error format:
    {
        "error": {
            "message": "Error message",
            "code": "ERROR_CODE",
            "details": {}
        }
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Handle custom exceptions
    if isinstance(exc, APIException):
        custom_response_data = {
            'error': {
                'message': exc.message,
                'code': exc.code,
                'details': exc.details,
            }
        }
        return Response(custom_response_data, status=exc.status_code)
    
    # Customize the response for standard DRF exceptions
    if response is not None:
        custom_response_data = {
            'error': {
                'message': str(exc),
                'code': exc.__class__.__name__,
                'details': response.data if hasattr(response, 'data') else {},
            }
        }
        response.data = custom_response_data
        
        # Log the error
        logger.error(f"API Error: {exc.__class__.__name__} - {str(exc)}", exc_info=True)
    
    return response
