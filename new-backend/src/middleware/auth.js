const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header or query parameter
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        detail: 'Authentication credentials were not provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        detail: 'Invalid or inactive user.' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        detail: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        detail: 'Token expired.' 
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      detail: 'Authentication error.' 
    });
  }
};

// Optional authentication - tries to authenticate but doesn't fail if no token
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from header or query parameter
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token;
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Ignore auth errors for optional auth
        console.warn('Optional auth failed:', error.message);
      }
    }
    next();
  } catch (error) {
    // Even if auth fails, continue without user
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };

