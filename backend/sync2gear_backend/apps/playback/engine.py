"""
Playback engine for sync2gear.

Handles continuous playback, queue management, and announcement interruption.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import random
import logging
from django.db import transaction
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import PlaybackState
from apps.music.models import MusicFile, Folder
from apps.scheduler.models import ChannelPlaylist, ChannelPlaylistItem

logger = logging.getLogger(__name__)


class PlaybackEngine:
    """
    Playback engine for managing continuous playback across zones.
    
    Features:
    - Continuous playback (never stops)
    - Multi-playlist support
    - Shuffle mode
    - Announcement interruption with resume
    - Real-time state broadcasting
    """
    
    @staticmethod
    def start_playlist(zone_id, playlist_ids, shuffle=False):
        """
        Start playback with specified playlists.
        
        Args:
            zone_id: UUID of zone
            playlist_ids: List of playlist UUIDs (ChannelPlaylist or Folder)
            shuffle: Whether to shuffle tracks
        """
        with transaction.atomic():
            # Get zone first to ensure it exists
            from apps.zones.models import Zone
            try:
                zone = Zone.objects.get(id=zone_id)
            except Zone.DoesNotExist:
                logger.error(f"Zone {zone_id} not found")
                return
            
            state, created = PlaybackState.objects.select_for_update().get_or_create(
                zone=zone,
                defaults={
                    'is_playing': True,
                    'shuffle': shuffle,
                }
            )
            
            # Build queue from playlists
            queue = PlaybackEngine.build_queue(playlist_ids, shuffle)
            
            if not queue:
                logger.warning(f"No tracks found for playlists: {playlist_ids}")
                return
            
            # Set first track
            state.queue = queue
            state.queue_position = 0
            state.current_playlists = playlist_ids
            # Assign ForeignKey properly
            if queue:
                try:
                    state.current_track = MusicFile.objects.get(id=queue[0])
                except MusicFile.DoesNotExist:
                    logger.error(f"Music file {queue[0]} not found")
                    return
            state.is_playing = True
            state.position = 0
            state.shuffle = shuffle
            state.save()
            
            # Broadcast state
            PlaybackEngine.broadcast_state(zone_id)
            
            logger.info(f"Started playback on zone {zone_id} with {len(queue)} tracks")
    
    @staticmethod
    def start_music_files(zone_id, music_file_ids, shuffle=False):
        """
        Start playback with specific music file IDs.
        
        Args:
            zone_id: UUID of zone
            music_file_ids: List of music file UUIDs
            shuffle: Whether to shuffle tracks
        """
        with transaction.atomic():
            # Get zone first to ensure it exists
            from apps.zones.models import Zone
            try:
                zone = Zone.objects.get(id=zone_id)
            except Zone.DoesNotExist:
                logger.error(f"Zone {zone_id} not found")
                return
            
            # Build queue directly from music file IDs
            queue = list(music_file_ids)
            if shuffle:
                random.shuffle(queue)
            
            if not queue:
                logger.warning(f"No music files provided: {music_file_ids}")
                return
            
            # Get or create playback state
            state, created = PlaybackState.objects.get_or_create(
                zone=zone,
                defaults={'is_playing': False}
            )
            
            # Update state
            state.queue = queue
            state.queue_position = 0
            state.is_playing = True
            state.shuffle = shuffle
            state.current_playlists = []  # No playlists, just direct music files
            
            if queue:
                try:
                    state.current_track = MusicFile.objects.get(id=queue[0])
                except MusicFile.DoesNotExist:
                    logger.error(f"Music file {queue[0]} not found")
                    state.current_track = None
            
            state.save()
            
            # Broadcast state change
            PlaybackEngine.broadcast_state(zone_id)
            
            logger.info(f"Started playback on zone {zone_id} with {len(queue)} music files")
    
    @staticmethod
    def build_queue(playlist_ids, shuffle=False):
        """
        Build track queue from playlists.
        
        Args:
            playlist_ids: List of playlist UUIDs
            shuffle: Whether to shuffle
            
        Returns:
            List of track UUIDs
        """
        all_tracks = []
        
        for playlist_id in playlist_ids:
            try:
                # Try ChannelPlaylist first
                try:
                    playlist = ChannelPlaylist.objects.get(id=playlist_id)
                    tracks = PlaybackEngine._get_tracks_from_channel_playlist(playlist)
                except ChannelPlaylist.DoesNotExist:
                    # Try Folder
                    try:
                        folder = Folder.objects.get(id=playlist_id, type='music')
                        tracks = PlaybackEngine._get_tracks_from_folder(folder)
                    except Folder.DoesNotExist:
                        logger.warning(f"Playlist {playlist_id} not found")
                        continue
                
                all_tracks.extend(tracks)
            except Exception as e:
                logger.error(f"Error building queue from playlist {playlist_id}: {e}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_tracks = []
        for track_id in all_tracks:
            if track_id not in seen:
                seen.add(track_id)
                unique_tracks.append(track_id)
        
        # Shuffle if requested
        if shuffle:
            random.shuffle(unique_tracks)
        
        return unique_tracks
    
    @staticmethod
    def _get_tracks_from_channel_playlist(playlist):
        """Get music track IDs from channel playlist."""
        track_ids = []
        
        for item in playlist.items.filter(item_type='music'):
            track_ids.append(item.content_id)
        
        return track_ids
    
    @staticmethod
    def _get_tracks_from_folder(folder):
        """Get music track IDs from folder."""
        return list(folder.music_files.values_list('id', flat=True))
    
    @staticmethod
    def next_track(zone_id):
        """
        Move to next track in queue.
        
        If at end of queue, loops back to start (continuous playback).
        """
        with transaction.atomic():
            try:
                from apps.zones.models import Zone
                zone = Zone.objects.get(id=zone_id)
                state = PlaybackState.objects.select_for_update().get(zone=zone)
            except Zone.DoesNotExist:
                logger.warning(f"Zone {zone_id} not found")
                return
            except PlaybackState.DoesNotExist:
                logger.warning(f"No playback state for zone {zone_id}")
                return
            
            # Move to next position
            state.queue_position += 1
            
            # Loop at end (continuous playback)
            if state.queue_position >= len(state.queue):
                state.queue_position = 0
                
                # Rebuild queue if shuffle is on (for variety)
                if state.shuffle and state.current_playlists:
                    state.queue = PlaybackEngine.build_queue(
                        state.current_playlists,
                        shuffle=True
                    )
            
            # Update current track
            if state.queue:
                try:
                    state.current_track = MusicFile.objects.get(id=state.queue[state.queue_position])
                except MusicFile.DoesNotExist:
                    logger.error(f"Music file {state.queue[state.queue_position]} not found")
                    return
                state.current_announcement = None
                state.position = 0
                state.save()
                
                # Broadcast state
                PlaybackEngine.broadcast_state(zone_id)
                
                logger.info(f"Next track on zone {zone_id}: position {state.queue_position}")
    
    @staticmethod
    def previous_track(zone_id):
        """Move to previous track or restart current."""
        with transaction.atomic():
            try:
                from apps.zones.models import Zone
                zone = Zone.objects.get(id=zone_id)
                state = PlaybackState.objects.select_for_update().get(zone=zone)
            except PlaybackState.DoesNotExist:
                return
            
            # If position > 3 seconds, restart current track
            if state.position > 3:
                state.position = 0
            else:
                # Move to previous
                state.queue_position -= 1
                if state.queue_position < 0:
                    state.queue_position = len(state.queue) - 1 if state.queue else 0
                
                if state.queue:
                    try:
                        state.current_track = MusicFile.objects.get(id=state.queue[state.queue_position])
                    except MusicFile.DoesNotExist:
                        logger.error(f"Music file {state.queue[state.queue_position]} not found")
                        return
                    state.current_announcement = None
                    state.position = 0
            
            state.save()
            PlaybackEngine.broadcast_state(zone_id)
    
    @staticmethod
    def pause(zone_id):
        """Pause playback."""
        PlaybackEngine.update_state(zone_id, is_playing=False)
    
    @staticmethod
    def resume(zone_id):
        """Resume playback."""
        PlaybackEngine.update_state(zone_id, is_playing=True)
    
    @staticmethod
    def set_volume(zone_id, volume):
        """Set playback volume."""
        if not (0 <= volume <= 100):
            raise ValueError("Volume must be between 0 and 100")
        
        PlaybackEngine.update_state(zone_id, volume=volume)
    
    @staticmethod
    def seek(zone_id, position):
        """Seek to position in current track."""
        if position < 0:
            position = 0
        
        PlaybackEngine.update_state(zone_id, position=position)
    
    @staticmethod
    def handle_announcement(zone_id, announcement_id):
        """
        Handle announcement interruption.
        
        Saves current state, plays announcement, then resumes.
        """
        with transaction.atomic():
            try:
                from apps.zones.models import Zone
                zone = Zone.objects.get(id=zone_id)
                state = PlaybackState.objects.select_for_update().get(zone=zone)
            except Zone.DoesNotExist:
                logger.warning(f"Zone {zone_id} not found")
                return
            except PlaybackState.DoesNotExist:
                logger.warning(f"No playback state for zone {zone_id}")
                return
            
            # Save current state (for resume)
            # Note: In a real implementation, you'd save this to a separate table
            # For now, we'll just pause music and play announcement
            
            # Set announcement as current
            from apps.announcements.models import Announcement
            try:
                state.current_announcement = Announcement.objects.get(id=announcement_id)
            except Announcement.DoesNotExist:
                logger.error(f"Announcement {announcement_id} not found")
                return
            state.current_track = None
            state.is_playing = True
            state.position = 0  # Start of announcement
            state.save()
            
            # Broadcast state
            PlaybackEngine.broadcast_state(zone_id)
            
            logger.info(f"Playing announcement {announcement_id} on zone {zone_id}")
            
            # Note: In a real device implementation, the device would:
            # 1. Fade out music to background_volume_percent
            # 2. Play announcement
            # 3. Call resume_after_announcement when done
    
    @staticmethod
    def resume_after_announcement(zone_id):
        """Resume music after announcement completes."""
        with transaction.atomic():
            try:
                from apps.zones.models import Zone
                zone = Zone.objects.get(id=zone_id)
                state = PlaybackState.objects.select_for_update().get(zone=zone)
            except Zone.DoesNotExist:
                logger.warning(f"Zone {zone_id} not found")
                return
            except PlaybackState.DoesNotExist:
                return
            
            # Clear announcement
            state.current_announcement = None
            
            # Resume music (restore previous track or continue)
            if not state.current_track and state.queue:
                try:
                    state.current_track = MusicFile.objects.get(id=state.queue[state.queue_position])
                except MusicFile.DoesNotExist:
                    logger.error(f"Music file {state.queue[state.queue_position]} not found")
                    return
            
            state.is_playing = True
            state.save()
            
            PlaybackEngine.broadcast_state(zone_id)
            
            logger.info(f"Resumed music on zone {zone_id}")
    
    @staticmethod
    def update_state(zone_id, **kwargs):
        """Update playback state."""
        # "all-zones" should be handled in views, not here
        # This method expects a valid UUID zone_id
        if zone_id == 'all-zones':
            logger.warning("update_state called with 'all-zones' - this should be handled in views")
            return
        
        with transaction.atomic():
            from apps.zones.models import Zone
            
            # Normal case: single zone
            try:
                zone = Zone.objects.get(id=zone_id)
                state = PlaybackState.objects.select_for_update().get(zone=zone)
            except Zone.DoesNotExist:
                logger.warning(f"Zone {zone_id} not found")
                return
            except PlaybackState.DoesNotExist:
                logger.warning(f"No playback state for zone {zone_id}")
                return
            
            for key, value in kwargs.items():
                if hasattr(state, key):
                    setattr(state, key, value)
            
            state.save()
            PlaybackEngine.broadcast_state(zone_id)
    
    @staticmethod
    def broadcast_state(zone_id):
        """
        Broadcast playback state to WebSocket clients.
        
        Sends state update to all clients connected to this zone.
        """
        try:
            from apps.zones.models import Zone
            zone = Zone.objects.get(id=zone_id)
            state = PlaybackState.objects.select_related(
                'current_track', 'current_announcement', 'zone'
            ).get(zone=zone)
        except Zone.DoesNotExist:
            logger.warning(f"Zone {zone_id} not found for broadcast")
            return
        except PlaybackState.DoesNotExist:
            logger.warning(f"No playback state to broadcast for zone {zone_id}")
            return
        
        try:
            from .serializers import PlaybackStateSerializer
            serializer = PlaybackStateSerializer(state)
            data = serializer.data
            
            # Send via WebSocket
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'playback_{zone_id}',
                {
                    'type': 'playback_update',
                    'data': data
                }
            )
        except Exception as e:
            logger.error(f"Error broadcasting state for zone {zone_id}: {e}")
