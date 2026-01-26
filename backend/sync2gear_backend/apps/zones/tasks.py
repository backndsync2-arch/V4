"""
Celery tasks for zones app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def update_device_status():
    """
    Update device online/offline status based on last_seen.

    Runs every 30 seconds via Celery Beat.
    Sends real-time notifications for status changes.
    """
    from .models import Device
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    timeout_minutes = 5  # Device considered offline after 5 minutes
    cutoff_time = timezone.now() - timedelta(minutes=timeout_minutes)

    channel_layer = get_channel_layer()

    # Get devices that are going offline
    offline_devices = Device.objects.filter(
        is_online=True,
        last_seen__lt=cutoff_time
    ).select_related('zone')

    offline_devices_list = list(offline_devices)
    offline_count = len(offline_devices_list)

    # Mark devices as offline
    offline_devices.update(is_online=False)

    # Send WebSocket notifications for each device that went offline
    for device in offline_devices_list:
        try:
            event_data = {
                'device_id': str(device.id),
                'device_name': device.name,
                'zone_id': str(device.zone.id) if device.zone else None,
                'zone_name': device.zone.name if device.zone else None,
                'is_online': False,
                'last_seen': device.last_seen.isoformat() if device.last_seen else None,
            }

            # Send to global events group
            async_to_sync(channel_layer.group_send)(
                'global_events',
                {
                    'type': 'device_status_change',
                    'data': event_data
                }
            )

            logger.info(f"Device {device.name} marked offline and notification sent")
        except Exception as e:
            logger.error(f"Failed to send offline notification for device {device.name}: {e}")

    if offline_count > 0:
        logger.info(f"Marked {offline_count} devices as offline")
