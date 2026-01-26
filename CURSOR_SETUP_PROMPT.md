# Cursor AI Setup Prompt

Copy and paste this entire prompt into Cursor AI after cloning the repository:

---

I've cloned the sync2gear V4 project from GitHub. Please set it up completely so I can run it locally:

**Backend Setup:**
1. Navigate to `backend/sync2gear_backend` directory
2. Create Python virtual environment: `python3 -m venv venv` (or `python -m venv venv` on Windows)
3. Activate virtual environment: `source venv/bin/activate` (Windows: `venv\Scripts\activate`)
4. Install dependencies: `pip install -r requirements.txt`
5. Copy environment file: `cp env.example .env` (Windows: `copy env.example .env`)
6. Run database migrations: `python manage.py migrate`
7. **IMPORTANT - Seed development data** (creates demo users, clients, zones, devices): `python manage.py seed_dev_data`
8. **IMPORTANT - Seed announcement templates** (creates ready-made templates): `python manage.py seed_templates`
9. Start Django server: `python manage.py runserver` (runs on http://localhost:8000)

**Frontend Setup:**
1. Navigate to `frontend` directory
2. Install dependencies: `npm install`
3. Start development server: `npm run dev` (runs on http://localhost:5173)

**After setup, verify:**
- Backend API accessible at http://localhost:8000/api/v1/
- Frontend accessible at http://localhost:5173
- Login credentials available:
  - Admin: admin@sync2gear.com / Admin@Sync2Gear2025!
  - Client: client1@example.com / Client@Example2025!
  - Floor User: floor1@downtowncoffee.com / Floor@Downtown2025!

**Note:** This project uses SQLite (local database), so the seed commands are essential to populate the database with demo data. Please execute all steps in order and report any errors.

