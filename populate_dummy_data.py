"""
Populate Dummy Data for Testing
Creates folders, music files, announcements, zones, and schedules for admin account
"""

import os
import sys
import django
import requests
import json
from pathlib import Path

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'sync2gear_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sync2gear_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.music.models import Folder, MusicFile
from apps.announcements.models import Announcement
from apps.zones.models import Zone, Device
from apps.schedules.models import Schedule, ChannelPlaylist
from apps.clients.models import Client

User = get_user_model()
API_BASE = 'http://localhost:8000/api/v1'

def login_as_admin():
    """Login as admin and get token"""
    response = requests.post(f'{API_BASE}/auth/login/', json={
        'email': 'admin@sync2gear.com',
        'password': 'admin123'
    })
    if response.status_code == 200:
        data = response.json()
        return data['access'], data['refresh']
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None, None

def create_dummy_audio_file(filename, duration_seconds=30):
    """Create a dummy audio file (silent MP3)"""
    # Create a minimal silent MP3 file
    # This is a very basic approach - in production you'd use proper audio generation
    try:
        from pydub import AudioSegment
        from pydub.generators import Sine
        
        # Generate silent audio
        audio = AudioSegment.silent(duration=duration_seconds * 1000)
        audio.export(filename, format="mp3")
        return True
    except ImportError:
        # Fallback: create a minimal valid MP3 header (silent)
        # This creates a very basic MP3 file structure
        mp3_header = b'\xff\xfb\x90\x00'  # MP3 sync word + header
        with open(filename, 'wb') as f:
            f.write(mp3_header)
            # Write silence data (minimal)
            f.write(b'\x00' * 1000)
        return True

