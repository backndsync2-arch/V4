"""
Zones views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Floor, Zone, Device
from .serializers import FloorSerializer, ZoneSerializer, DeviceSerializer
from apps.common.permissions import IsSameClient
from apps.common.exceptions import ValidationError, NotFoundError
import logging

logger = logging.getLogger(__name__)


class FloorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Floor CRUD operations.
    """
    serializer_class = FloorSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter floors by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Floor.objects.none()
        
        queryset = Floor.objects.filter(client=user.client)
        
        # Floor users can only see their assigned floor
        if user.role == 'floor_user' and user.floor_id:
            queryset = queryset.filter(id=user.floor_id)
        
        return queryset.prefetch_related('zones', 'zones__devices')
    
    def perform_create(self, serializer):
        """Create floor with client and creator."""
        # Check premium feature for multiple floors
        client = self.request.user.client
        existing_floors = Floor.objects.filter(client=client).count()
        
        if existing_floors > 0 and not client.get_premium_feature('multiFloor', False):
            raise ValidationError("Multiple floors require premium subscription")
        
        # First floor is free, others are premium
        is_premium = existing_floors > 0
        
        serializer.save(
            client=client,
            created_by=self.request.user,
            is_premium=is_premium
        )


class ZoneViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Zone CRUD operations.
    """
    serializer_class = ZoneSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter zones by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Zone.objects.none()
        
        queryset = Zone.objects.filter(client=user.client)
        
        # Filter by floor if provided
        floor_id = self.request.query_params.get('floor')
        if floor_id:
            queryset = queryset.filter(floor_id=floor_id)
        
        # Floor users can only see zones in their floor
        if user.role == 'floor_user' and user.floor_id:
            queryset = queryset.filter(floor_id=user.floor_id)
        
        return queryset.select_related('floor').prefetch_related('devices')
    
    def perform_create(self, serializer):
        """Create zone with client."""
        serializer.save(client=self.request.user.client)


class DeviceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Device CRUD operations.
    """
    serializer_class = DeviceSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'device_id', 'model']
    ordering_fields = ['name', 'last_seen', 'created_at']
    ordering = ['zone', 'name']
    
    def get_queryset(self):
        """Filter devices by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Device.objects.none()
        
        queryset = Device.objects.filter(client=user.client)
        
        # Filter by zone if provided
        zone_id = self.request.query_params.get('zone')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        
        # Filter by online status
        is_online = self.request.query_params.get('is_online')
        if is_online is not None:
            queryset = queryset.filter(is_online=is_online.lower() == 'true')
        
        # Floor users can only see devices in their floor
        if user.role == 'floor_user' and user.floor_id:
            queryset = queryset.filter(zone__floor_id=user.floor_id)
        
        return queryset.select_related('zone', 'zone__floor')
    
    def perform_create(self, serializer):
        """Create device with client."""
        serializer.save(client=self.request.user.client)
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new device."""
        device_id = request.data.get('device_id')  # Hardware ID
        name = request.data.get('name')
        device_type = request.data.get('device_type', 'speaker')
        zone_id = request.data.get('zone_id')
        
        if not device_id:
            # Generate a temporary device_id if not provided
            import uuid
            device_id = str(uuid.uuid4())
        
        if not name:
            raise ValidationError("name is required")
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        # Check if device already exists
        try:
            device = Device.objects.get(device_id=device_id)
            # Update existing device
            device.name = name
            device.device_type = device_type
            device.zone_id = zone_id
            device.client = request.user.client
            device.update_heartbeat()
            device.save()
            
            serializer = self.get_serializer(device)
            return Response(serializer.data)
        except Device.DoesNotExist:
            # Create new device
            try:
                zone = Zone.objects.get(id=zone_id, client=request.user.client)
            except Zone.DoesNotExist:
                raise NotFoundError("Zone", zone_id)
            
            device = Device.objects.create(
                device_id=device_id,
                name=name,
                device_type=device_type,
                zone=zone,
                client=request.user.client,
                is_online=True
            )
            device.update_heartbeat()
            
            serializer = self.get_serializer(device)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """Update device heartbeat and send real-time status update."""
        device = self.get_object()
        was_online = device.is_online

        device.update_heartbeat()

        # Send WebSocket notification if status changed
        if not was_online and device.is_online:
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                event_data = {
                    'device_id': str(device.id),
                    'device_name': device.name,
                    'zone_id': str(device.zone.id) if device.zone else None,
                    'zone_name': device.zone.name if device.zone else None,
                    'is_online': True,
                    'last_seen': device.last_seen.isoformat() if device.last_seen else None,
                    'volume': device.volume,
                }

                # Send to global events group
                async_to_sync(channel_layer.group_send)(
                    'global_events',
                    {
                        'type': 'device_status_change',
                        'data': event_data
                    }
                )

                logger.info(f"Device {device.name} came online - notification sent")
            except Exception as e:
                logger.error(f"Failed to send online notification for device {device.name}: {e}")

        serializer = self.get_serializer(device)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def volume(self, request, pk=None):
        """Set device volume."""
        device = self.get_object()
        volume = request.data.get('volume')
        
        if volume is None:
            raise ValidationError("volume is required")
        
        if not (0 <= volume <= 100):
            raise ValidationError("volume must be between 0 and 100")
        
        device.volume = volume
        device.save(update_fields=['volume'])

        serializer = self.get_serializer(device)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        """Send a ping/test tone to device."""
        device = self.get_object()
        tone_type = request.data.get('tone_type', 'ping')  # 'ping', 'test_tone', 'beep'
        duration = request.data.get('duration', 1)  # Duration in seconds
        volume = request.data.get('volume', device.volume or 50)  # Use device volume or default

        # Validate parameters
        if tone_type not in ['ping', 'test_tone', 'beep']:
            raise ValidationError("tone_type must be one of: ping, test_tone, beep")

        if not (0.1 <= duration <= 10):
            raise ValidationError("duration must be between 0.1 and 10 seconds")

        if not (0 <= volume <= 100):
            raise ValidationError("volume must be between 0 and 100")

        try:
            # Here you would implement the actual device communication
            # For now, we'll simulate the ping/test tone command

            # TODO: Implement actual device communication (MQTT, WebSocket, API call, etc.)
            # This could involve:
            # - Sending MQTT message to device
            # - Making HTTP request to device API
            # - Queueing command for device daemon

            # For demonstration, we'll log the command and return success
            logger.info(f"Sending {tone_type} to device {device.name} (ID: {device.id}) - Duration: {duration}s, Volume: {volume}%")

            # Simulate processing time
            import time
            time.sleep(0.1)  # Brief delay to simulate command processing

            return Response({
                'message': f'{tone_type.replace("_", " ").title()} sent to device',
                'device_id': device.id,
                'device_name': device.name,
                'tone_type': tone_type,
                'duration': duration,
                'volume': volume,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to ping device {device.name}: {e}")
            raise ValidationError(f"Failed to send ping to device: {str(e)}")

    @action(detail=True, methods=['post'])
    def test_tone(self, request, pk=None):
        """Alias for ping with test_tone type."""
        request.data['tone_type'] = 'test_tone'
        return self.ping(request, pk)

    @action(detail=True, methods=['post'])
    def send_schedule(self, request, pk=None):
        """Send schedule configuration to device."""
        device = self.get_object()
        schedule_data = request.data.get('schedule')

        if not schedule_data:
            raise ValidationError("schedule data is required")

        # Validate schedule structure
        if not isinstance(schedule_data, dict):
            raise ValidationError("schedule must be a valid JSON object")

        try:
            # Here you would implement the actual schedule sync with device
            # This could involve sending the schedule configuration to the device

            # TODO: Implement actual device schedule synchronization
            # This might involve:
            # - Updating device firmware/configuration
            # - Sending schedule via MQTT/WebSocket
            # - Storing schedule locally on device

            logger.info(f"Sending schedule to device {device.name} (ID: {device.id})")

            # Simulate processing time
            import time
            time.sleep(0.2)  # Brief delay to simulate command processing

            return Response({
                'message': 'Schedule sent to device',
                'device_id': device.id,
                'device_name': device.name,
                'schedule_data': schedule_data,
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to send schedule to device {device.name}: {e}")
            raise ValidationError(f"Failed to send schedule to device: {str(e)}")
