# Sync2Gear Backend - Node.js/Express

A clean Node.js backend API using Express, MongoDB, and Serverless Framework for AWS Lambda deployment.

## Features

- ✅ MongoDB-only (no SQLite)
- ✅ JWT Authentication
- ✅ User registration and login
- ✅ Music file upload
- ✅ Music file playback/streaming
- ✅ AWS Lambda deployment ready

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string and JWT secret.

## Development

Run locally:
```bash
npm run dev
```

## Deployment

Deploy to AWS Lambda:
```bash
npm run deploy
```

Deploy to dev stage:
```bash
npm run deploy:dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user (requires auth)
- `POST /api/v1/auth/seed-users` - Seed default users (requires token)

### Music
- `POST /api/v1/music/upload` - Upload music file (requires auth)
- `GET /api/v1/music` - Get music files (requires auth)
- `GET /api/v1/music/:id` - Get single music file (requires auth)
- `GET /api/v1/music/:id/stream` - Stream music file (requires auth)

## Default Users (after seeding)

- Admin: `admin@sync2gear.com` / `Admin@Sync2Gear2025!`
- Staff: `staff@sync2gear.com` / `Staff@Sync2Gear2025!`
- Client: `client@example.com` / `Client@Example2025!`


