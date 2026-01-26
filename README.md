# Sync2gear - Business Audio Management System

Professional music and announcement management system for businesses. Built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm (or pnpm/yarn)
- **Docker** (optional, for backend development)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and update API URLs if you have a backend running
   # For demo mode (no backend), the defaults will work
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:protected` - Build with code protection/obfuscation
- `npm run preview` - Preview production build locally
- `npm run add-copyright` - Add copyright headers to files

## 🏗️ Project Structure

```
sync2gear/
├── src/
│   ├── app/              # Main application
│   │   ├── App.tsx       # Root component
│   │   └── components/  # UI components (40+)
│   ├── lib/              # Core libraries
│   │   ├── api.ts        # API service layer
│   │   ├── auth.tsx      # Authentication context
│   │   ├── playback.tsx  # Playback context
│   │   └── types.ts      # TypeScript types
│   └── styles/           # Global styles
├── public/               # Static assets
├── .env                  # Environment variables
└── package.json          # Dependencies
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# Feature Flags
VITE_ENABLE_SECURITY=false
```

### Running Without Backend

The app can run in **demo mode** without a backend:
- Uses mock data for all features
- All UI components are functional
- Perfect for frontend development and testing

### Connecting to Backend

1. Ensure your Django backend is running (see `START_HERE.md`)
2. Update `.env` with your backend URLs
3. Update `/src/lib/auth.tsx` to use real API calls (see `FRONTEND_DJANGO_INTEGRATION.md`)

## 📚 Documentation

- **START_HERE.md** - Complete getting started guide
- **FRONTEND_DJANGO_INTEGRATION.md** - Backend integration guide
- **DJANGO_BACKEND_ARCHITECTURE.md** - Backend architecture specs
- **QUICK_REFERENCE.md** - API reference and commands
- **README_DEPLOYMENT.md** - Production deployment guide

## ✨ Features

- 🎵 **Music Library** - Upload, organize, and manage music files
- 📢 **Announcements** - Create TTS or upload audio announcements
- 📅 **Scheduler** - Schedule music and announcements
- 🎚️ **Playback Control** - Real-time multi-zone audio control
- 👥 **User Management** - Role-based access control
- 📱 **PWA Support** - Install as mobile app
- 🌙 **Dark Mode** - Theme support

## 🛠️ Tech Stack

- **React** 18.3.1
- **TypeScript** 5.0+
- **Vite** 6.3.5
- **Tailwind CSS** 4.1.12
- **Radix UI** - Accessible component primitives
- **Sonner** - Toast notifications
- **React Hook Form** - Form management

## 📝 License

Copyright © 2025 sync2gear Ltd. All Rights Reserved.

See `LICENSE.md` for details.

## 🤝 Support

For setup help, see `START_HERE.md` or check the documentation files in the root directory.

---

**Original Design:** https://www.figma.com/design/5uULYBve0CKxFvt8se8aPW/Sync2gear--Copy-# V4
