"""
Management command to recalculate durations for all music files.

Usage:
    python manage.py recalculate_durations
    python manage.py recalculate_durations --folder-id <uuid>
    python manage.py recalculate_durations --force (recalculate even if duration > 0)
"""

from django.core.management.base import BaseCommand
from apps.music.models import MusicFile
from mutagen import File as MutagenFile
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate durations for music files using mutagen'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder-id',
            type=str,
            help='Only recalculate durations for files in this folder',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Recalculate even if duration is already set (> 0)',
        )

    def handle(self, *args, **options):
        folder_id = options.get('folder_id')
        force = options.get('force', False)
        
        # Get queryset
        queryset = MusicFile.objects.all()
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        if not force:
            # Only recalculate files with duration = 0
            queryset = queryset.filter(duration=0)
        
        total = queryset.count()
        self.stdout.write(f'Found {total} music file(s) to process...')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No files to process.'))
            return
        
        updated = 0
        failed = 0
        
        for music_file in queryset:
            try:
                if not music_file.file:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {music_file.title}: No file attached')
                    )
                    continue
                
                # Check if file exists on disk
                if not hasattr(music_file.file, 'path'):
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {music_file.title}: File path not available')
                    )
                    continue
                
                try:
                    file_path = music_file.file.path
                except:
                    # Try to get URL instead
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {music_file.title}: Cannot access file path')
                    )
                    continue
                
                # Extract duration using mutagen
                try:
                    audio = MutagenFile(file_path)
                    
                    if audio and hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                        old_duration = music_file.duration
                        music_file.duration = int(audio.info.length)
                        music_file.save(update_fields=['duration'])
                        
                        updated += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ {music_file.title}: {old_duration}s → {music_file.duration}s'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'Could not extract duration from {music_file.title}')
                        )
                        failed += 1
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing {music_file.title}: {str(e)}')
                    )
                    failed += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error with {music_file.title}: {str(e)}')
                )
                failed += 1
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✓ Updated: {updated}'))
        if failed > 0:
            self.stdout.write(self.style.WARNING(f'⚠ Failed: {failed}'))
        self.stdout.write(f'Total processed: {updated + failed}/{total}')

