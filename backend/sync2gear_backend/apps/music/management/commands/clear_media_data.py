"""
Django management command to clear all music and announcement data.
This deletes all music files, announcements, and related folders from the database.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.music.models import MusicFile, Folder
from apps.announcements.models import Announcement
import os
from django.conf import settings


class Command(BaseCommand):
    help = 'Clear all music files, announcements, and folders from the database and media storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (required to actually delete)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This will delete ALL music files, announcements, and folders!\n'
                    'Run with --confirm to proceed.'
                )
            )
            return

        with transaction.atomic():
            # Count items before deletion
            music_count = MusicFile.objects.count()
            announcement_count = Announcement.objects.count()
            folder_count = Folder.objects.count()

            self.stdout.write(f'Found: {music_count} music files, {announcement_count} announcements, {folder_count} folders')

            # Delete music files (this will cascade to file deletion)
            deleted_music = 0
            for music_file in MusicFile.objects.all():
                if music_file.file:
                    try:
                        music_file.file.delete(save=False)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Could not delete file {music_file.file.name}: {e}')
                        )
                if music_file.cover_art:
                    try:
                        music_file.cover_art.delete(save=False)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Could not delete cover art {music_file.cover_art.name}: {e}')
                        )
                music_file.delete()
                deleted_music += 1

            # Delete announcements (this will cascade to file deletion)
            deleted_announcements = 0
            for announcement in Announcement.objects.all():
                if announcement.file:
                    try:
                        announcement.file.delete(save=False)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'Could not delete file {announcement.file.name}: {e}')
                        )
                announcement.delete()
                deleted_announcements += 1

            # Delete folders (should be empty now, but delete anyway)
            deleted_folders = Folder.objects.count()
            Folder.objects.all().delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully deleted:\n'
                    f'  - {deleted_music} music files\n'
                    f'  - {deleted_announcements} announcements\n'
                    f'  - {deleted_folders} folders\n'
                    f'\nDatabase is now clean and ready for new data!'
                )
            )
