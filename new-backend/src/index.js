const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const musicRoutes = require('./routes/music');
const zonesRoutes = require('./routes/zones');
const adminRoutes = require('./routes/admin');
const announcementsRoutes = require('./routes/announcements');
const schedulesRoutes = require('./routes/schedules');
const playbackRoutes = require('./routes/playback');

const app = express();

// Handle OPTIONS requests FIRST - before any other middleware
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// CORS Middleware - Required for browser requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  next();
});

// Middleware
// Increase body parser limits for file uploads
// Note: API Gateway HTTP API has a hard 10MB limit for the entire request
// Multipart encoding adds overhead, so actual file size limit is ~8-9MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/music', musicRoutes);
app.use('/api/v1/zones', zonesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/announcements', announcementsRoutes);
app.use('/api/v1/schedules', schedulesRoutes);
app.use('/api/v1/playback', playbackRoutes);

// Root endpoint
app.get('/api/v1/', (req, res) => {
  res.json({
    message: 'Sync2Gear API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth/',
      music: '/api/v1/music/',
      zones: '/api/v1/zones/',
      admin: '/api/v1/admin/',
      announcements: '/api/v1/announcements/',
      schedules: '/api/v1/schedules/',
      playback: '/api/v1/playback/',
    },
  });
});

// 404 handler - Ensure CORS headers are set even for 404s
app.use((req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.status(404).json({ detail: 'Not found.' });
});

// Error handler - Ensure CORS headers on errors too
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.status(err.status || 500).json({
    detail: err.message || 'An error occurred.',
  });
});

// Connect to database and start server
const PORT = process.env.PORT || 8000;

if (require.main === module) {
  // Only connect and start server if running directly (not in Lambda)
  // Start server even if MongoDB connection fails (will retry on first request)
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Try to connect to MongoDB in background
    try {
      await connectDB();
    } catch (error) {
      console.warn('⚠️  MongoDB connection failed. Server will continue but database operations may fail.');
      console.warn('   Error:', error.message);
      console.warn('   Please check your MONGODB_URL environment variable.');
    }
  });
}

module.exports = app;

