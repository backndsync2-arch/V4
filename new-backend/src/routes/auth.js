const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Register/Sign Up
router.post('/signup/', async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required.'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'A user with this email already exists.'
      });
    }

    // Create client
    const client = new Client({
      name: businessName || name,
      businessName: businessName || name,
      email: email.toLowerCase(),
      subscriptionStatus: 'trial',
      subscriptionTier: 'basic',
    });
    await client.save();

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      name,
      role: 'client',
      clientId: client._id,
      isActive: true,
    });
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateToken(user._id); // In production, use separate refresh token logic

    // Return user data (password excluded by toJSON)
    const userObj = user.toJSON();

    return res.status(201).json({
      user: userObj,
      access: accessToken,
      refresh: refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      detail: 'An error occurred during registration.'
    });
  }
});

// Login
router.post('/login/', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        detail: 'Email and password are required.'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        detail: 'Invalid email or password.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        detail: 'Account is inactive.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        detail: 'Invalid email or password.'
      });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const accessToken = generateToken(user._id);
    const refreshToken = generateToken(user._id);

    // Return user data (password excluded by toJSON)
    const userObj = user.toJSON();

    return res.status(200).json({
      user: userObj,
      access: accessToken,
      refresh: refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      detail: 'An error occurred during login.'
    });
  }
});

// Get current user
router.get('/me/', authenticate, async (req, res) => {
  try {
    const userObj = req.user.toJSON();
    return res.status(200).json(userObj);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

// Logout
router.post('/logout/', authenticate, async (req, res) => {
  try {
    // In production, you'd blacklist the token here
    return res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ detail: 'An error occurred during logout.' });
  }
});

// Refresh token
router.post('/refresh/', async (req, res) => {
  try {
    const { refresh } = req.body;
    
    if (!refresh) {
      return res.status(400).json({ detail: 'Refresh token is required.' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh, process.env.JWT_SECRET);
    
    // Generate new access token
    const accessToken = generateToken(decoded.userId);
    
    return res.status(200).json({ access: accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ detail: 'Invalid or expired refresh token.' });
  }
});

// Seed users (for initial setup)
router.post('/seed-users/', async (req, res) => {
  try {
    const { token } = req.body;
    const expectedToken = process.env.SEED_TOKEN || 'sync2gear-seed-2025';

    if (token !== expectedToken) {
      return res.status(401).json({
        error: 'Invalid token. Provide token in request body.'
      });
    }

    const defaultUsers = [
      {
        email: 'admin@sync2gear.com',
        name: 'System Admin',
        password: 'Admin@Sync2Gear2025!',
        role: 'admin',
        isActive: true,
        isStaff: true,
        isSuperuser: true,
      },
      {
        email: 'staff@sync2gear.com',
        name: 'Support Staff',
        password: 'Staff@Sync2Gear2025!',
        role: 'staff',
        isActive: true,
        isStaff: true,
        isSuperuser: false,
      },
      {
        email: 'client@example.com',
        name: 'Client User',
        password: 'Client@Example2025!',
        role: 'client',
        isActive: true,
        isStaff: false,
        isSuperuser: false,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (const userData of defaultUsers) {
      try {
        const { email, password, ...rest } = userData;
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
          // Update password
          existingUser.password = password; // Will be hashed by pre-save hook
          Object.assign(existingUser, rest);
          await existingUser.save();
          updatedCount++;
        } else {
          // Create new user
          const user = new User({
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save hook
            ...rest,
          });
          await user.save();
          createdCount++;
        }
      } catch (error) {
        errors.push(`${userData.email}: ${error.message}`);
      }
    }

    return res.status(200).json({
      message: 'Users seeded successfully',
      created: createdCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : null,
      credentials: {
        admin: 'admin@sync2gear.com / Admin@Sync2Gear2025!',
        staff: 'staff@sync2gear.com / Staff@Sync2Gear2025!',
        client: 'client@example.com / Client@Example2025!',
      },
    });
  } catch (error) {
    console.error('Seed users error:', error);
    return res.status(500).json({
      detail: 'An error occurred during user seeding.'
    });
  }
});

module.exports = router;

