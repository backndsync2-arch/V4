"""
Celery tasks for admin panel app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def reset_ai_provider_usage():
    """
    Reset daily usage counters for AI providers.
    
    Runs daily at midnight via Celery Beat.
    """
    from .models import AIProvider
    
    reset_count = AIProvider.objects.all().update(
        requests_count=0,
        tokens_used=0
    )
    
    logger.info(f"Reset usage for {reset_count} AI providers")
