"""
Simple Scheduler Views - Clean, Simple Implementation

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import Schedule
from apps.common.permissions import IsSameClient
from apps.playback.engine import PlaybackEngine
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsSameClient])
def get_active_schedules(request):
    """Get all active schedules for the user's client, optionally filtered by zone."""
    queryset = Schedule.objects.filter(
        client=request.user.client,
        enabled=True
    ).prefetch_related('zones')
    
    # Filter by zone if zone_id query parameter is provided
    zone_id = request.query_params.get('zone_id')
    if zone_id:
        queryset = queryset.filter(zones__id=zone_id).distinct()
    
    result = []
    for schedule in queryset:
        config = schedule.schedule_config
        announcement_ids = config.get('announcementIds', [])
        zone_ids = [str(z.id) for z in schedule.zones.all()]
        
        # Calculate countdown
        countdown_seconds = None
        if schedule.last_executed_at:
            interval_minutes = config.get('intervalMinutes', 60)
            elapsed = (timezone.now() - schedule.last_executed_at).total_seconds()
            remaining = (interval_minutes * 60) - elapsed
            countdown_seconds = max(0, int(remaining))
        
        result.append({
            'id': str(schedule.id),
            'name': schedule.name,
            'intervalMinutes': config.get('intervalMinutes', 60),
            'announcementIds': announcement_ids,
            'zoneIds': zone_ids,
            'lastExecutedAt': schedule.last_executed_at.isoformat() if schedule.last_executed_at else None,
            'countdownSeconds': countdown_seconds,
        })
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsSameClient])
def execute_schedules(request):
    """Check and execute due schedules. Returns what was executed."""
    now = timezone.now()
    executed = []
    
    schedules = Schedule.objects.filter(
        client=request.user.client,
        enabled=True
    ).prefetch_related('zones')
    
    for schedule in schedules:
        config = schedule.schedule_config
        interval_minutes = config.get('intervalMinutes', 60)
        
        # Check if schedule should execute
        should_execute = False
        if not schedule.last_executed_at:
            # Never executed - execute now
            should_execute = True
        else:
            # Check if interval has passed
            elapsed_minutes = (now - schedule.last_executed_at).total_seconds() / 60
            if elapsed_minutes >= interval_minutes:
                should_execute = True
        
        if should_execute:
            # Execute the schedule
            announcement_ids = config.get('announcementIds', [])
            zones = list(schedule.zones.all())
            
            if announcement_ids and zones:
                # Play first announcement on all zones
                announcement_id = announcement_ids[0]
                for zone in zones:
                    try:
                        PlaybackEngine.handle_announcement(str(zone.id), announcement_id)
                    except Exception as e:
                        logger.error(f"Failed to play announcement on zone {zone.id}: {e}")
                
                # Update last executed time
                schedule.last_executed_at = now
                schedule.save(update_fields=['last_executed_at'])
                
                executed.append({
                    'scheduleId': str(schedule.id),
                    'scheduleName': schedule.name,
                    'announcementId': announcement_id,
                    'zoneIds': [str(z.id) for z in zones],
                })
    
    return Response({
        'executed': executed,
        'count': len(executed),
    })

