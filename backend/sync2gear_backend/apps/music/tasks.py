"""
Celery tasks for music app.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from celery import shared_task
from mutagen import File as MutagenFile
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def extract_metadata(self, music_file_id):
    """
    Extract metadata from uploaded music file.
    
    Uses mutagen to extract:
    - Duration
    - Title, Artist, Album, Genre
    - Cover art
    """
    from .models import MusicFile
    
    try:
        music_file = MusicFile.objects.get(id=music_file_id)
        
        if not music_file.file:
            logger.warning(f"Music file {music_file_id} has no file")
            return
        
        # Extract metadata using mutagen
        try:
            audio = MutagenFile(music_file.file.path)
            
            if audio:
                # Extract duration
                if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    music_file.duration = int(audio.info.length)
                
                # Extract metadata tags
                if not music_file.title or music_file.title == music_file.filename:
                    title = audio.get('TIT2') or audio.get('TITLE') or audio.get('\xa9nam')
                    if title:
                        music_file.title = title[0] if isinstance(title, list) else str(title)
                
                artist = audio.get('TPE1') or audio.get('ARTIST') or audio.get('\xa9ART')
                if artist and not music_file.artist:
                    music_file.artist = artist[0] if isinstance(artist, list) else str(artist)
                
                album = audio.get('TALB') or audio.get('ALBUM') or audio.get('\xa9alb')
                if album and not music_file.album:
                    music_file.album = album[0] if isinstance(album, list) else str(album)
                
                genre = audio.get('TCON') or audio.get('GENRE') or audio.get('\xa9gen')
                if genre and not music_file.genre:
                    music_file.genre = genre[0] if isinstance(genre, list) else str(genre)
                
                # Extract cover art
                if hasattr(audio, 'pictures') and audio.pictures:
                    try:
                        picture = audio.pictures[0]
                        image = Image.open(io.BytesIO(picture.data))
                        
                        # Save cover art
                        cover_filename = f"{music_file.id}_cover.jpg"
                        cover_path = f"covers/{cover_filename}"
                        
                        # Convert to RGB if necessary
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                        
                        # Resize if too large (max 1000x1000)
                        if image.width > 1000 or image.height > 1000:
                            image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
                        
                        # Save to file
                        from django.core.files.base import ContentFile
                        from io import BytesIO
                        
                        buffer = BytesIO()
                        image.save(buffer, format='JPEG', quality=85)
                        buffer.seek(0)
                        
                        music_file.cover_art.save(
                            cover_filename,
                            ContentFile(buffer.read()),
                            save=False
                        )
                    except Exception as e:
                        logger.warning(f"Failed to extract cover art: {e}")
                
                music_file.save()
                logger.info(f"Metadata extracted for {music_file_id}")
        
        except Exception as e:
            logger.error(f"Metadata extraction error for {music_file_id}: {e}")
            raise
    
    except MusicFile.DoesNotExist:
        logger.error(f"Music file {music_file_id} not found")
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        raise self.retry(exc=e, countdown=60)