def populate_data():
    """Main function to populate all dummy data"""
    print("=" * 60)
    print("POPULATING DUMMY DATA FOR TESTING")
    print("=" * 60)
    
    # Login
    print("\n1. Logging in as admin...")
    access_token, refresh_token = login_as_admin()
    if not access_token:
        print("❌ Failed to login. Make sure backend is running and admin user exists.")
        return
    
    headers = {'Authorization': f'Bearer {access_token}'}
    print("✅ Logged in successfully")
    
    # Get admin user
    user_response = requests.get(f'{API_BASE}/auth/me/', headers=headers)
    if user_response.status_code != 200:
        print(f"❌ Failed to get user info: {user_response.status_code}")
        return
    
    admin_user = user_response.json()
    print(f"✅ Admin user: {admin_user.get('name', admin_user.get('email'))}")
    
    # Create dummy audio files directory
    dummy_files_dir = Path(__file__).parent / 'dummy_audio_files'
    dummy_files_dir.mkdir(exist_ok=True)
    
    # Get admin's client_id (admin might not have client_id, so we'll create folders without it or get first client)
    client_id = admin_user.get('client_id')
    if not client_id:
        # Admin might not have client_id, try to get first client or create folders without it
        clients_res = requests.get(f'{API_BASE}/admin/clients/', headers=headers)
        if clients_res.status_code == 200:
            clients = clients_res.json()
            if isinstance(clients, list) and len(clients) > 0:
                client_id = clients[0].get('id')
                print(f"  ℹ️  Using client: {clients[0].get('name', 'First Client')}")
            elif isinstance(clients, dict) and 'results' in clients and len(clients['results']) > 0:
                client_id = clients['results'][0].get('id')
                print(f"  ℹ️  Using client: {clients['results'][0].get('name', 'First Client')}")
    
    # 2. Create Music Folders
    print("\n2. Creating music folders...")
    folders = []
    folder_names = [
        "Jazz Collection",
        "Background Music",
        "Holiday Tunes",
        "Classical",
        "Pop Hits"
    ]
    
    for folder_name in folder_names:
        folder_data = {'name': folder_name, 'description': f'Test folder: {folder_name}'}
        if client_id:
            folder_data['client_id'] = client_id
        
        response = requests.post(
            f'{API_BASE}/music/folders/',
            headers=headers,
            json=folder_data
        )
        if response.status_code in [200, 201]:
            folder = response.json()
            folders.append(folder)
            print(f"  ✅ Created folder: {folder_name}")
        else:
            error_text = response.text[:200] if hasattr(response, 'text') else str(response.status_code)
            print(f"  ⚠️  Folder {folder_name}: {response.status_code} - {error_text}")
    
    # 3. Create Dummy Music Files
    print("\n3. Creating dummy music files...")
    music_tracks = [
        {"title": "Smooth Jazz", "artist": "Test Artist", "album": "Test Album", "folder": "Jazz Collection"},
        {"title": "Background Ambience", "artist": "Ambient Sounds", "album": "Background Music", "folder": "Background Music"},
        {"title": "Holiday Cheer", "artist": "Holiday Band", "album": "Holiday Tunes", "folder": "Holiday Tunes"},
        {"title": "Classical Piece", "artist": "Classical Orchestra", "album": "Classical", "folder": "Classical"},
        {"title": "Pop Song", "artist": "Pop Star", "album": "Pop Hits", "folder": "Pop Hits"},
    ]
    
    created_files = []
    for i, track in enumerate(music_tracks):
        # Find folder
        folder = next((f for f in folders if f['name'] == track['folder']), None)
        if not folder:
            print(f"  ⚠️  Folder not found: {track['folder']}")
            continue
        
        # Create dummy audio file
        audio_file = dummy_files_dir / f"track_{i+1}.mp3"
        if not audio_file.exists():
            create_dummy_audio_file(str(audio_file), duration_seconds=30)
        
        # Upload file
        with open(audio_file, 'rb') as f:
            files = {'file': (f'track_{i+1}.mp3', f, 'audio/mpeg')}
            data = {
                'folder_id': folder['id'],
                'title': track['title'],
                'artist': track['artist'],
                'album': track['album']
            }
            response = requests.post(
                f'{API_BASE}/music/files/',
                headers={k: v for k, v in headers.items() if k != 'Content-Type'},
                files=files,
                data=data
            )
            if response.status_code in [200, 201]:
                music_file = response.json()
                created_files.append(music_file)
                print(f"  ✅ Created music file: {track['title']}")
            else:
                print(f"  ⚠️  Failed to create {track['title']}: {response.status_code} - {response.text[:100]}")
    
    # 4. Create Announcements
    print("\n4. Creating announcements...")
    announcements_data = [
        {"title": "Welcome Message", "text": "Welcome to our store! We're happy to serve you today.", "is_tts": True},
        {"title": "Store Closing", "text": "Attention shoppers, we will be closing in 15 minutes. Thank you for shopping with us!", "is_tts": True},
        {"title": "Special Offer", "text": "Don't miss our special offer today! Check out our featured products.", "is_tts": True},
    ]
    
    created_announcements = []
    for ann_data in announcements_data:
        if ann_data.get('is_tts'):
            response = requests.post(
                f'{API_BASE}/announcements/tts/',
                headers=headers,
                json={
                    'title': ann_data['title'],
                    'text': ann_data['text']
                }
            )
        else:
            # For uploaded announcements, you'd need an actual audio file
            continue
        
        if response.status_code in [200, 201]:
            announcement = response.json()
            created_announcements.append(announcement)
            print(f"  ✅ Created announcement: {ann_data['title']}")
        else:
            print(f"  ⚠️  Failed to create {ann_data['title']}: {response.status_code}")
    
    # 5. Create Zones
    print("\n5. Creating zones...")
    zones_data = [
        {"name": "Main Floor", "description": "Main shopping area"},
        {"name": "Kitchen", "description": "Kitchen area"},
        {"name": "Entrance", "description": "Store entrance"},
    ]
    
    created_zones = []
    for zone_data in zones_data:
        zone_payload = zone_data.copy()
        if client_id:
            zone_payload['client_id'] = client_id
        
        response = requests.post(
            f'{API_BASE}/zones/zones/',
            headers=headers,
            json=zone_payload
        )
        if response.status_code in [200, 201]:
            zone = response.json()
            created_zones.append(zone)
            print(f"  ✅ Created zone: {zone_data['name']}")
        else:
            error_text = response.text[:200] if hasattr(response, 'text') else str(response.status_code)
            print(f"  ⚠️  Failed to create zone {zone_data['name']}: {response.status_code} - {error_text}")
    
    # 6. Create Devices
    print("\n6. Creating devices...")
    if created_zones:
        devices_data = [
            {"name": "Main Floor Speaker 1", "zone_id": created_zones[0]['id']},
            {"name": "Main Floor Speaker 2", "zone_id": created_zones[0]['id']},
            {"name": "Kitchen Speaker", "zone_id": created_zones[1]['id'] if len(created_zones) > 1 else created_zones[0]['id']},
        ]
        
        created_devices = []
        for device_data in devices_data:
            # Use register endpoint for devices
            response = requests.post(
                f'{API_BASE}/devices/devices/register/',
                headers=headers,
                json=device_data
            )
            if response.status_code in [200, 201]:
                device = response.json()
                created_devices.append(device)
                print(f"  ✅ Created device: {device_data['name']}")
            else:
                error_text = response.text[:200] if hasattr(response, 'text') else str(response.status_code)
                print(f"  ⚠️  Failed to create device {device_data['name']}: {response.status_code} - {error_text}")
    
    # 7. Create Schedules
    print("\n7. Creating schedules...")
    if created_zones:
        schedule_data = {
            "name": "Daily Music Schedule",
            "schedule_config": {
                "type": "daily",
                "times": ["09:00", "12:00", "15:00", "18:00"]
            },
            "zones": [created_zones[0]['id']],
            "enabled": True
        }
        
        response = requests.post(
            f'{API_BASE}/schedules/schedules/',
            headers=headers,
            json=schedule_data
        )
        if response.status_code in [200, 201]:
            schedule = response.json()
            print(f"  ✅ Created schedule: {schedule_data['name']}")
        else:
            print(f"  ⚠️  Failed to create schedule: {response.status_code}")
    
    # Summary
    print("\n" + "=" * 60)
    print("POPULATION COMPLETE")
    print("=" * 60)
    print(f"✅ Folders created: {len(folders)}")
    print(f"✅ Music files created: {len(created_files)}")
    print(f"✅ Announcements created: {len(created_announcements)}")
    print(f"✅ Zones created: {len(created_zones)}")
    print(f"✅ Devices created: {len(created_devices) if 'created_devices' in locals() else 0}")
    print("\n🎉 Dummy data populated! You can now test the application.")
    print("   Open http://localhost:5173 and navigate through the pages.")

if __name__ == '__main__':
    try:
        populate_data()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
