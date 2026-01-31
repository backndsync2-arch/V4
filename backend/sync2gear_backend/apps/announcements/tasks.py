"""
Celery tasks for announcements app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from celery import shared_task
from mutagen import File as MutagenFile
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_tts(self, announcement_id):
    """
    Generate TTS audio from text using configured provider.
    
    Supports: Google Cloud TTS, OpenAI, ElevenLabs
    """
    from .models import Announcement
    from apps.admin_panel.models import AIProvider
    from django.core.files.base import ContentFile
    import os
    
    try:
        announcement = Announcement.objects.get(id=announcement_id)
        
        if not announcement.is_tts or not announcement.tts_text:
            logger.warning(f"Announcement {announcement_id} is not a TTS announcement")
            return
        
        # Get active AI provider
        provider_type = announcement.tts_provider or 'google'
        provider = AIProvider.objects.filter(
            provider_type=provider_type,
            is_active=True
        ).first()
        
        if not provider or not provider.can_make_request():
            logger.error(f"No active provider available for {provider_type}")
            raise Exception(f"No active provider available for {provider_type}")
        
        # Generate TTS based on provider
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
        elif provider_type == 'elevenlabs':
            audio_content, audio_format = _generate_elevenlabs_tts(
                announcement.tts_text,
                announcement.tts_voice or 'default'
            )
        else:
            raise Exception(f"Unsupported provider: {provider_type}")
        
        if not audio_content:
            raise Exception("Failed to generate audio")
        
        # Save audio file
        filename = f"{announcement.id}.{audio_format}"
        announcement.file.save(
            filename,
            ContentFile(audio_content),
            save=False
        )
        
        # Calculate duration
        try:
            from mutagen import File as MutagenFile
            from io import BytesIO
            audio = MutagenFile(BytesIO(audio_content))
            if audio and hasattr(audio, 'info'):
                announcement.duration = int(audio.info.length)
        except:
            # Fallback: estimate duration (average speaking rate ~150 words/min)
            words = len(announcement.tts_text.split())
            announcement.duration = int((words / 150) * 60)
        
        announcement.file_size = len(audio_content)
        announcement.save()
        
        # Record provider usage
        provider.record_usage(tokens=len(announcement.tts_text.split()), cost=0.01)
        
        logger.info(f"TTS generated for announcement {announcement_id}")
    
    except Announcement.DoesNotExist:
        logger.error(f"Announcement {announcement_id} not found")
    except Exception as e:
        logger.error(f"Error generating TTS: {e}")
        raise self.retry(exc=e, countdown=60)


def _generate_google_tts(text, voice_name):
    """Generate TTS using Google Cloud TTS."""
    try:
        from google.cloud import texttospeech
        
        client = texttospeech.TextToSpeechClient()
        
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_name.split('-')[0] + '-' + voice_name.split('-')[1],
            name=voice_name
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        return response.audio_content, 'mp3'
    except Exception as e:
        logger.error(f"Google TTS error: {e}")
        raise


def _generate_openai_tts(text, voice):
    """Generate TTS using OpenAI."""
    try:
        import openai
        import os
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise Exception("OPENAI_API_KEY environment variable not set")
        
        client = openai.OpenAI(api_key=api_key)
        
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        
        return response.content, 'mp3'
    except Exception as e:
        logger.error(f"OpenAI TTS error: {e}")
        raise


def _generate_elevenlabs_tts(text, voice_id):
    """Generate TTS using ElevenLabs."""
    try:
        import requests
        from django.conf import settings
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVENLABS_API_KEY
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        return response.content, 'mp3'
    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
        raise


@shared_task(bind=True, max_retries=3)
def calculate_audio_duration(self, announcement_id):
    """Calculate duration of uploaded audio file."""
    from .models import Announcement
    from io import BytesIO
    
    try:
        announcement = Announcement.objects.get(id=announcement_id)
        
        if not announcement.file:
            return
        
        duration_calculated = False
        
        # Try mutagen first (path-based)
        try:
            if hasattr(announcement.file, 'path'):
                audio = MutagenFile(announcement.file.path)
                if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    announcement.duration = int(audio.info.length)
                    announcement.save(update_fields=['duration'])
                    logger.info(f"Duration calculated (mutagen path) for {announcement_id}: {announcement.duration}s")
                    duration_calculated = True
        except Exception as mutagen_path_error:
            logger.debug(f"Mutagen path-based failed for {announcement_id}: {mutagen_path_error}")
        
        # Try mutagen with file content (better for webm)
        if not duration_calculated:
            try:
                announcement.file.open('rb')
                file_content = announcement.file.read()
                announcement.file.close()
                audio = MutagenFile(BytesIO(file_content))
                if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    announcement.duration = int(audio.info.length)
                    announcement.save(update_fields=['duration'])
                    logger.info(f"Duration calculated (mutagen content) for {announcement_id}: {announcement.duration}s")
                    duration_calculated = True
            except Exception as mutagen_content_error:
                logger.debug(f"Mutagen content-based failed for {announcement_id}: {mutagen_content_error}")
        
        # Try pydub as fallback (supports webm better)
        if not duration_calculated:
            try:
                from pydub import AudioSegment
                if hasattr(announcement.file, 'path'):
                    audio_segment = AudioSegment.from_file(announcement.file.path)
                    announcement.duration = int(len(audio_segment) / 1000.0)  # pydub returns milliseconds
                    announcement.save(update_fields=['duration'])
                    logger.info(f"Duration calculated (pydub) for {announcement_id}: {announcement.duration}s")
                    duration_calculated = True
            except ImportError:
                logger.debug("pydub not available for duration calculation")
            except Exception as pydub_error:
                logger.warning(f"Pydub duration calculation failed for {announcement_id}: {pydub_error}")
        
        if not duration_calculated:
            logger.warning(f"Could not calculate duration for announcement {announcement_id} using any method")
    
    except Announcement.DoesNotExist:
        logger.error(f"Announcement {announcement_id} not found")
    except Exception as e:
        logger.error(f"Error calculating duration: {e}")
