"""
Music library serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from .models import Folder, MusicFile
from apps.authentication.serializers import UserSerializer
import logging

logger = logging.getLogger(__name__)


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model."""
    
    music_files_count = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'description', 'type', 'client_id', 'zone_id', 'zone_name',
            'parent_id', 'cover_image', 'cover_image_url',
            'is_system', 'music_files_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_music_files_count(self, obj):
        """Get count of music files in folder."""
        if obj.type == 'music':
            return obj.music_files.count()
        return 0
    
    def get_cover_image_url(self, obj):
        """Get cover image URL."""
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None


class MusicFileSerializer(serializers.ModelSerializer):
    """Serializer for MusicFile model."""
    
    file_url = serializers.SerializerMethodField()
    cover_art_url = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    
    class Meta:
        model = MusicFile
        fields = [
            'id', 'file', 'file_url', 'filename', 'file_size',
            'title', 'artist', 'album', 'genre', 'year', 'duration',
            'cover_art', 'cover_art_url', 'folder_id', 'folder_name',
            'zone_id', 'zone_name', 'client_id', 'order', 'uploaded_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_url', 'cover_art_url', 'folder_name',
            'uploaded_by_name', 'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Get file URL."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_cover_art_url(self, obj):
        """Get cover art URL."""
        if obj.cover_art:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_art.url)
            return obj.cover_art.url
        return None


class MusicFileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating music files (with file upload)."""

    # Explicit field required: ModelSerializer doesn't reliably treat `folder_id` (FK id accessor)
    # as a writable field unless declared.
    folder_id = serializers.UUIDField(required=False, allow_null=True)
    zone_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = MusicFile
        fields = [
            'file', 'folder_id', 'zone_id', 'title', 'artist', 'album', 'genre', 'year', 'cover_art'
        ]
        extra_kwargs = {
            # Allow uploads with just a file; we derive a default title from the filename in create().
            'title': {'required': False, 'allow_blank': True},
            'artist': {'required': False, 'allow_blank': True},
            'album': {'required': False, 'allow_blank': True},
            'genre': {'required': False, 'allow_blank': True},
            'year': {'required': False, 'allow_null': True},
            'folder_id': {'required': False, 'allow_null': True},
        }
    
    def create(self, validated_data):
        """Create music file and extract metadata."""
        folder_id = validated_data.pop('folder_id', None)
        zone_id = validated_data.pop('zone_id', None)
        
        request = self.context.get('request')
        client = getattr(getattr(request, 'user', None), 'client', None)
        
        if folder_id:
            # Ensure folder belongs to the current user's client
            try:
                folder = Folder.objects.get(id=folder_id, client=client)
                validated_data['folder'] = folder
                # If zone_id not provided but folder has a zone, use folder's zone
                if not zone_id and folder.zone:
                    zone_id = folder.zone.id
            except Folder.DoesNotExist:
                raise serializers.ValidationError({'folder_id': 'Invalid folder.'})
        
        if zone_id:
            # Ensure zone belongs to the current user's client
            from apps.zones.models import Zone
            try:
                zone = Zone.objects.get(id=zone_id, client=client)
                validated_data['zone'] = zone
            except Zone.DoesNotExist:
                raise serializers.ValidationError({'zone_id': 'Invalid zone.'})

        # Set filename
        file = validated_data['file']
        validated_data['filename'] = file.name
        validated_data['file_size'] = file.size
        
        # Set default title if not provided
        if not validated_data.get('title'):
            validated_data['title'] = file.name.rsplit('.', 1)[0]
        
        # Set client from request user
        validated_data['client'] = self.context['request'].user.client
        validated_data['uploaded_by'] = self.context['request'].user
        
        # Set duration to 0 initially (will be calculated below or by async task)
        validated_data['duration'] = 0
        
        # Create music file first (so we have a file path to extract metadata from)
        music_file = MusicFile.objects.create(**validated_data)
        
        # Try to calculate duration synchronously (for dev environments without Celery)
        try:
            from mutagen import File as MutagenFile
            
            if music_file.file and hasattr(music_file.file, 'path'):
                audio = MutagenFile(music_file.file.path)
                
                if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    music_file.duration = int(audio.info.length)
                    
                    # Also extract basic metadata if not provided
                    if not music_file.title or music_file.title == file.name.rsplit('.', 1)[0]:
                        title = audio.get('TIT2') or audio.get('TITLE') or audio.get('\xa9nam')
                        if title:
                            music_file.title = title[0] if isinstance(title, list) else str(title)
                    
                    if not music_file.artist:
                        artist = audio.get('TPE1') or audio.get('ARTIST') or audio.get('\xa9ART')
                        if artist:
                            music_file.artist = artist[0] if isinstance(artist, list) else str(artist)
                    
                    if not music_file.album:
                        album = audio.get('TALB') or audio.get('ALBUM') or audio.get('\xa9alb')
                        if album:
                            music_file.album = album[0] if isinstance(album, list) else str(album)
                    
                    music_file.save(update_fields=['duration', 'title', 'artist', 'album'])
                    logger.info(f"Duration extracted synchronously for {music_file.id}: {music_file.duration}s")
        except Exception as e:
            # If synchronous extraction fails, duration stays 0 and will be calculated async
            logger.warning(f"Could not extract duration synchronously for {music_file.id}: {e}")
        
        # Trigger async metadata extraction (will update duration and other metadata if not already set)
        try:
            from .tasks import extract_metadata
            extract_metadata.delay(str(music_file.id))
        except Exception as e:
            # Dev environments often run without Redis/Celery; duration already calculated synchronously above
            logger.warning(f"Celery unavailable; metadata already extracted synchronously for {music_file.id}: {e}")
        
        return music_file

    def validate_file(self, value):
        """
        Only allow audio uploads for the music library.
        (Prevents non-audio files like .md from being added and breaking playback.)
        """
        content_type = getattr(value, 'content_type', None) or ''
        if not content_type.startswith('audio/'):
            raise serializers.ValidationError('Only audio files are allowed (e.g., MP3, WAV, M4A).')
        return value
