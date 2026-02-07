#!/usr/bin/env python3
"""Quick script to check database contents"""

import os
import sys

# Add sync2gear_backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync2gear_backend'))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

import django
django.setup()

from apps.authentication.models import User
from apps.music.models import Track
from apps.scheduler.models import Schedule
from apps.announcements.models import Announcement

print("🔍 Database Contents Check\n")
print("=" * 50)

# Count users
user_count = User.objects.count()
print(f"👥 Users: {user_count}")
if user_count > 0:
    print("   Sample users:")
    for user in User.objects.all()[:5]:
        print(f"     - {user.email} ({user.role})")

# Count tracks
track_count = Track.objects.count()
print(f"\n🎵 Tracks: {track_count}")

# Count schedules
schedule_count = Schedule.objects.count()
print(f"📅 Schedules: {schedule_count}")

# Count announcements
announcement_count = Announcement.objects.count()
print(f"📢 Announcements: {announcement_count}")

print("\n" + "=" * 50)
print("✅ Database check complete!")


