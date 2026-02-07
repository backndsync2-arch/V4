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

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/music', musicRoutes);
app.use('/api/v1/zones', zonesRoutes);
app.use('/api/v1/admin', adminRoutes);

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
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
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

