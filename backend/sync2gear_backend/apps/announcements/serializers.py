"""
Announcements serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from .models import Announcement, AnnouncementTemplate, AnnouncementTemplateFolder
from apps.music.serializers import FolderSerializer
from apps.authentication.serializers import UserSerializer
import logging

logger = logging.getLogger(__name__)


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for Announcement model."""
    
    file_url = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    type = serializers.SerializerMethodField()
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'file', 'file_url', 'duration', 'file_size',
            'is_tts', 'tts_text', 'tts_voice', 'tts_provider',
            'is_recording', 'enabled', 'category',
            'folder_id', 'folder_name', 'client_id',
            'created_by_name', 'type',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_url', 'folder_name', 'created_by_name',
            'type', 'created_at', 'updated_at'
        ]
    
    def get_file_url(self, obj):
        """Get file URL."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_type(self, obj):
        """Get announcement type."""
        return obj.type


class TTSCreateSerializer(serializers.Serializer):
    """Serializer for creating TTS announcement."""
    
    title = serializers.CharField(max_length=255)
    text = serializers.CharField()
    voice = serializers.CharField(max_length=50, required=False, allow_blank=True)
    provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
    folder_id = serializers.UUIDField(required=False, allow_null=True)
    
    def to_internal_value(self, data):
        """Convert empty string folder_id to None before validation."""
        if 'folder_id' in data and data['folder_id'] == '':
            data = data.copy()
            data['folder_id'] = None
        return super().to_internal_value(data)
    
    def validate_folder_id(self, value):
        """Validate folder_id - allow None or valid UUID."""
        if value == '' or value is None:
            return None
        return value
    
    def validate_text(self, value):
        """Validate TTS text length."""
        if len(value) > 5000:
            raise serializers.ValidationError("TTS text cannot exceed 5000 characters")
        if len(value.strip()) == 0:
            raise serializers.ValidationError("TTS text cannot be empty")
        return value


class AIGenerateSerializer(serializers.Serializer):
    """Serializer for AI text generation."""
    
    topic = serializers.CharField(max_length=500)
    tone = serializers.ChoiceField(
        choices=['professional', 'friendly', 'urgent', 'casual'],
        default='professional'
    )
    key_points = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(default=1, min_value=1, max_value=20)


class GenerateTemplatesSerializer(serializers.Serializer):
    """Serializer for generating announcement templates using AI."""
    
    category = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )
    quantity = serializers.IntegerField(default=5, min_value=1, max_value=50)
    tone = serializers.ChoiceField(
        choices=['professional', 'friendly', 'urgent', 'casual', 'energetic', 'calm'],
        default='friendly',
        required=False
    )
    
    def validate_category(self, value):
        """Validate category - allow predefined or custom."""
        if not value or value.strip() == '':
            return 'general'  # Default to general if empty
        # Normalize custom categories (convert to lowercase, replace spaces with hyphens)
        normalized = value.lower().strip().replace(' ', '-')
        # If it matches a predefined category, use that
        predefined = ['retail', 'restaurant', 'office', 'healthcare', 'gym', 'general']
        if normalized in predefined:
            return normalized
        # Otherwise, return the normalized custom category
        return normalized


class BatchTTSCreateSerializer(serializers.Serializer):
    """Serializer for creating multiple TTS announcements in batch."""
    
    announcements = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        min_length=1,
        max_length=50
    )
    voice = serializers.CharField(max_length=50, required=False, allow_blank=True)
    provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
    folder_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_announcements(self, value):
        """Validate each announcement in the batch."""
        for item in value:
            if 'title' not in item or 'text' not in item:
                raise serializers.ValidationError("Each announcement must have 'title' and 'text'")
            if not item.get('title', '').strip():
                raise serializers.ValidationError("Title cannot be empty")
            if not item.get('text', '').strip():
                raise serializers.ValidationError("Text cannot be empty")
        return value


class AnnouncementUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading announcement audio file."""
    
    zone_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    is_recording = serializers.BooleanField(required=False, default=False)
    
    class Meta:
        model = Announcement
        fields = ['file', 'title', 'folder_id', 'category', 'zone_id', 'is_recording']
        extra_kwargs = {
            # Allow uploads with just a file; we derive a default title from the filename in create().
            'title': {'required': False, 'allow_blank': True},
            'folder_id': {'required': False, 'allow_null': True},
            'category': {'required': False, 'allow_blank': True},
        }
    
    def create(self, validated_data):
        """Create announcement from uploaded file."""
        file = validated_data['file']
        zone_id = validated_data.pop('zone_id', None)
        is_recording = validated_data.pop('is_recording', False)
        
        validated_data['file_size'] = file.size
        validated_data['is_recording'] = is_recording
        
        # Set client and creator
        validated_data['client'] = self.context['request'].user.client
        validated_data['created_by'] = self.context['request'].user
        
        # If zone_id provided but no folder_id, try to find/create a folder for that zone
        if zone_id and not validated_data.get('folder_id'):
            from apps.music.models import Folder
            try:
                # Try to find an existing announcements folder for this zone
                folder = Folder.objects.filter(
                    client=self.context['request'].user.client,
                    zone_id=zone_id,
                    type='announcements'
                ).first()
                
                if folder:
                    validated_data['folder_id'] = folder.id
            except Exception as e:
                logger.warning(f"Could not find folder for zone {zone_id}: {e}")
        
        # Set default title if not provided
        if not validated_data.get('title'):
            validated_data['title'] = file.name.rsplit('.', 1)[0]
        
        # Set duration to 0 initially (will be calculated below or by async task)
        validated_data['duration'] = 0
        
        # Create announcement first (so we have a file path to extract metadata from)
        announcement = Announcement.objects.create(**validated_data)
        
        # Try to calculate duration synchronously (for dev environments without Celery)
        try:
            from mutagen import File as MutagenFile
            from io import BytesIO
            
            duration_calculated = False
            
            # Try path-based first
            if announcement.file and hasattr(announcement.file, 'path'):
                try:
                    audio = MutagenFile(announcement.file.path)
                    if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                        announcement.duration = int(audio.info.length)
                        announcement.save(update_fields=['duration'])
                        logger.info(f"Duration extracted synchronously (path) for announcement {announcement.id}: {announcement.duration}s")
                        duration_calculated = True
                except Exception as path_error:
                    logger.debug(f"Path-based read failed for {announcement.id}: {path_error}")
            
            # If path-based failed, try reading file content (works better for webm)
            if not duration_calculated and announcement.file:
                try:
                    announcement.file.open('rb')
                    file_content = announcement.file.read()
                    announcement.file.close()
                    audio = MutagenFile(BytesIO(file_content))
                    if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                        announcement.duration = int(audio.info.length)
                        announcement.save(update_fields=['duration'])
                        logger.info(f"Duration extracted synchronously (content) for announcement {announcement.id}: {announcement.duration}s")
                        duration_calculated = True
                except Exception as content_error:
                    logger.debug(f"Content-based read failed for {announcement.id}: {content_error}")
            
            # If mutagen fails (e.g., webm not supported), try pydub as fallback
            if not duration_calculated and announcement.file:
                try:
                    from pydub import AudioSegment
                    if hasattr(announcement.file, 'path'):
                        audio_segment = AudioSegment.from_file(announcement.file.path)
                        announcement.duration = int(len(audio_segment) / 1000.0)  # pydub returns milliseconds
                        announcement.save(update_fields=['duration'])
                        logger.info(f"Duration extracted using pydub for announcement {announcement.id}: {announcement.duration}s")
                        duration_calculated = True
                except ImportError:
                    logger.debug("pydub not available, skipping pydub duration calculation")
                except Exception as pydub_error:
                    logger.debug(f"pydub duration calculation failed for {announcement.id}: {pydub_error}")
                    
        except Exception as e:
            # If all synchronous extraction fails, duration stays 0 and will be calculated async
            logger.warning(f"Could not extract duration synchronously for announcement {announcement.id}: {e}")
        
        # Trigger async duration calculation (will update duration if not already set)
        try:
            from .tasks import calculate_audio_duration
            calculate_audio_duration.delay(str(announcement.id))
        except Exception as e:
            # Dev environments often run without Redis/Celery; duration already calculated synchronously above
            logger.warning(f"Celery unavailable; duration already calculated synchronously for {announcement.id}: {e}")
        
        return announcement

    def validate_file(self, value):
        """Only allow audio uploads for announcements."""
        content_type = getattr(value, 'content_type', None) or ''
        # Accept all audio types including webm, ogg, etc.
        if not content_type.startswith('audio/'):
            # Also check filename extension as fallback
            filename = getattr(value, 'name', '')
            audio_extensions = ['.mp3', '.wav', '.m4a', '.mpeg', '.webm', '.ogg', '.opus', '.aac', '.flac']
            if not any(filename.lower().endswith(ext) for ext in audio_extensions):
                raise serializers.ValidationError('Only audio files are allowed (e.g., MP3, WAV, M4A, WEBM, OGG).')
        return value


class AnnouncementTemplateSerializer(serializers.ModelSerializer):
    """Serializer for AnnouncementTemplate model."""
    
    class Meta:
        model = AnnouncementTemplate
        fields = [
            'id', 'title', 'description', 'script', 'category',
            'duration', 'voice_type', 'folder_id', 'active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnnouncementTemplateFolderSerializer(serializers.ModelSerializer):
    """Serializer for AnnouncementTemplateFolder model."""
    
    templates = serializers.SerializerMethodField()
    templates_count = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()
    
    class Meta:
        model = AnnouncementTemplateFolder
        fields = [
            'id', 'name', 'description', 'image_url', 'category',
            'active', 'templates', 'templates_count', 'total_duration',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'templates', 'templates_count', 'total_duration', 'created_at', 'updated_at']
    
    def get_templates(self, obj):
        """Get only active templates."""
        active_templates = obj.templates.filter(active=True)
        return AnnouncementTemplateSerializer(active_templates, many=True).data
    
    def get_templates_count(self, obj):
        """Get count of active templates in folder."""
        return obj.templates.filter(active=True).count()
    
    def get_total_duration(self, obj):
        """Get total duration of all active templates in folder."""
        return sum(t.duration for t in obj.templates.filter(active=True))
