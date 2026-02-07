const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  // Return existing connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    // Use ONLY MONGODB_URL - no fallbacks to MONGODB_URI or hardcoded values
    const mongoUrl = process.env.MONGODB_URL;
    
    if (!mongoUrl) {
      throw new Error('MONGODB_URL environment variable is not set. Please set it in your .env file.');
    }
    
    const connectionOptions = {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    };
    
    console.log('Connecting to MongoDB...');
    console.log('Using Mongo URL:', mongoUrl.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
    await mongoose.connect(mongoUrl, connectionOptions);

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;

