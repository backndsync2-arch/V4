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
    ).prefetch_related('zones')
    
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
            elif schedule_type == 'datetime':
                should_run = _check_datetime_schedule(schedule, now, current_time, current_weekday)
            
            if should_run:
                # Try to execute as Celery task, fallback to direct execution
                try:
                    execute_schedule.delay(str(schedule.id))
                except Exception:
                    # Celery not available, execute directly
                    _execute_schedule_impl(str(schedule.id))
                executed_count += 1
        
        except Exception as e:
            logger.error(f"Error checking schedule {schedule.id}: {e}")
    
    logger.info(f"Checked {active_schedules.count()} schedules, executed {executed_count}")


def _check_interval_schedule(schedule, now, current_time):
    """Check if interval schedule should run."""
    config = schedule.schedule_config
    interval_minutes = config.get('intervalMinutes', 60)
    
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
    
    # Check if enough time has passed since last execution
    if schedule.last_executed_at:
        time_since_last = (now - schedule.last_executed_at).total_seconds() / 60
        if time_since_last < interval_minutes:
            return False
    
    # If no last execution time, allow execution (first run)
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


def _check_datetime_schedule(schedule, now, current_time, current_weekday):
    """Check if datetime schedule should run."""
    from datetime import date as date_type
    
    config = schedule.schedule_config
    date_time_slots = config.get('dateTimeSlots', [])
    current_date = now.date()
    current_weekday_python = now.weekday()  # 0=Monday, 6=Sunday
    
    for slot in date_time_slots:
        slot_date_str = slot.get('date')
        slot_time_str = slot.get('time')
        repeat = slot.get('repeat', 'none')
        repeat_days = slot.get('repeatDays', [])
        end_date_str = slot.get('endDate')
        
        if not slot_date_str or not slot_time_str:
            continue
        
        # Parse date
        try:
            slot_date = datetime.strptime(slot_date_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            continue
        
        # Parse time (handle both 24h and 12h formats)
        try:
            if 'AM' in slot_time_str or 'PM' in slot_time_str:
                # 12-hour format
                time_part = slot_time_str.replace(' AM', '').replace(' PM', '')
                period = 'PM' if 'PM' in slot_time_str else 'AM'
                hour, minute = map(int, time_part.split(':'))
                if period == 'PM' and hour != 12:
                    hour += 12
                elif period == 'AM' and hour == 12:
                    hour = 0
                slot_time = time(hour, minute)
            else:
                # 24-hour format
                hour, minute = map(int, slot_time_str.split(':'))
                slot_time = time(hour, minute)
        except (ValueError, TypeError):
            continue
        
        # Check if end date has passed
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                if current_date > end_date:
                    continue
            except (ValueError, TypeError):
                pass
        
        # Check if time matches (within 1 minute window)
        time_diff = abs(
            (current_time.hour * 60 + current_time.minute) - 
            (slot_time.hour * 60 + slot_time.minute)
        )
        if time_diff > 1:
            continue
        
        # Check date/repeat logic
        if repeat == 'none':
            # One-time schedule - check if date matches
            if current_date == slot_date:
                return True
        elif repeat == 'daily':
            # Daily - check if date is on or after slot date
            if current_date >= slot_date:
                return True
        elif repeat == 'weekly':
            # Weekly - check if weekday matches and date is on or after slot date
            if current_date >= slot_date:
                # Frontend sends JS weekday (0=Sun, 6=Sat)
                # Python uses (0=Mon, 6=Sun)
                # Convert Python weekday to JS weekday for comparison
                js_weekday = (current_weekday_python + 1) % 7  # Convert Mon=0 to Sun=1, then mod 7
                if repeat_days and js_weekday in repeat_days:
                    return True
        elif repeat == 'monthly':
            # Monthly - check if day of month matches and date is on or after slot date
            if current_date >= slot_date and current_date.day == slot_date.day:
                return True
        elif repeat == 'yearly':
            # Yearly - check if month and day match and date is on or after slot date
            if current_date >= slot_date and current_date.month == slot_date.month and current_date.day == slot_date.day:
                return True
    
    return False


@shared_task
def execute_schedule(schedule_id):
    """Execute a schedule (can be called directly or via Celery)."""
    _execute_schedule_impl(schedule_id)

def _execute_schedule_impl(schedule_id):
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

        elif schedule_type == 'datetime':
            # Play announcements at specific date/time
            date_time_slots = config.get('dateTimeSlots', [])
            current_time = timezone.now().time()
            current_date = timezone.now().date()

            for slot in date_time_slots:
                announcement_id = slot.get('announcementId')
                slot_date_str = slot.get('date')
                slot_time_str = slot.get('time')
                
                if not announcement_id or not slot_date_str or not slot_time_str:
                    continue
                
                # Parse time
                try:
                    if 'AM' in slot_time_str or 'PM' in slot_time_str:
                        time_part = slot_time_str.replace(' AM', '').replace(' PM', '')
                        period = 'PM' if 'PM' in slot_time_str else 'AM'
                        hour, minute = map(int, time_part.split(':'))
                        if period == 'PM' and hour != 12:
                            hour += 12
                        elif period == 'AM' and hour == 12:
                            hour = 0
                        slot_time = time(hour, minute)
                    else:
                        hour, minute = map(int, slot_time_str.split(':'))
                        slot_time = time(hour, minute)
                except (ValueError, TypeError):
                    continue
                
                # Check if time matches (within 1 minute)
                time_diff = abs(
                    (current_time.hour * 60 + current_time.minute) - 
                    (slot_time.hour * 60 + slot_time.minute)
                )
                
                if time_diff <= 1:
                    # Time matches, play announcement
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

        # Update last execution time
        schedule.last_executed_at = timezone.now()
        schedule.save(update_fields=['last_executed_at'])
        
        logger.info(f"Executed schedule {schedule_id} on {len(zones)} zones")

    except Schedule.DoesNotExist:
        logger.error(f"Schedule {schedule_id} not found")
    except Exception as e:
        logger.error(f"Error executing schedule {schedule_id}: {e}")
