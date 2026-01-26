"""
Celery configuration for sync2gear.

This module configures Celery for async task processing.
"""

import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('sync2gear')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    'check-schedules-every-minute': {
        'task': 'apps.scheduler.tasks.check_schedules',
        'schedule': 60.0,  # Every minute
    },
    'cleanup-expired-sessions-daily': {
        'task': 'apps.authentication.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # 3 AM daily
    },
    'update-device-status': {
        'task': 'apps.zones.tasks.update_device_status',
        'schedule': 30.0,  # Every 30 seconds
    },
    'reset-ai-provider-usage-daily': {
        'task': 'apps.admin_panel.tasks.reset_ai_provider_usage',
        'schedule': crontab(hour=0, minute=0),  # Midnight daily
    },
    'update-device-status': {
        'task': 'apps.zones.tasks.update_device_status',
        'schedule': 30.0,  # Every 30 seconds
    },
}

app.conf.timezone = 'UTC'

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
