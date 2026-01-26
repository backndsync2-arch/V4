"""
Management command to recalculate durations for all announcements.

Usage:
    python manage.py recalculate_durations
    python manage.py recalculate_durations --folder-id <uuid>
    python manage.py recalculate_durations --force (recalculate even if duration > 0)
"""

from django.core.management.base import BaseCommand
from apps.announcements.models import Announcement
from mutagen import File as MutagenFile
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate durations for announcements using mutagen'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder-id',
            type=str,
            help='Only recalculate durations for announcements in this folder',
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
        queryset = Announcement.objects.all()
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        if not force:
            # Only recalculate announcements with duration = 0
            queryset = queryset.filter(duration=0)
        
        total = queryset.count()
        self.stdout.write(f'Found {total} announcement(s) to process...')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('No announcements to process.'))
            return
        
        updated = 0
        failed = 0
        
        for announcement in queryset:
            try:
                if not announcement.file:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {announcement.title}: No file attached')
                    )
                    continue
                
                # Check if file exists on disk
                if not hasattr(announcement.file, 'path'):
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {announcement.title}: File path not available')
                    )
                    continue
                
                try:
                    file_path = announcement.file.path
                except:
                    # Try to get URL instead
                    self.stdout.write(
                        self.style.WARNING(f'Skipping {announcement.title}: Cannot access file path')
                    )
                    continue
                
                # Extract duration using mutagen
                try:
                    audio = MutagenFile(file_path)
                    
                    if audio is None:
                        self.stdout.write(
                            self.style.WARNING(f'Mutagen returned None for {announcement.title} - file may be corrupted or unsupported format')
                        )
                        failed += 1
                        continue
                    
                    if not hasattr(audio, 'info'):
                        self.stdout.write(
                            self.style.WARNING(f'No info attribute for {announcement.title}')
                        )
                        failed += 1
                        continue
                    
                    if not hasattr(audio.info, 'length'):
                        self.stdout.write(
                            self.style.WARNING(f'No length attribute for {announcement.title}')
                        )
                        failed += 1
                        continue
                    
                    old_duration = announcement.duration
                    duration_value = audio.info.length
                    if duration_value and duration_value > 0:
                        announcement.duration = int(duration_value)
                        announcement.save(update_fields=['duration'])
                        
                        updated += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ {announcement.title}: {old_duration}s → {announcement.duration}s'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'Invalid duration value ({duration_value}) for {announcement.title}')
                        )
                        failed += 1
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing {announcement.title}: {str(e)}')
                    )
                    failed += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error with {announcement.title}: {str(e)}')
                )
                failed += 1
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✓ Updated: {updated}'))
        if failed > 0:
            self.stdout.write(self.style.WARNING(f'⚠ Failed: {failed}'))
        self.stdout.write(f'Total processed: {updated + failed}/{total}')

