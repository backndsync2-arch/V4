"""
Simple Data Population Script
Creates folders, TTS announcements, zones - no actual audio files needed
"""

import requests
import json

API_BASE = 'http://localhost:8000/api/v1'

def login():
    """Login as admin"""
    response = requests.post(f'{API_BASE}/auth/login/', json={
        'email': 'admin@sync2gear.com',
        'password': 'admin123'
    })
    if response.status_code == 200:
        return response.json()['access']
    return None

def populate():
    """Populate dummy data"""
    print("=" * 60)
    print("POPULATING DUMMY DATA")
    print("=" * 60)
    
    token = login()
    if not token:
        print("❌ Failed to login")
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get user info
    user_res = requests.get(f'{API_BASE}/auth/me/', headers=headers)
    if user_res.status_code != 200:
        print("❌ Failed to get user")
        return
    
    user = user_res.json()
    client_id = user.get('client_id')
    
    # Get or create a client if admin doesn't have one
    if not client_id:
        clients_res = requests.get(f'{API_BASE}/admin/clients/', headers=headers)
        if clients_res.status_code == 200:
            clients = clients_res.json()
            if isinstance(clients, list) and len(clients) > 0:
                client_id = clients[0].get('id')
            elif isinstance(clients, dict) and clients.get('results'):
                if len(clients['results']) > 0:
                    client_id = clients['results'][0].get('id')
    
    print(f"\n✅ Logged in as: {user.get('name', user.get('email'))}")
    if client_id:
        print(f"✅ Using client ID: {client_id}")
    
    # Create folders
    print("\n📁 Creating folders...")
    folders = []
    for name in ["Jazz Collection", "Background Music", "Holiday Tunes"]:
        data = {'name': name}
        if client_id:
            data['client_id'] = client_id
        res = requests.post(f'{API_BASE}/music/folders/', headers=headers, json=data)
        if res.status_code in [200, 201]:
            folders.append(res.json())
            print(f"  ✅ {name}")
        else:
            print(f"  ⚠️  {name}: {res.status_code}")
    
    # Create TTS announcements (no file upload needed)
    print("\n📢 Creating announcements...")
    announcements = [
        {"title": "Welcome Message", "text": "Welcome to our store! We're happy to serve you today."},
        {"title": "Store Closing", "text": "Attention shoppers, we will be closing in 15 minutes. Thank you!"},
        {"title": "Special Offer", "text": "Don't miss our special offer today! Check out our featured products."},
    ]
    
    for ann in announcements:
        res = requests.post(f'{API_BASE}/announcements/tts/', headers=headers, json=ann)
        if res.status_code in [200, 201]:
            print(f"  ✅ {ann['title']}")
        else:
            print(f"  ⚠️  {ann['title']}: {res.status_code}")
    
    # Create zones
    print("\n🏢 Creating zones...")
    zones = []
    for zone_data in [
        {"name": "Main Floor", "description": "Main shopping area"},
        {"name": "Kitchen", "description": "Kitchen area"},
    ]:
        data = zone_data.copy()
        if client_id:
            data['client_id'] = client_id
        res = requests.post(f'{API_BASE}/zones/zones/', headers=headers, json=data)
        if res.status_code in [200, 201]:
            zones.append(res.json())
            print(f"  ✅ {zone_data['name']}")
        else:
            print(f"  ⚠️  {zone_data['name']}: {res.status_code}")
    
    # Create devices
    print("\n🔊 Creating devices...")
    if zones:
        for device_name, zone in [("Main Speaker 1", zones[0]), ("Kitchen Speaker", zones[1] if len(zones) > 1 else zones[0])]:
            res = requests.post(f'{API_BASE}/devices/devices/register/', headers=headers, json={
                'name': device_name,
                'zone_id': zone['id']
            })
            if res.status_code in [200, 201]:
                print(f"  ✅ {device_name}")
            else:
                print(f"  ⚠️  {device_name}: {res.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ POPULATION COMPLETE")
    print("=" * 60)
    print("\n🎉 You can now test the application!")
    print("   Open http://localhost:5173 and navigate through pages")

if __name__ == '__main__':
    try:
        populate()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
