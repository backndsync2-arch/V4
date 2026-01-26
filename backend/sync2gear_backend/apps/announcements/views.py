"""
Announcements views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from .models import Announcement, AnnouncementTemplate, AnnouncementTemplateFolder
from .serializers import (
    AnnouncementSerializer, TTSCreateSerializer, AnnouncementUploadSerializer,
    AnnouncementTemplateSerializer, AnnouncementTemplateFolderSerializer
)
from apps.common.permissions import IsSameClient
from apps.common.exceptions import NotFoundError, ValidationError
from apps.playback.engine import PlaybackEngine
import logging

logger = logging.getLogger(__name__)


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Announcement CRUD operations.
    
    Supports filtering by client, folder, and type.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'category']
    ordering_fields = ['title', 'created_at']
    ordering = ['-created_at']
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # JSONParser first for TTS endpoint
    
    def get_queryset(self):
        """Filter announcements by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Announcement.objects.none()
        
        queryset = Announcement.objects.filter(client=user.client)
        
        # Filter by folder if provided
        folder_id = self.request.query_params.get('folder')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        # Filter by type if provided
        announcement_type = self.request.query_params.get('type')
        if announcement_type:
            if announcement_type == 'tts':
                queryset = queryset.filter(is_tts=True)
            elif announcement_type == 'uploaded':
                queryset = queryset.filter(is_tts=False, is_recording=False)
            elif announcement_type == 'recorded':
                queryset = queryset.filter(is_recording=True)
        
        # Filter by enabled status
        enabled = self.request.query_params.get('enabled')
        if enabled is not None:
            queryset = queryset.filter(enabled=enabled.lower() == 'true')
        
        # Auto-recalculate duration for announcements with duration=0 that have files
        # This ensures duration is always accurate when listing announcements
        try:
            from mutagen import File as MutagenFile
            from io import BytesIO
            announcements_needing_duration = queryset.filter(duration=0).exclude(file__isnull=True).exclude(file='')
            for announcement in announcements_needing_duration[:50]:  # Limit to 50 to avoid performance issues
                try:
                    audio = None
                    # Try path-based first
                    if announcement.file and hasattr(announcement.file, 'path'):
                        try:
                            audio = MutagenFile(announcement.file.path)
                        except Exception as path_error:
                            logger.debug(f"Path-based read failed for {announcement.id}: {path_error}")
                    
                    # If path-based failed, try reading file content
                    if not audio or not hasattr(audio, 'info') or not hasattr(audio.info, 'length'):
                        try:
                            announcement.file.open('rb')
                            file_content = announcement.file.read()
                            announcement.file.close()
                            audio = MutagenFile(BytesIO(file_content))
                        except Exception as content_error:
                            logger.debug(f"Content-based read failed for {announcement.id}: {content_error}")
                    
                    if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                        announcement.duration = int(audio.info.length)
                        announcement.save(update_fields=['duration'])
                        logger.info(f"Auto-calculated duration for announcement {announcement.id}: {announcement.duration}s")
                except Exception as e:
                    logger.warning(f"Could not auto-calculate duration for announcement {announcement.id}: {e}")
        except Exception as e:
            logger.warning(f"Error in auto-duration calculation: {e}")
        
        return queryset.select_related('folder', 'created_by')
    
    def get_serializer_class(self):
        """Use upload serializer for create."""
        if self.action == 'create':
            return AnnouncementUploadSerializer
        return AnnouncementSerializer
    
    def perform_create(self, serializer):
        """Create announcement (client set in serializer)."""
        serializer.save(
            client=self.request.user.client,
            created_by=self.request.user
        )

    def create(self, request, *args, **kwargs):
        """
        Create an uploaded announcement and return the full read serializer payload
        (including id + file_url), not the write serializer fields.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(client=request.user.client, created_by=request.user)

        read_serializer = AnnouncementSerializer(announcement, context={'request': request})
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'])
    def tts(self, request):
        """Create TTS announcement."""
        serializer = TTSCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create announcement record
        # Use OpenAI as default provider if available (we have the API key)
        import os
        default_provider = 'openai' if os.getenv('OPENAI_API_KEY') else 'google'
        default_voice = 'alloy' if default_provider == 'openai' else 'en-US-Neural2-C'
        
        announcement = Announcement.objects.create(
            title=serializer.validated_data['title'],
            tts_text=serializer.validated_data['text'],
            tts_voice=serializer.validated_data.get('voice', default_voice),
            tts_provider=serializer.validated_data.get('provider', default_provider),
            is_tts=True,
            enabled=True,
            folder_id=serializer.validated_data.get('folder_id'),
            client=request.user.client,
            created_by=request.user,
            file_size=0,  # Will be set after TTS generation
            duration=0,  # Will be set after TTS generation
        )
        
        # Trigger async TTS generation (or sync for local dev)
        try:
            from .tasks import generate_tts
            # Try async first
            generate_tts.delay(str(announcement.id))
        except Exception as e:
            # Dev environments often run without Redis/Celery; generate synchronously
            logger.warning(f"Celery unavailable; generating TTS synchronously for {announcement.id}: {e}")
            try:
                # Call the task function directly (synchronously) - remove @shared_task decorator behavior
                # Import the actual function implementation
                from .tasks import _generate_google_tts, _generate_openai_tts, _generate_elevenlabs_tts
                from apps.admin_panel.models import AIProvider
                from django.core.files.base import ContentFile
                from mutagen import File as MutagenFile
                from io import BytesIO
                
                # Generate TTS synchronously
                provider_type = announcement.tts_provider or 'google'
                provider = AIProvider.objects.filter(
                    provider_type=provider_type,
                    is_active=True
                ).first()
                
                if not provider:
                    # For local dev, try to generate without provider check
                    logger.warning(f"No provider found, attempting direct TTS generation")
                    audio_content = None
                    audio_format = 'mp3'
                    
                    # Try OpenAI first (we have the API key)
                    if provider_type == 'openai' or True:  # Try OpenAI as fallback
                        try:
                            import os
                            api_key = os.getenv('OPENAI_API_KEY')
                            if api_key:
                                audio_content, audio_format = _generate_openai_tts(
                                    announcement.tts_text,
                                    announcement.tts_voice or 'alloy'
                                )
                                logger.info(f"Successfully generated TTS using OpenAI")
                        except Exception as openai_error:
                            logger.error(f"OpenAI TTS failed: {openai_error}")
                            audio_content = None
                    
                    # Fallback to Google if OpenAI failed
                    if not audio_content and provider_type == 'google':
                        try:
                            audio_content, audio_format = _generate_google_tts(
                                announcement.tts_text,
                                announcement.tts_voice or 'en-US-Neural2-C'
                            )
                        except Exception as google_error:
                            logger.error(f"Google TTS failed: {google_error}")
                            audio_content = None
                    
                    if audio_content:
                        # Save audio file
                        filename = f"{announcement.id}.{audio_format}"
                        announcement.file.save(
                            filename,
                            ContentFile(audio_content),
                            save=False
                        )
                        
                        # Calculate duration
                        try:
                            audio = MutagenFile(BytesIO(audio_content))
                            if audio and hasattr(audio, 'info'):
                                announcement.duration = int(audio.info.length)
                        except:
                            words = len(announcement.tts_text.split())
                            announcement.duration = int((words / 150) * 60)
                        
                        announcement.file_size = len(audio_content)
                        announcement.save()
                        
                        # Refresh from DB to ensure file_url is available
                        announcement.refresh_from_db()
                        logger.info(f"TTS generated synchronously for announcement {announcement.id}, file: {announcement.file.name if announcement.file else 'None'}")
                else:
                    # Use provider-based generation
                    if provider.can_make_request():
                        audio_content = None
                        audio_format = 'mp3'
                        
                        if provider_type == 'google':
                            audio_content, audio_format = _generate_google_tts(
                                announcement.tts_text,
                                announcement.tts_voice or 'en-US-Neural2-C'
                            )
                        elif provider_type == 'openai':
                            audio_content, audio_format = _generate_openai_tts(
                                announcement.tts_text,
                                announcement.tts_voice or 'alloy'
                            )
                        
                        if audio_content:
                            filename = f"{announcement.id}.{audio_format}"
                            announcement.file.save(
                                filename,
                                ContentFile(audio_content),
                                save=False
                            )
                            
                            try:
                                audio = MutagenFile(BytesIO(audio_content))
                                if audio and hasattr(audio, 'info'):
                                    announcement.duration = int(audio.info.length)
                            except:
                                words = len(announcement.tts_text.split())
                                announcement.duration = int((words / 150) * 60)
                            
                            announcement.file_size = len(audio_content)
                            announcement.save()
                            provider.record_usage(tokens=len(announcement.tts_text.split()), cost=0.01)
                            # Refresh from DB to ensure file_url is available
                            announcement.refresh_from_db()
                            logger.info(f"TTS generated synchronously for announcement {announcement.id}, file: {announcement.file.name if announcement.file else 'None'}")
            except Exception as sync_error:
                logger.error(f"Failed to generate TTS synchronously: {sync_error}")
                # Don't fail the request - announcement is created, TTS can be generated later
        
        # Refresh from DB to ensure file_url is available in response
        announcement.refresh_from_db()
        read_serializer = AnnouncementSerializer(announcement, context={'request': request})
        return Response(
            read_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'])
    def generate_ai_text(self, request):
        """Generate announcement text using AI."""
        from .serializers import AIGenerateSerializer
        import openai
        import os
        
        serializer = AIGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        topic = serializer.validated_data['topic']
        tone = serializer.validated_data['tone']
        key_points = serializer.validated_data.get('key_points', '')
        quantity = serializer.validated_data.get('quantity', 1)
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            return Response(
                {'error': 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable on the server.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            client = openai.OpenAI(api_key=api_key)
            
            tone_descriptions = {
                'professional': 'professional and formal',
                'friendly': 'friendly and warm',
                'urgent': 'urgent and attention-grabbing',
                'casual': 'casual and conversational'
            }
            
            prompt = f"""Generate {quantity} short announcement script(s) for: {topic}
            
            Tone: {tone_descriptions.get(tone, 'professional')}
            {"Key points to include: " + key_points if key_points else ""}
            
            Requirements:
            - Each announcement should be 20-50 words
            - Clear and concise
            - Suitable for public address systems
            - Professional but engaging
            
            Return as a JSON array with objects: {{"title": "...", "text": "..."}}
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a professional announcement script writer. Return only valid JSON array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            import json
            content = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()
            
            scripts = json.loads(content)
            
            # Ensure it's an array
            if not isinstance(scripts, list):
                scripts = [scripts]
            
            # Limit to requested quantity
            scripts = scripts[:quantity]
            
            return Response({
                'scripts': scripts,
                'count': len(scripts)
            }, status=status.HTTP_200_OK)
            
        except openai.AuthenticationError:
            return Response(
                {'error': 'Invalid API key. Please check your OpenAI API key.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return Response(
                {'error': f'Failed to generate AI text: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate_templates(self, request):
        """Generate announcement templates using AI."""
        from .serializers import GenerateTemplatesSerializer
        import openai
        import os
        
        serializer = GenerateTemplatesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        category = serializer.validated_data.get('category', 'general')
        quantity = serializer.validated_data.get('quantity', 5)
        tone = serializer.validated_data.get('tone', 'friendly')
        
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            return Response(
                {'error': 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable on the server.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            client = openai.OpenAI(api_key=api_key)
            
            category_contexts = {
                'retail': 'retail store announcements for customers',
                'restaurant': 'restaurant announcements for diners',
                'office': 'office building announcements for employees and visitors',
                'healthcare': 'healthcare facility announcements for patients and staff',
                'gym': 'gym and fitness center announcements for members',
                'general': 'general purpose announcements for any business'
            }
            
            tone_descriptions = {
                'professional': 'professional and formal',
                'friendly': 'friendly and warm',
                'urgent': 'urgent and attention-grabbing',
                'casual': 'casual and conversational',
                'energetic': 'energetic and enthusiastic',
                'calm': 'calm and soothing'
            }
            
            # Handle custom categories
            if category and category not in category_contexts:
                # Custom category - use it directly in the prompt
                context = f'{category.replace("-", " ")} announcements'
            else:
                context = category_contexts.get(category or 'general', 'general purpose announcements')
            
            tone_desc = tone_descriptions.get(tone, 'friendly')
            
            prompt = f"""Generate {quantity} professional announcement templates for a {context}.

Tone: {tone_desc}

Each template should include:
- A clear, descriptive title (3-8 words)
- A brief description (10-20 words explaining when to use it)
- The full announcement script (20-50 words, suitable for public address systems)

Return as a JSON array with objects containing:
{{
  "title": "Template title",
  "description": "Brief description of when to use this announcement",
  "script": "Full announcement text (20-50 words)",
  "voiceType": "{tone}"
}}

Make each template unique and practical for real-world use in a {context}.
"""
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a professional announcement script writer. Return only valid JSON array. Each template should be practical and ready to use."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=2000
            )
            
            import json
            content = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()
            
            templates = json.loads(content)
            
            # Ensure it's an array
            if not isinstance(templates, list):
                templates = [templates]
            
            # Limit to requested quantity and add category
            templates = templates[:quantity]
            for template in templates:
                template['category'] = category
                # Estimate duration (average speaking rate ~150 words/min)
                word_count = len(template.get('script', '').split())
                template['duration'] = max(5, int((word_count / 150) * 60))
                if 'voiceType' not in template:
                    template['voiceType'] = tone
            
            return Response({
                'templates': templates,
                'count': len(templates),
                'category': category
            }, status=status.HTTP_200_OK)
            
        except openai.AuthenticationError:
            return Response(
                {'error': 'Invalid API key. Please check your OpenAI API key.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.error(f"Template generation error: {e}")
            return Response(
                {'error': f'Failed to generate templates: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def batch_tts(self, request):
        """Create multiple TTS announcements in batch (faster, single API call)."""
        from .serializers import BatchTTSCreateSerializer
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import os
        
        serializer = BatchTTSCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        announcements_data = serializer.validated_data['announcements']
        voice = serializer.validated_data.get('voice')
        provider = serializer.validated_data.get('provider')
        folder_id = serializer.validated_data.get('folder_id')
        
        # Determine default provider and voice
        default_provider = 'openai' if os.getenv('OPENAI_API_KEY') else 'google'
        default_voice = 'alloy' if default_provider == 'openai' else 'en-US-Neural2-C'
        final_provider = provider or default_provider
        final_voice = voice or default_voice
        
        # Create all announcement records first (fast, no TTS yet)
        created_announcements = []
        for item in announcements_data:
            announcement = Announcement.objects.create(
                title=item['title'],
                tts_text=item['text'],
                tts_voice=final_voice,
                tts_provider=final_provider,
                is_tts=True,
                enabled=True,
                folder_id=folder_id,
                client=request.user.client,
                created_by=request.user,
                file_size=0,
                duration=0,
            )
            created_announcements.append(announcement)
        
        # Generate TTS for all announcements in parallel (much faster)
        def generate_single_tts(announcement):
            """Generate TTS for a single announcement."""
            try:
                from .tasks import _generate_openai_tts, _generate_google_tts
                from django.core.files.base import ContentFile
                from mutagen import File as MutagenFile
                from io import BytesIO
                
                audio_content = None
                audio_format = 'mp3'
                
                # Try OpenAI first (faster and we have the key)
                api_key = os.getenv('OPENAI_API_KEY')
                if api_key and (final_provider == 'openai' or not final_provider):
                    try:
                        audio_content, audio_format = _generate_openai_tts(
                            announcement.tts_text,
                            final_voice
                        )
                        logger.info(f"Successfully generated TTS using OpenAI for {announcement.id}")
                    except Exception as e:
                        logger.error(f"OpenAI TTS failed for {announcement.id}: {e}")
                        audio_content = None
                
                # Fallback to Google if OpenAI failed
                if not audio_content and final_provider == 'google':
                    try:
                        audio_content, audio_format = _generate_google_tts(
                            announcement.tts_text,
                            final_voice
                        )
                    except Exception as e:
                        logger.error(f"Google TTS failed for {announcement.id}: {e}")
                
                if audio_content:
                    # Save audio file
                    filename = f"{announcement.id}.{audio_format}"
                    announcement.file.save(
                        filename,
                        ContentFile(audio_content),
                        save=False
                    )
                    
                    # Calculate duration
                    try:
                        audio = MutagenFile(BytesIO(audio_content))
                        if audio and hasattr(audio, 'info'):
                            announcement.duration = int(audio.info.length)
                    except:
                        words = len(announcement.tts_text.split())
                        announcement.duration = int((words / 150) * 60)
                    
                    announcement.file_size = len(audio_content)
                    announcement.save()
                    return announcement
                else:
                    logger.warning(f"Failed to generate TTS for {announcement.id}")
                    return announcement
            except Exception as e:
                logger.error(f"Error generating TTS for {announcement.id}: {e}")
                return announcement
        
        # Generate TTS in parallel using ThreadPoolExecutor (industry standard for I/O-bound tasks)
        with ThreadPoolExecutor(max_workers=min(5, len(created_announcements))) as executor:
            futures = {executor.submit(generate_single_tts, ann): ann for ann in created_announcements}
            # Wait for all to complete
            completed_announcements = []
            for future in as_completed(futures):
                try:
                    result = future.result()
                    completed_announcements.append(result)
                except Exception as e:
                    logger.error(f"TTS generation error: {e}")
                    # Still include the announcement even if TTS failed
                    announcement = futures[future]
                    completed_announcements.append(announcement)
        
        # Refresh all announcements from DB to get updated file_urls
        for ann in completed_announcements:
            ann.refresh_from_db()
        
        # Return all created announcements with updated file URLs
        read_serializer = AnnouncementSerializer(completed_announcements, many=True, context={'request': request})
        return Response(
            read_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def tts_voices(self, request):
        """Get available TTS voices (OpenAI voices since we have the API key)."""
        import os
        # Use OpenAI voices since we have the API key
        voices = [
            {'id': 'alloy', 'name': 'Alloy (Neutral)', 'gender': 'neutral', 'accent': 'US'},
            {'id': 'echo', 'name': 'Echo (Male)', 'gender': 'male', 'accent': 'US'},
            {'id': 'fable', 'name': 'Fable (Male)', 'gender': 'male', 'accent': 'UK'},
            {'id': 'onyx', 'name': 'Onyx (Male)', 'gender': 'male', 'accent': 'US'},
            {'id': 'nova', 'name': 'Nova (Female)', 'gender': 'female', 'accent': 'US'},
            {'id': 'shimmer', 'name': 'Shimmer (Female)', 'gender': 'female', 'accent': 'US'},
        ]
        return Response({'voices': voices}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def preview_voice(self, request):
        """Preview a TTS voice with sample text."""
        import os
        
        text = request.data.get('text', 'Hello, this is a voice preview. How does this sound?')
        voice = request.data.get('voice', 'alloy')
        
        try:
            from .tasks import _generate_openai_tts
            from django.core.files.base import ContentFile
            from django.core.files.storage import default_storage
            import tempfile
            import uuid
            
            # Generate TTS audio
            audio_content, audio_format = _generate_openai_tts(text, voice)
            
            # Save to temporary file
            temp_filename = f"preview_{uuid.uuid4()}.{audio_format}"
            temp_path = default_storage.save(f'temp/{temp_filename}', ContentFile(audio_content))
            
            # Get URL for the file
            request_obj = request
            preview_url = request_obj.build_absolute_uri(default_storage.url(temp_path))
            
            return Response({
                'preview_url': preview_url,
                'voice': voice,
                'text': text
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Voice preview error: {e}")
            return Response(
                {'error': f'Failed to generate voice preview: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def regenerate_tts(self, request, pk=None):
        """Regenerate TTS audio for an announcement (add voice to text-only or change voice)."""
        announcement = self.get_object()
        
        # Get voice from request (optional, defaults to existing or 'alloy')
        voice = request.data.get('voice', announcement.tts_voice or 'alloy')
        provider = request.data.get('provider', announcement.tts_provider or 'openai')
        
        if not announcement.tts_text:
            return Response(
                {'error': 'This announcement has no text to generate audio from.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate TTS synchronously
        try:
            from .tasks import _generate_openai_tts, _generate_google_tts
            from django.core.files.base import ContentFile
            from mutagen import File as MutagenFile
            from io import BytesIO
            import os
            
            audio_content = None
            audio_format = 'mp3'
            
            # Try OpenAI first (we have the API key)
            if provider == 'openai' or os.getenv('OPENAI_API_KEY'):
                try:
                    api_key = os.getenv('OPENAI_API_KEY')
                    if api_key:
                        audio_content, audio_format = _generate_openai_tts(
                            announcement.tts_text,
                            voice
                        )
                        logger.info(f"Successfully regenerated TTS using OpenAI for {announcement.id}")
                except Exception as openai_error:
                    logger.error(f"OpenAI TTS failed: {openai_error}")
                    audio_content = None
            
            # Fallback to Google if OpenAI failed
            if not audio_content and provider == 'google':
                try:
                    audio_content, audio_format = _generate_google_tts(
                        announcement.tts_text,
                        voice or 'en-US-Neural2-C'
                    )
                except Exception as google_error:
                    logger.error(f"Google TTS failed: {google_error}")
                    audio_content = None
            
            if not audio_content:
                return Response(
                    {'error': 'Failed to generate audio. Please check your TTS provider configuration.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Save audio file (replace existing if any)
            filename = f"{announcement.id}.{audio_format}"
            announcement.file.save(
                filename,
                ContentFile(audio_content),
                save=False
            )
            
            # Calculate duration
            try:
                audio = MutagenFile(BytesIO(audio_content))
                if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    announcement.duration = int(audio.info.length)
                else:
                    # Fallback: estimate from word count
                    words = len(announcement.tts_text.split())
                    announcement.duration = int((words / 150) * 60)
            except Exception as e:
                logger.warning(f"Duration calculation failed: {e}")
                words = len(announcement.tts_text.split())
                announcement.duration = int((words / 150) * 60)
            
            # Update voice and provider
            announcement.tts_voice = voice
            announcement.tts_provider = provider
            announcement.is_tts = True
            announcement.file_size = len(audio_content)
            announcement.save()
            
            # Refresh from DB
            announcement.refresh_from_db()
            
            serializer = self.get_serializer(announcement)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error regenerating TTS for {announcement.id}: {e}")
            return Response(
                {'error': f'Failed to regenerate TTS: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def recalculate_duration(self, request, pk=None):
        """Recalculate duration for an announcement from its audio file."""
        announcement = self.get_object()
        
        if not announcement.file:
            return Response(
                {'error': 'This announcement has no audio file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from mutagen import File as MutagenFile
            from io import BytesIO
            import os
            
            audio = None
            old_duration = announcement.duration
            error_details = []
            
            # Method 1: Try path-based reading
            if hasattr(announcement.file, 'path'):
                try:
                    file_path = announcement.file.path
                    if os.path.exists(file_path):
                        file_size = os.path.getsize(file_path)
                        file_ext = os.path.splitext(file_path)[1].lower()
                        logger.debug(f"Attempting path-based read for {announcement.id}: {file_path} (size: {file_size} bytes, ext: {file_ext})")
                        
                        audio = MutagenFile(file_path)
                        if audio is None:
                            error_details.append(f"Mutagen returned None for file at path (format may be unsupported)")
                        else:
                            logger.debug(f"Path-based read successful for {announcement.id}")
                    else:
                        error_details.append(f"File path does not exist: {file_path}")
                except Exception as path_error:
                    error_details.append(f"Path-based read exception: {str(path_error)}")
                    logger.debug(f"Path-based read failed for {announcement.id}: {path_error}")
            
            # Method 2: Try reading file content (for cloud storage or when path fails)
            if audio is None or not hasattr(audio, 'info') or not hasattr(audio.info, 'length'):
                try:
                    announcement.file.open('rb')
                    file_content = announcement.file.read()
                    file_size = len(file_content)
                    announcement.file.close()
                    
                    if file_size == 0:
                        error_details.append("File is empty (0 bytes)")
                    else:
                        logger.debug(f"Attempting content-based read for {announcement.id} (size: {file_size} bytes)")
                        audio = MutagenFile(BytesIO(file_content))
                        if audio is None:
                            error_details.append("Mutagen returned None for file content (format may be unsupported)")
                        else:
                            logger.debug(f"Content-based read successful for {announcement.id}")
                except Exception as content_error:
                    error_details.append(f"Content-based read exception: {str(content_error)}")
                    logger.warning(f"Content-based read failed for {announcement.id}: {content_error}")
            
            # Method 3: Fallback to pydub if Mutagen failed (supports more formats via ffmpeg)
            duration_value = None
            if audio is None or not hasattr(audio, 'info') or not hasattr(audio.info, 'length'):
                try:
                    from pydub import AudioSegment
                    logger.debug(f"Attempting pydub fallback for {announcement.id}")
                    
                    # Try path-based first
                    if hasattr(announcement.file, 'path'):
                        try:
                            file_path = announcement.file.path
                            if os.path.exists(file_path):
                                audio_segment = AudioSegment.from_file(file_path)
                                duration_value = len(audio_segment) / 1000.0  # pydub returns milliseconds
                                logger.info(f"Successfully extracted duration using pydub (path) for {announcement.id}: {duration_value}s")
                        except Exception as pydub_path_error:
                            logger.debug(f"Pydub path-based read failed for {announcement.id}: {pydub_path_error}")
                    
                    # If path-based failed, try content-based
                    if duration_value is None:
                        try:
                            announcement.file.open('rb')
                            file_content = announcement.file.read()
                            announcement.file.close()
                            
                            # Create a temporary file-like object
                            temp_file = BytesIO(file_content)
                            # Try to determine format from file extension or content
                            file_ext = None
                            if hasattr(announcement.file, 'name'):
                                file_ext = os.path.splitext(announcement.file.name)[1].lower().lstrip('.')
                            
                            if file_ext:
                                audio_segment = AudioSegment.from_file(temp_file, format=file_ext)
                            else:
                                # Try common formats
                                for fmt in ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac']:
                                    try:
                                        temp_file.seek(0)
                                        audio_segment = AudioSegment.from_file(temp_file, format=fmt)
                                        break
                                    except:
                                        continue
                                else:
                                    raise ValueError("Could not determine audio format")
                            
                            duration_value = len(audio_segment) / 1000.0
                            logger.info(f"Successfully extracted duration using pydub (content) for {announcement.id}: {duration_value}s")
                        except Exception as pydub_content_error:
                            error_details.append(f"Pydub fallback failed: {str(pydub_content_error)}")
                            logger.warning(f"Pydub content-based read failed for {announcement.id}: {pydub_content_error}")
                except ImportError:
                    error_details.append("Pydub not available (install with: pip install pydub)")
                    logger.debug(f"Pydub not available for fallback on {announcement.id}")
                except Exception as pydub_error:
                    error_details.append(f"Pydub error: {str(pydub_error)}")
                    logger.warning(f"Pydub fallback error for {announcement.id}: {pydub_error}")
            
            # If we got duration from pydub, use it
            if duration_value is not None and duration_value > 0:
                announcement.duration = int(duration_value)
                announcement.save(update_fields=['duration'])
                logger.info(f"Recalculated duration for announcement {announcement.id}: {old_duration}s → {announcement.duration}s")
                
                serializer = self.get_serializer(announcement)
                return Response({
                    **serializer.data,
                    'old_duration': old_duration,
                    'new_duration': announcement.duration
                }, status=status.HTTP_200_OK)
            
            # Check if we successfully got audio metadata from Mutagen
            if audio is None:
                error_msg = 'Could not read audio file. The file may be corrupted or in an unsupported format.'
                if error_details:
                    error_msg += f' Details: {"; ".join(error_details)}'
                logger.error(f"Failed to read audio file for announcement {announcement.id}: {error_msg}")
                return Response(
                    {'error': error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not hasattr(audio, 'info'):
                error_msg = 'Audio file has no metadata. The file may be corrupted or in an unsupported format.'
                logger.error(f"Audio file has no info attribute for announcement {announcement.id}")
                return Response(
                    {'error': error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not hasattr(audio.info, 'length'):
                error_msg = 'Audio file metadata does not contain duration information. The file may be corrupted or in an unsupported format.'
                logger.error(f"Audio file info has no length attribute for announcement {announcement.id}")
                return Response(
                    {'error': error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            duration_value = audio.info.length
            if not duration_value or duration_value <= 0:
                error_msg = f'Invalid duration value ({duration_value}) extracted from audio file.'
                logger.error(f"Invalid duration value for announcement {announcement.id}: {duration_value}")
                return Response(
                    {'error': error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Successfully extracted duration
            announcement.duration = int(duration_value)
            announcement.save(update_fields=['duration'])
            
            logger.info(f"Recalculated duration for announcement {announcement.id}: {old_duration}s → {announcement.duration}s")
            
            serializer = self.get_serializer(announcement)
            return Response({
                **serializer.data,
                'old_duration': old_duration,
                'new_duration': announcement.duration
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error recalculating duration for {announcement.id}: {e}", exc_info=True)
            return Response(
                {'error': f'Failed to recalculate duration: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def play_instant(self, request, pk=None):
        """Play announcement instantly on specified zones or devices."""
        import uuid
        announcement = self.get_object()
        
        # Support both zone_ids and device_ids for flexibility
        zone_ids = request.data.get('zone_ids', [])
        device_ids = request.data.get('device_ids', [])
        
        # If device_ids provided, convert to zone_ids
        if device_ids:
            from apps.zones.models import Device
            
            # Separate valid UUIDs from non-UUID strings (likely device_id hardware IDs)
            valid_uuids = []
            hardware_ids = []
            
            for device_id in device_ids:
                try:
                    # Try to parse as UUID
                    uuid.UUID(str(device_id))
                    valid_uuids.append(device_id)
                except (ValueError, TypeError):
                    # Not a valid UUID, treat as hardware device_id
                    hardware_ids.append(str(device_id))
            
            # Build query to find devices by either UUID id or hardware device_id
            device_query = Device.objects.filter(client=request.user.client)
            
            if valid_uuids or hardware_ids:
                from django.db.models import Q
                query_filter = Q()
                
                if valid_uuids:
                    query_filter |= Q(id__in=valid_uuids)
                if hardware_ids:
                    query_filter |= Q(device_id__in=hardware_ids)
                
                devices = device_query.filter(query_filter).select_related('zone')
            else:
                devices = Device.objects.none()
            
            # Get unique zone IDs from devices
            zone_ids_from_devices = set()
            for device in devices:
                if device.zone:
                    zone_ids_from_devices.add(str(device.zone.id))
                else:
                    logger.warning(f"Device {device.id} ({device.name}) has no zone assigned")
            
            if zone_ids_from_devices:
                zone_ids = list(zone_ids_from_devices)
            elif device_ids:
                # If we couldn't find any devices, log warning but don't fail
                logger.warning(f"Could not find devices for IDs: {device_ids}")
        
        if not zone_ids:
            raise ValidationError("zone_ids or device_ids are required. No valid devices/zones found.")
        
        # Play on each zone
        for zone_id in zone_ids:
            try:
                PlaybackEngine.handle_announcement(zone_id, str(announcement.id))
            except Exception as e:
                logger.error(f"Failed to play announcement on zone {zone_id}: {e}")
        
        return Response({
            'message': f'Playing announcement on {len(zone_ids)} zone(s)',
            'announcement_id': str(announcement.id)
        })


class AnnouncementTemplateFolderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AnnouncementTemplateFolder (read-only).
    
    Returns folders with their templates.
    """
    queryset = AnnouncementTemplateFolder.objects.filter(active=True).prefetch_related('templates')
    serializer_class = AnnouncementTemplateFolderSerializer
    permission_classes = []  # Public read access
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'category']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['category', 'name']
    
    def get_queryset(self):
        """Filter by category if provided."""
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category, active=True)
        return queryset.filter(active=True)
