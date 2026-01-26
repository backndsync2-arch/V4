# 🔊 Sync2Gear V4

> A comprehensive music and announcements management system for businesses with multi-zone playback, real-time control, and AI-powered text-to-speech announcements.

[![Django](https://img.shields.io/badge/Django-5.0.1-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Demo Credentials](#-demo-credentials)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Sync2Gear** is a full-stack web application designed for businesses to manage and control music playback and announcements across multiple zones and devices. The system supports:

- 🎵 **Music Library Management** - Upload, organize, and manage music files
- 🔊 **Announcements Studio** - Create AI-powered TTS announcements or upload custom audio
- 📡 **Multi-Zone Playback** - Control music and announcements across multiple zones/floors
- ⏰ **Automated Scheduling** - Schedule music and announcements with interval-based or timeline-based triggers
- 🎛️ **Real-Time Control** - Live playback control with WebSocket support
- 👥 **Role-Based Access** - Super Admin, Client Admin, and Floor User roles
- 📱 **Progressive Web App** - Works offline with background audio support

---

## ✨ Features

### Core Features

- ✅ **Dual Player System** - Continuous music playback with announcement interruptions
- ✅ **Music Library** - Upload, preview, delete, and organize music files
- ✅ **TTS Announcements** - AI-powered text-to-speech with multiple voice options
- ✅ **Audio Uploads** - Support for MP3, WAV, and other audio formats
- ✅ **Channel Playlists** - Combine music and announcements into unified playlists
- ✅ **Multi-Zone Control** - Manage playback across multiple zones and devices
- ✅ **Real-Time Monitoring** - WebSocket-based live updates and device status
- ✅ **Automated Scheduling** - Interval-based and timeline-based scheduling
- ✅ **Folder Organization** - Organize music and announcements into folders
- ✅ **Ready-Made Templates** - Pre-built announcement templates for common use cases

### Advanced Features

- 🔒 **JWT Authentication** - Secure token-based authentication
- 🌐 **WebSocket Integration** - Real-time updates and device communication
- 🎨 **Responsive Design** - Mobile-first, works on all devices
- 🌙 **Dark Mode** - Built-in theme support
- 📊 **Dashboard Analytics** - Playback statistics and monitoring
- 🔄 **Background Audio** - Continuous playback with lock screen controls
- 🎚️ **Volume Control** - Per-zone volume management
- ⏭️ **Playback Controls** - Play, pause, skip, shuffle, and repeat

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.0.1
- **API**: Django REST Framework 3.14.0
- **Authentication**: JWT (djangorestframework-simplejwt)
- **WebSocket**: Django Channels 4.0.0
- **Database**: SQLite (development) / PostgreSQL (production)
- **Task Queue**: Celery 5.3.4 with Redis
- **Storage**: AWS S3 (production) / Local (development)
- **AI/TTS**: OpenAI, Google Cloud Text-to-Speech, Anthropic

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 4.1.12
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Hooks
- **HTTP Client**: Fetch API
- **WebSocket**: Native WebSocket API

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python** 3.10 or higher
- **Node.js** 18.x or higher
- **npm** or **pnpm**
- **Git**
- **Redis** (for Celery task queue - optional for development)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/backndsync2-arch/V4.git
cd V4
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend/sync2gear_backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp env.example .env

# Run database migrations
python manage.py migrate

# Seed development data (creates demo users, clients, zones, devices)
python manage.py seed_dev_data

# Seed announcement templates (creates ready-made templates)
python manage.py seed_templates

# Start Django development server
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1/

---

## 📁 Project Structure

```
V4/
├── backend/
│   └── sync2gear_backend/
│       ├── apps/
│       │   ├── authentication/    # User authentication & authorization
│       │   ├── music/             # Music library management
│       │   ├── announcements/     # Announcements & TTS
│       │   ├── zones/             # Zones, floors, devices
│       │   ├── playback/          # Playback control engine
│       │   └── schedules/         # Scheduling system
│       ├── manage.py
│       ├── requirements.txt
│       └── settings/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # React components
│   │   │   └── App.tsx           # Main app component
│   │   ├── lib/
│   │   │   ├── api/              # API client functions
│   │   │   ├── auth.tsx          # Authentication context
│   │   │   └── utils.ts         # Utility functions
│   │   └── styles/               # CSS styles
│   ├── package.json
│   └── vite.config.ts
│
└── md files/                     # Documentation
    ├── backend/                  # Backend documentation
    ├── frontend/                 # Frontend documentation
    ├── html/                     # HTML test files
    └── scripts/                  # Helper scripts
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api/v1/
```

### Authentication
All API requests (except login/signup) require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Key Endpoints

- **Authentication**
  - `POST /auth/signup/` - User registration
  - `POST /auth/login/` - User login
  - `POST /auth/logout/` - User logout
  - `POST /auth/refresh/` - Refresh access token

- **Music**
  - `GET /music/files/` - List music files
  - `POST /music/files/` - Upload music file
  - `GET /music/folders/` - List folders
  - `POST /music/folders/` - Create folder

- **Announcements**
  - `GET /announcements/` - List announcements
  - `POST /announcements/create-tts/` - Create TTS announcement
  - `POST /announcements/<id>/play_instant/` - Play announcement instantly

- **Playback Control**
  - `POST /playback/control/play/` - Start playback
  - `POST /playback/control/pause/` - Pause playback
  - `POST /playback/control/resume/` - Resume playback
  - `POST /playback/control/next/` - Next track
  - `POST /playback/control/previous/` - Previous track

For detailed API documentation, see `md files/backend/API_ENDPOINTS_REFERENCE.md`

---

## 🔑 Demo Credentials

After running `python manage.py seed_dev_data`, you can use these credentials:

### Super Admin
- **Email**: `admin@sync2gear.com`
- **Password**: `Admin@Sync2Gear2025!`

### Client Admin
- **Email**: `client1@example.com`
- **Password**: `Client@Example2025!`

### Floor User
- **Email**: `floor1@downtowncoffee.com`
- **Password**: `Floor@Downtown2025!`

---

## 💻 Development

### Running Tests

```bash
# Backend tests
cd backend/sync2gear_backend
python manage.py test

# Frontend tests (if configured)
cd frontend
npm test
```

### Code Formatting

```bash
# Backend (using black)
black .

# Frontend (using prettier)
npm run format
```

### Environment Variables

Create a `.env` file in `backend/sync2gear_backend/` based on `env.example`:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379/0
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

## 🙏 Acknowledgments

- Django REST Framework for the robust API framework
- React and Vite for the modern frontend experience
- Radix UI and shadcn/ui for beautiful UI components
- OpenAI for TTS capabilities

---

## 📝 Additional Documentation

- **Setup Guide**: See `md files/frontend/CURSOR_SETUP_PROMPT.md` for detailed setup instructions
- **Backend Architecture**: See `md files/backend/DJANGO_BACKEND_ARCHITECTURE.md`
- **Frontend Guide**: See `md files/frontend/FRONTEND_SETUP.md`
- **API Reference**: See `md files/backend/API_ENDPOINTS_REFERENCE.md`

---

**Made with ❤️ by the Sync2Gear Team**

