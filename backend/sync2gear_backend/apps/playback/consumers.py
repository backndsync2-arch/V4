"""
WebSocket consumers for playback app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.auth import get_user
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class PlaybackConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time playback updates.
    
    Clients connect to: ws://host/ws/playback/{zone_id}/
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.zone_id = self.scope['url_route']['kwargs']['zone_id']
        self.room_group_name = f'playback_{self.zone_id}'
        
        # Authenticate user
        user = await self.get_user()
        if not user or not user.is_authenticated:
            await self.close()
            return
        
        # Verify user has access to this zone
        has_access = await self.check_zone_access(user, self.zone_id)
        if not has_access:
            await self.close()
            return
        
        # Join zone group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current state
        state = await self.get_playback_state()
        await self.send(text_data=json.dumps({
            'type': 'playback_state',
            'data': state
        }))
        
        logger.info(f"WebSocket connected: zone {self.zone_id}, user {user.email}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected: zone {self.zone_id}")
    
    async def receive(self, text_data):
        """Handle messages from client."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            # Add more message handlers as needed
            
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def playback_update(self, event):
        """Send playback update to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'playback_update',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def get_user(self):
        """Get authenticated user from token."""
        try:
            # Get token from query string or headers
            query_string = self.scope.get('query_string', b'').decode()
            token = None
            
            # Try query string first
            if 'token=' in query_string:
                token = query_string.split('token=')[1].split('&')[0]
            else:
                # Try headers
                headers = dict(self.scope.get('headers', []))
                auth_header = headers.get(b'authorization', b'').decode()
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return None
            
            # Validate token
            try:
                UntypedToken(token)
            except (InvalidToken, TokenError):
                return None
            
            # Get user from token
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        
        except Exception as e:
            logger.error(f"Error authenticating WebSocket: {e}")
            return None
    
    @database_sync_to_async
    def check_zone_access(self, user, zone_id):
        """Check if user has access to zone."""
        try:
            from apps.zones.models import Zone
            
            zone = Zone.objects.get(id=zone_id)
            
            # Admin can access all
            if user.role == 'admin':
                return True
            
            # Check client match
            if hasattr(user, 'client') and user.client == zone.client:
                # Floor users can only access their floor
                if user.role == 'floor_user' and user.floor_id:
                    return zone.floor_id == user.floor_id
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error checking zone access: {e}")
            return False
    
    @database_sync_to_async
    def get_playback_state(self):
        """Get current playback state."""
        try:
            from .models import PlaybackState
            from .serializers import PlaybackStateSerializer
            
            state = PlaybackState.objects.select_related(
                'current_track', 'current_announcement', 'zone'
            ).get(zone_id=self.zone_id)
            
            serializer = PlaybackStateSerializer(state)
            return serializer.data
        except PlaybackState.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error getting playback state: {e}")
            return None


class EventsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for global events.
    
    Clients connect to: ws://host/ws/events/
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        # Authenticate user
        user = await self.get_user()
        if not user or not user.is_authenticated:
            await self.close()
            return
        
        # Join global events group
        self.room_group_name = 'global_events'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Events WebSocket connected: user {user.email}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages from client."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except:
            pass
    
    async def device_status_change(self, event):
        """Send device status change event."""
        await self.send(text_data=json.dumps({
            'type': 'device_status_change',
            'data': event['data']
        }))
    
    async def schedule_executed(self, event):
        """Send schedule execution event."""
        await self.send(text_data=json.dumps({
            'type': 'schedule_executed',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def get_user(self):
        """Get authenticated user from token."""
        try:
            query_string = self.scope.get('query_string', b'').decode()
            token = None
            
            if 'token=' in query_string:
                token = query_string.split('token=')[1].split('&')[0]
            else:
                headers = dict(self.scope.get('headers', []))
                auth_header = headers.get(b'authorization', b'').decode()
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
            
            if not token:
                return None
            
            try:
                UntypedToken(token)
            except (InvalidToken, TokenError):
                return None
            
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.error(f"Error authenticating WebSocket: {e}")
            return None
