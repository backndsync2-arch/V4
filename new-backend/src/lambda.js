const serverless = require('serverless-http');
const app = require('./index');
const connectDB = require('./config/database');

let dbConnected = false;
let serverlessHandler = null;

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
};

// Lambda handler
exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request BEFORE anything else - CRITICAL for CORS
  const method = event.requestContext?.http?.method || event.httpMethod || event.requestContext?.httpMethod;
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Try to initialize app handler - wrap in try-catch to prevent crashes
  try {
    // Create serverless handler once and reuse it
    if (!serverlessHandler) {
      serverlessHandler = serverless(app, {
        binary: ['audio/*', 'image/*', 'video/*'],
        // Increase request size limit (but API Gateway still enforces 10MB)
        request: (request, event, context) => {
          // Log request size for debugging
          if (event.body) {
            const bodySize = Buffer.byteLength(event.body, 'utf8');
            console.log(`Request body size: ${(bodySize / 1024 / 1024).toFixed(2)}MB`);
          }
          return request;
        },
      });
    }
  } catch (initError) {
    console.error('Failed to initialize serverless handler:', initError);
    // Return error with CORS headers so browser doesn't block
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ detail: 'Service initialization failed.' }),
    };
  }

  // Connect to database on first invocation
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
      // Don't return error here - let the request continue, DB will retry on actual use
    }
  }

  // Execute the handler and ensure CORS headers are added to response
  try {
    const response = await serverlessHandler(event, context);
    // Ensure CORS headers are present on all responses
    return {
      ...response,
      headers: {
        ...corsHeaders,
        ...(response.headers || {}),
      },
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ detail: 'Internal server error.' }),
    };
  }
};

