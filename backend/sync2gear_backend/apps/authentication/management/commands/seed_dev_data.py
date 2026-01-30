"""
Seed local development data (SQLite) for sync2gear.

Creates a demo client, floors/zones/devices, folders, and default users for all roles.
This command is idempotent: running it multiple times will not create duplicates and
will reset known passwords for the seeded accounts.
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.authentication.models import Client
from apps.zones.models import Floor, Zone, Device
from apps.music.models import Folder


User = get_user_model()


class Command(BaseCommand):
    help = "Seed local dev database with demo data + default accounts for all roles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-reset-passwords",
            action="store_false",
            dest="reset_passwords",
            default=True,
            help="Do not reset passwords for seeded accounts.",
        )

    def handle(self, *args, **options):
        reset_passwords: bool = bool(options.get("reset_passwords", True))

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding dev data..."))

        # 1) Demo client
        demo_client, client_created = Client.objects.get_or_create(
            email="client@sync2gear.com",
            defaults={
                "name": "Demo Client",
                "business_name": "Downtown Coffee Shop",
                "telephone": "+44 20 1234 5678",
                "description": "Seeded demo client for local development.",
                "subscription_status": "trial",
                "trial_days": 14,
                "trial_ends_at": timezone.now() + timedelta(days=14),
                "premium_features": {"multiFloor": True, "aiCredits": 1000, "maxFloors": 3},
                "max_devices": 20,
                "max_storage_gb": 100,
                "max_floors": 3,
                "is_active": True,
            },
        )
        self.stdout.write(
            f"- Client: {demo_client.business_name} ({'created' if client_created else 'exists'})"
        )

        # 2) Floors
        ground_floor, _ = Floor.objects.get_or_create(
            client=demo_client,
            name="Ground Floor",
            defaults={"description": "Main customer area", "is_premium": False},
        )
        first_floor, _ = Floor.objects.get_or_create(
            client=demo_client,
            name="First Floor",
            defaults={"description": "Upstairs seating area", "is_premium": True},
        )

        # 3) Zones
        main_zone, _ = Zone.objects.get_or_create(
            client=demo_client,
            name="Main Floor Zone",
            defaults={"description": "Main zone", "floor": ground_floor, "default_volume": 70, "is_active": True},
        )
        kitchen_zone, _ = Zone.objects.get_or_create(
            client=demo_client,
            name="Kitchen Zone",
            defaults={"description": "Kitchen area", "floor": ground_floor, "default_volume": 65, "is_active": True},
        )
        upstairs_zone, _ = Zone.objects.get_or_create(
            client=demo_client,
            name="Upstairs Zone",
            defaults={"description": "Upstairs seating", "floor": first_floor, "default_volume": 70, "is_active": True},
        )

        # 4) Devices (device_id must be globally unique)
        Device.objects.get_or_create(
            device_id="DEV-SPEAKER-GROUND-1",
            defaults={
                "name": "Ground Speaker 1",
                "device_type": "speaker",
                "zone": main_zone,
                "client": demo_client,
                "is_online": True,
                "volume": 70,
            },
        )
        Device.objects.get_or_create(
            device_id="DEV-SPEAKER-GROUND-2",
            defaults={
                "name": "Ground Speaker 2",
                "device_type": "speaker",
                "zone": main_zone,
                "client": demo_client,
                "is_online": False,
                "volume": 75,
            },
        )
        Device.objects.get_or_create(
            device_id="DEV-SPEAKER-KITCHEN-1",
            defaults={
                "name": "Kitchen Speaker 1",
                "device_type": "speaker",
                "zone": kitchen_zone,
                "client": demo_client,
                "is_online": True,
                "volume": 65,
            },
        )
        Device.objects.get_or_create(
            device_id="DEV-SPEAKER-UPSTAIRS-1",
            defaults={
                "name": "Upstairs Speaker 1",
                "device_type": "speaker",
                "zone": upstairs_zone,
                "client": demo_client,
                "is_online": True,
                "volume": 70,
            },
        )
        Device.objects.get_or_create(
            device_id="DEV-TABLET-UPSTAIRS-1",
            defaults={
                "name": "Upstairs Tablet 1",
                "device_type": "tablet",
                "zone": upstairs_zone,
                "client": demo_client,
                "is_online": True,
                "volume": 60,
            },
        )

        # 5) Folders
        Folder.objects.get_or_create(
            client=demo_client,
            name="Music",
            type="music",
            defaults={"description": "Default music folder", "is_system": True},
        )
        Folder.objects.get_or_create(
            client=demo_client,
            name="Announcements",
            type="announcements",
            defaults={"description": "Default announcements folder", "is_system": True},
        )

        # 6) Users for all roles
        accounts = [
            # Admin (system) - Demo account with strong password
            {
                "email": "admin@sync2gear.com",
                "name": "System Admin",
                "role": "admin",
                # Dev convenience: attach admin to demo client so client-scoped endpoints work out of the box.
                "client": demo_client,
                "floor": None,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "password": "Admin@Sync2Gear2025!",  # Strong password for demo account
            },
            # Staff (system) - Not a demo account, requires proper password
            {
                "email": "staff@sync2gear.com",
                "name": "Support Staff",
                "role": "staff",
                # Dev convenience: attach staff to demo client so client-scoped endpoints work out of the box.
                "client": demo_client,
                "floor": None,
                "is_staff": True,
                "is_superuser": False,
                "is_active": True,
                "password": "Staff@Sync2Gear2025!",
            },
            # Client user - Demo account with strong password
            {
                "email": "client1@example.com",
                "name": "Client Admin",
                "role": "client",
                "client": demo_client,
                "floor": None,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
                "password": "Client@Example2025!",  # Strong password for demo account
            },
            # Floor user - Demo account with strong password
            {
                "email": "floor1@downtowncoffee.com",
                "name": "Floor User",
                "role": "floor_user",
                "client": demo_client,
                "floor": ground_floor,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
                "password": "Floor@Downtown2025!",  # Strong password for demo account
            },
            # Manager user - Demo account
            {
                "email": "manager@example.com",
                "name": "Manager User",
                "role": "manager",
                "client": demo_client,
                "floor": None,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
                "password": "Manager@Example2025!",
            },
            # Operator user - Demo account
            {
                "email": "operator@example.com",
                "name": "Operator User",
                "role": "operator",
                "client": demo_client,
                "floor": None,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
                "password": "Operator@Example2025!",
            },
        ]

        # Create additional test client
        test_client, test_client_created = Client.objects.get_or_create(
            email="test@retailstore.com",
            defaults={
                "name": "Test Retail Store",
                "business_name": "Retail Store Inc",
                "telephone": "+1 555 1234 5678",
                "description": "Test client for development",
                "subscription_status": "active",
                "premium_features": {"multiFloor": True, "aiCredits": 500, "maxFloors": 2},
                "max_devices": 15,
                "max_storage_gb": 50,
                "max_floors": 2,
                "is_active": True,
            },
        )
        self.stdout.write(
            f"- Client: {test_client.business_name} ({'created' if test_client_created else 'exists'})"
        )

        # Create zones for test client
        test_zone, _ = Zone.objects.get_or_create(
            client=test_client,
            name="Store Front",
            defaults={"description": "Main store area", "default_volume": 75, "is_active": True},
        )

        # Create users for test client
        test_client_user, _ = User.objects.get_or_create(
            email="testclient@retailstore.com",
            defaults={
                "name": "Test Client Admin",
                "role": "client",
                "client": test_client,
                "floor": None,
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
            },
        )
        if reset_passwords:
            test_client_user.set_password("TestClient@Retail2025!")
            test_client_user.save(update_fields=["password"])
        self.stdout.write(
            f"- User: {test_client_user.email} role={test_client_user.role} ({'created' if _ else 'updated'})"
        )

        for a in accounts:
            user, created = User.objects.get_or_create(
                email=a["email"],
                defaults={
                    "name": a["name"],
                    "role": a["role"],
                    "client": a["client"],
                    "floor": a["floor"],
                    "is_active": True,
                    "is_staff": a["is_staff"],
                    "is_superuser": a["is_superuser"],
                },
            )

            # Ensure fields match our seeded intent even if user already existed
            changed = False
            for field in ["name", "role", "client", "floor", "is_staff", "is_superuser", "is_active"]:
                if getattr(user, field) != a[field]:
                    setattr(user, field, a[field])
                    changed = True
            if changed:
                user.save()

            if reset_passwords:
                user.set_password(a["password"])
                user.save(update_fields=["password"])

            self.stdout.write(
                f"- User: {user.email} role={user.role} ({'created' if created else 'updated'})"
            )

        self.stdout.write(self.style.SUCCESS("✅ Seed complete. Demo credentials:"))
        self.stdout.write("  - admin@sync2gear.com / Admin@Sync2Gear2025!   (role=admin)")
        self.stdout.write("  - staff@sync2gear.com / Staff@Sync2Gear2025!   (role=staff)")
        self.stdout.write("  - client1@example.com / Client@Example2025!  (role=client)")
        self.stdout.write("  - manager@example.com / Manager@Example2025!  (role=manager)")
        self.stdout.write("  - operator@example.com / Operator@Example2025!  (role=operator)")
        self.stdout.write("  - floor1@downtowncoffee.com / Floor@Downtown2025!    (role=floor_user)")
        self.stdout.write("  - testclient@retailstore.com / TestClient@Retail2025!  (role=client, test client)")
        self.stdout.write(self.style.SUCCESS(f"\n✅ Created {Zone.objects.filter(client=demo_client).count()} zones and {Device.objects.filter(client=demo_client).count()} devices for demo client"))
        self.stdout.write(self.style.SUCCESS(f"✅ Created {Client.objects.count()} clients and {User.objects.count()} users total"))


