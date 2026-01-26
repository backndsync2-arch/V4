"""
Celery tasks for scheduler app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from celery import shared_task
from django.utils import timezone
from datetime import datetime, time, timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_schedules():
    """
    Check and execute due schedules.
    
    Runs every minute via Celery Beat.
    """
    from .models import Schedule
    from apps.playback.engine import PlaybackEngine
    
    now = timezone.now()
    current_time = now.time()
    current_weekday = now.weekday()  # 0=Monday, 6=Sunday
    
    # Get all active schedules
    active_schedules = Schedule.objects.filter(
        enabled=True,
        client__is_active=True
    ).prefetch_related('zones', 'devices')
    
    executed_count = 0
    
    for schedule in active_schedules:
        try:
            config = schedule.schedule_config
            schedule_type = config.get('type', 'interval')
            
            # Check if schedule should run
            should_run = False
            
            if schedule_type == 'interval':
                should_run = _check_interval_schedule(schedule, now, current_time)
            elif schedule_type == 'timeline':
                should_run = _check_timeline_schedule(schedule, now, current_time, current_weekday)
            
            if should_run:
                execute_schedule.delay(str(schedule.id))
                executed_count += 1
        
        except Exception as e:
            logger.error(f"Error checking schedule {schedule.id}: {e}")
    
    logger.info(f"Checked {active_schedules.count()} schedules, executed {executed_count}")


def _check_interval_schedule(schedule, now, current_time):
    """Check if interval schedule should run."""
    config = schedule.schedule_config
    
    # Check quiet hours
    quiet_start = config.get('quietHoursStart')
    quiet_end = config.get('quietHoursEnd')
    
    if quiet_start and quiet_end:
        quiet_start_time = datetime.strptime(quiet_start, '%H:%M').time()
        quiet_end_time = datetime.strptime(quiet_end, '%H:%M').time()
        
        if quiet_start_time <= quiet_end_time:
            # Same day quiet hours
            if quiet_start_time <= current_time <= quiet_end_time:
                return False
        else:
            # Overnight quiet hours
            if current_time >= quiet_start_time or current_time <= quiet_end_time:
                return False
    
    # Check last execution time (avoid repeat)
    # TODO: Track last execution time per schedule
    # For now, allow execution
    
    return True


def _check_timeline_schedule(schedule, now, current_time, current_weekday):
    """Check if timeline schedule should run."""
    config = schedule.schedule_config
    
    # Check if current time matches any announcement time
    cycle_duration = config.get('cycleDurationMinutes', 60)
    announcements = config.get('announcements', [])
    
    for ann in announcements:
        timestamp_seconds = ann.get('timestampSeconds', 0)
        target_time_seconds = (timestamp_seconds % (cycle_duration * 60))
        
        current_seconds = current_time.hour * 3600 + current_time.minute * 60 + current_time.second
        cycle_seconds = cycle_duration * 60
        
        # Check if we're within 30 seconds of target time
        cycle_position = current_seconds % cycle_seconds
        if abs(cycle_position - target_time_seconds) <= 30:
            return True
    
    return False


@shared_task
def execute_schedule(schedule_id):
    """
    Execute a schedule (play music or announcement).
    Sends real-time notification when executed.
    """
    from .models import Schedule
    from apps.playback.engine import PlaybackEngine

    try:
        schedule = Schedule.objects.get(id=schedule_id)

        if not schedule.enabled:
            return

        config = schedule.schedule_config
        schedule_type = config.get('type', 'interval')

        # Get target zones
        zones = list(schedule.zones.all())
        if not zones:
            # If no zones, get zones from devices
            devices = schedule.devices.all()
            zones = list(set([device.zone for device in devices if device.zone]))

        if not zones:
            logger.warning(f"Schedule {schedule_id} has no target zones")
            return

        zone_ids = [str(zone.id) for zone in zones]
        executed_at = timezone.now().isoformat()

        # Execute based on schedule type
        if schedule_type == 'interval':
            # Play announcements at interval
            announcement_ids = config.get('announcementIds', [])
            if announcement_ids:
                # Play first announcement (or random if avoidRepeat)
                from apps.announcements.models import Announcement
                announcements = Announcement.objects.filter(
                    id__in=announcement_ids,
                    enabled=True
                )

                if announcements.exists():
                    announcement = announcements.first()  # TODO: Implement avoidRepeat logic

                    for zone in zones:
                        try:
                            PlaybackEngine.handle_announcement(
                                str(zone.id),
                                str(announcement.id)
                            )
                        except Exception as e:
                            logger.error(f"Failed to play announcement on zone {zone.id}: {e}")

        elif schedule_type == 'timeline':
            # Play announcements at specific times
            announcements_config = config.get('announcements', [])
            current_time = timezone.now().time()
            current_seconds = current_time.hour * 3600 + current_time.minute * 60

            for ann_config in announcements_config:
                timestamp_seconds = ann_config.get('timestampSeconds', 0)
                announcement_id = ann_config.get('announcementId')

                # Check if this announcement should play now
                cycle_duration = config.get('cycleDurationMinutes', 60) * 60
                cycle_position = current_seconds % cycle_duration

                if abs(cycle_position - timestamp_seconds) <= 30:
                    if announcement_id:
                        for zone in zones:
                            try:
                                PlaybackEngine.handle_announcement(
                                    str(zone.id),
                                    str(announcement_id)
                                )
                            except Exception as e:
                                logger.error(f"Failed to play announcement on zone {zone.id}: {e}")

        # Send WebSocket notification for schedule execution
        try:
            event_data = {
                'schedule_id': str(schedule.id),
                'schedule_name': schedule.name,
                'zone_ids': zone_ids,
                'executed_at': executed_at,
                'triggered_by': 'schedule',
            }

            # Send to global events group
            async_to_sync(channel_layer.group_send)(
                'global_events',
                {
                    'type': 'schedule_executed',
                    'data': event_data
                }
            )

            logger.info(f"Schedule {schedule.name} executed - notification sent")
        except Exception as e:
            logger.error(f"Failed to send schedule execution notification for {schedule.name}: {e}")

        logger.info(f"Executed schedule {schedule_id} on {len(zones)} zones")

    except Schedule.DoesNotExist:
        logger.error(f"Schedule {schedule_id} not found")
    except Exception as e:
        logger.error(f"Error executing schedule {schedule_id}: {e}")
