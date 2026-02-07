const serverless = require('serverless-http');
const app = require('./index');
const connectDB = require('./config/database');

let dbConnected = false;

// Lambda handler
exports.handler = async (event, context) => {
  // Connect to database on first invocation
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ detail: 'Database connection failed.' }),
      };
    }
  }

  // Use serverless-http to wrap Express app
  const handler = serverless(app, {
    binary: ['audio/*', 'image/*', 'video/*'],
  });

  return handler(event, context);
};

