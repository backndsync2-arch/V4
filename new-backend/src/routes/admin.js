const express = require('express');
const Client = require('../models/Client');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================================================
// CLIENTS
// ============================================================================

// Get all clients
router.get('/clients/', authenticate, isAdmin, async (req, res) => {
  try {
    let query = {};
    
    // Filter by status if provided
    if (req.query.status) {
      query.subscriptionStatus = req.query.status;
    }
    
    // Search by name, business_name, or email
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { businessName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    
    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Get user counts for each client
    const clientIds = clients.map(c => c._id);
    const userCounts = await User.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
    ]);
    const userCountMap = {};
    userCounts.forEach(uc => {
      userCountMap[uc._id] = uc.count;
    });
    
    // Format response
    const formattedClients = clients.map(client => ({
      id: client._id,
      name: client.name,
      business_name: client.businessName || client.name,
      email: client.email,
      telephone: client.telephone || '',
      description: client.description || '',
      subscription_tier: client.subscriptionTier,
      subscription_status: client.subscriptionStatus,
      subscription_price: client.subscriptionPrice || 0,
      subscription_start: client.subscriptionStart || null,
      subscription_end: client.subscriptionEnd || null,
      trial_days: client.trialDays || 14,
      trial_ends_at: client.trialEndsAt || null,
      stripe_customer_id: client.stripeCustomerId || null,
      stripe_subscription_id: client.stripeSubscriptionId || null,
      premium_features: client.premiumFeatures || {},
      max_devices: client.maxDevices || 5,
      max_storage_gb: client.maxStorageGB || 10,
      max_floors: client.maxFloors || 1,
      is_active: client.isActive !== false,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
      users_count: userCountMap[client._id] || 0,
    }));
    
    res.json(formattedClients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/clients/:id/', authenticate, isAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).lean();
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get users for this client
    const users = await User.find({ clientId: client._id })
      .select('name email role isActive')
      .lean();
    
    res.json({
      id: client._id,
      name: client.name,
      business_name: client.businessName || client.name,
      email: client.email,
      telephone: client.telephone || '',
      description: client.description || '',
      subscription_tier: client.subscriptionTier,
      subscription_status: client.subscriptionStatus,
      subscription_price: client.subscriptionPrice || 0,
      subscription_start: client.subscriptionStart || null,
      subscription_end: client.subscriptionEnd || null,
      trial_days: client.trialDays || 14,
      trial_ends_at: client.trialEndsAt || null,
      stripe_customer_id: client.stripeCustomerId || null,
      stripe_subscription_id: client.stripeSubscriptionId || null,
      premium_features: client.premiumFeatures || {},
      max_devices: client.maxDevices || 5,
      max_storage_gb: client.maxStorageGB || 10,
      max_floors: client.maxFloors || 1,
      is_active: client.isActive !== false,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.isActive !== false,
      })),
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/clients/', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      business_name,
      telephone,
      description,
      subscription_tier = 'basic',
      subscription_status = 'trial',
      subscription_price = 0,
      subscription_start,
      subscription_end,
      trial_days = 14,
      max_devices = 5,
      max_storage_gb = 10,
      max_floors = 1,
      is_active = true,
    } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Check if email already exists
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }
    
    // Create client
    const client = new Client({
      name,
      email,
      businessName: business_name || name,
      telephone: telephone || '',
      description: description || '',
      subscriptionTier: subscription_tier,
      subscriptionStatus: subscription_status,
      subscriptionPrice: subscription_price,
      subscriptionStart: subscription_start || null,
      subscriptionEnd: subscription_end || null,
      trialDays: trial_days,
      trialEndsAt: subscription_status === 'trial' ? new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000) : null,
      maxDevices: max_devices,
      maxStorageGB: max_storage_gb,
      maxFloors: max_floors,
      isActive: is_active,
      premiumFeatures: {},
    });
    
    await client.save();
    
    // Format response
    res.status(201).json({
      id: client._id,
      name: client.name,
      business_name: client.businessName || client.name,
      email: client.email,
      telephone: client.telephone || '',
      description: client.description || '',
      subscription_tier: client.subscriptionTier,
      subscription_status: client.subscriptionStatus,
      subscription_price: client.subscriptionPrice || 0,
      subscription_start: client.subscriptionStart || null,
      subscription_end: client.subscriptionEnd || null,
      trial_days: client.trialDays || 14,
      trial_ends_at: client.trialEndsAt || null,
      stripe_customer_id: client.stripeCustomerId || null,
      stripe_subscription_id: client.stripeSubscriptionId || null,
      premium_features: client.premiumFeatures || {},
      max_devices: client.maxDevices || 5,
      max_storage_gb: client.maxStorageGB || 10,
      max_floors: client.maxFloors || 1,
      is_active: client.isActive !== false,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    });
  } catch (error) {
    console.error('Create client error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.patch('/clients/:id/', authenticate, isAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Map request body fields to schema fields
    const updateFields = {};
    if (req.body.name !== undefined) updateFields.name = req.body.name;
    if (req.body.email !== undefined) updateFields.email = req.body.email;
    if (req.body.business_name !== undefined) updateFields.businessName = req.body.business_name;
    if (req.body.telephone !== undefined) updateFields.telephone = req.body.telephone;
    if (req.body.description !== undefined) updateFields.description = req.body.description;
    if (req.body.subscription_tier !== undefined) updateFields.subscriptionTier = req.body.subscription_tier;
    if (req.body.subscription_status !== undefined) updateFields.subscriptionStatus = req.body.subscription_status;
    if (req.body.subscription_price !== undefined) updateFields.subscriptionPrice = req.body.subscription_price;
    if (req.body.subscription_start !== undefined) updateFields.subscriptionStart = req.body.subscription_start;
    if (req.body.subscription_end !== undefined) updateFields.subscriptionEnd = req.body.subscription_end;
    if (req.body.trial_days !== undefined) updateFields.trialDays = req.body.trial_days;
    if (req.body.max_devices !== undefined) updateFields.maxDevices = req.body.max_devices;
    if (req.body.max_storage_gb !== undefined) updateFields.maxStorageGB = req.body.max_storage_gb;
    if (req.body.max_floors !== undefined) updateFields.maxFloors = req.body.max_floors;
    if (req.body.is_active !== undefined) updateFields.isActive = req.body.is_active;
    if (req.body.premium_features !== undefined) updateFields.premiumFeatures = req.body.premium_features;
    if (req.body.stripe_customer_id !== undefined) updateFields.stripeCustomerId = req.body.stripe_customer_id;
    if (req.body.stripe_subscription_id !== undefined) updateFields.stripeSubscriptionId = req.body.stripe_subscription_id;
    
    // Update trial_ends_at if subscription_status changed to trial
    if (req.body.subscription_status === 'trial' && !client.trialEndsAt) {
      updateFields.trialEndsAt = new Date(Date.now() + (updateFields.trialDays || client.trialDays || 14) * 24 * 60 * 60 * 1000);
    }
    
    Object.assign(client, updateFields);
    await client.save();
    
    // Format response
    res.json({
      id: client._id,
      name: client.name,
      business_name: client.businessName || client.name,
      email: client.email,
      telephone: client.telephone || '',
      description: client.description || '',
      subscription_tier: client.subscriptionTier,
      subscription_status: client.subscriptionStatus,
      subscription_price: client.subscriptionPrice || 0,
      subscription_start: client.subscriptionStart || null,
      subscription_end: client.subscriptionEnd || null,
      trial_days: client.trialDays || 14,
      trial_ends_at: client.trialEndsAt || null,
      stripe_customer_id: client.stripeCustomerId || null,
      stripe_subscription_id: client.stripeSubscriptionId || null,
      premium_features: client.premiumFeatures || {},
      max_devices: client.maxDevices || 5,
      max_storage_gb: client.maxStorageGB || 10,
      max_floors: client.maxFloors || 1,
      is_active: client.isActive !== false,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    });
  } catch (error) {
    console.error('Update client error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A client with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/clients/:id/', authenticate, isAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Check if client has users
    const usersCount = await User.countDocuments({ clientId: client._id });
    if (usersCount > 0) {
      return res.status(400).json({ error: `Cannot delete client with ${usersCount} user(s). Please delete or reassign users first.` });
    }
    
    await Client.deleteOne({ _id: client._id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// Toggle client status
router.post('/clients/:id/toggle_status/', authenticate, isAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const oldStatus = client.isActive;
    client.isActive = !client.isActive;
    await client.save();
    
    res.json({
      id: client._id,
      is_active: client.isActive,
      message: client.isActive ? 'Client activated' : 'Client deactivated',
    });
  } catch (error) {
    console.error('Toggle client status error:', error);
    res.status(500).json({ error: 'Failed to toggle client status' });
  }
});

// Impersonate client
router.post('/clients/:id/impersonate/', authenticate, isAdmin, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json({
      client_id: client._id,
      client_name: client.name,
      message: `Now impersonating ${client.name}. All data will be filtered to this client.`,
      impersonation_active: true,
    });
  } catch (error) {
    console.error('Impersonate client error:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

// Stop impersonating
router.post('/clients/stop_impersonate/', authenticate, isAdmin, async (req, res) => {
  try {
    res.json({
      message: 'Stopped impersonating client',
      impersonation_active: false,
      sessions_ended: 1,
    });
  } catch (error) {
    console.error('Stop impersonate error:', error);
    res.status(500).json({ error: 'Failed to stop impersonation' });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// Middleware to check if user can manage users (admin, staff, or client)
const isUserManager = (req, res, next) => {
  if (!['admin', 'staff', 'client'].includes(req.user.role)) {
    return res.status(403).json({ error: 'User management access required' });
  }
  next();
};

// Get all users
router.get('/users/', authenticate, isUserManager, async (req, res) => {
  try {
    let query = {};
    const effectiveClient = req.headers['x-impersonate-client'] || req.user.clientId;
    
    // If admin is impersonating, show only that client's users
    if (req.user.role === 'admin' && effectiveClient) {
      query.clientId = effectiveClient;
    } else if (req.user.role === 'admin' || req.user.role === 'staff') {
      // Admin/staff can see all users when not impersonating
      // No filter needed
    } else if (req.user.role === 'client' && req.user.clientId) {
      // Client users can only see users from their own client
      query.clientId = req.user.clientId;
    } else {
      return res.status(403).json({ error: 'No access to user management' });
    }
    
    // Filter by role if provided
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    // Filter by client (only for admin/staff when not impersonating)
    if ((req.user.role === 'admin' || req.user.role === 'staff') && !effectiveClient) {
      if (req.query.client) {
        query.clientId = req.query.client;
      }
    }
    
    // Search by name or email
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    
    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      client_id: user.clientId || null,
      floor_id: user.floorId || null,
      is_active: user.isActive !== false,
      is_staff: user.isStaff || false,
      is_superuser: user.isSuperuser || false,
      avatar: user.avatar || null,
      phone: user.phone || null,
      timezone: user.timezone || 'UTC',
      settings: user.settings || {},
      last_seen: user.lastSeen || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id/', authenticate, isUserManager, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check permissions
    const effectiveClient = req.headers['x-impersonate-client'] || req.user.clientId;
    if (req.user.role === 'client' && user.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'You can only view users from your own organization' });
    }
    
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      client_id: user.clientId || null,
      floor_id: user.floorId || null,
      is_active: user.isActive !== false,
      is_staff: user.isStaff || false,
      is_superuser: user.isSuperuser || false,
      avatar: user.avatar || null,
      phone: user.phone || null,
      timezone: user.timezone || 'UTC',
      settings: user.settings || {},
      last_seen: user.lastSeen || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/users/', authenticate, isUserManager, async (req, res) => {
  try {
    const {
      email,
      name,
      role = 'client',
      client_id,
      floor_id,
      password,
      is_active = true,
      phone,
      timezone = 'UTC',
    } = req.body;
    
    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    
    // For client role users, ensure they can only create users for their own client
    let targetClientId = client_id;
    if (req.user.role === 'client') {
      targetClientId = req.user.clientId;
      if (client_id && client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'You can only create users for your own organization' });
      }
    }
    
    // Validate role-based requirements
    if (role === 'client' && !targetClientId) {
      return res.status(400).json({ error: 'client_id is required when role is client' });
    }
    if (role === 'floor_user' && (!targetClientId || !floor_id)) {
      return res.status(400).json({ error: 'client_id and floor_id are required when role is floor_user' });
    }
    if (role === 'admin' || role === 'staff') {
      if (targetClientId || floor_id) {
        return res.status(400).json({ error: 'admin and staff roles cannot have client_id or floor_id' });
      }
    }
    
    // Validate client exists if provided
    if (targetClientId) {
      const client = await Client.findById(targetClientId);
      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }
    }
    
    // Validate floor exists and belongs to client if provided
    if (floor_id) {
      const Floor = require('../models/Floor');
      const floor = await Floor.findById(floor_id);
      if (!floor) {
        return res.status(400).json({ error: 'Floor not found' });
      }
      if (floor.clientId !== targetClientId) {
        return res.status(400).json({ error: 'Floor does not belong to the specified client' });
      }
    }
    
    // Prevent client users from creating admin/staff roles
    if (req.user.role === 'client' && (role === 'admin' || role === 'staff')) {
      return res.status(403).json({ error: 'You cannot assign admin or staff roles' });
    }
    
    // Generate password if not provided (temporary password)
    const bcrypt = require('bcryptjs');
    let hashedPassword = password;
    if (!hashedPassword) {
      // Generate a random temporary password
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(tempPassword, salt);
      // In production, you'd send this via email
      console.log(`Temporary password for ${email}: ${tempPassword}`);
    } else {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }
    
    // Create user
    const user = new User({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role,
      clientId: targetClientId || null,
      floorId: floor_id || null,
      isActive: is_active,
      isStaff: role === 'staff' || role === 'admin',
      isSuperuser: role === 'admin',
      phone: phone || null,
      timezone,
    });
    
    await user.save();
    
    // Format response (password is automatically excluded by toJSON)
    res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      client_id: user.clientId || null,
      floor_id: user.floorId || null,
      is_active: user.isActive !== false,
      is_staff: user.isStaff || false,
      is_superuser: user.isSuperuser || false,
      avatar: user.avatar || null,
      phone: user.phone || null,
      timezone: user.timezone || 'UTC',
      settings: user.settings || {},
      last_seen: user.lastSeen || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.patch('/users/:id/', authenticate, isUserManager, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check permissions
    if (req.user.role === 'client' && user.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'You can only update users from your own organization' });
    }
    
    // Prevent client users from assigning admin/staff roles
    if (req.user.role === 'client') {
      if (req.body.role && ['admin', 'staff'].includes(req.body.role)) {
        return res.status(403).json({ error: 'You cannot assign admin or staff roles' });
      }
      // Force client_id to be the user's client
      if (req.body.client_id && req.body.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'You cannot change client_id' });
      }
    }
    
    // Map request body fields to schema fields
    const updateFields = {};
    if (req.body.email !== undefined) updateFields.email = req.body.email.toLowerCase();
    if (req.body.name !== undefined) updateFields.name = req.body.name;
    if (req.body.role !== undefined) {
      updateFields.role = req.body.role;
      updateFields.isStaff = ['staff', 'admin'].includes(req.body.role);
      updateFields.isSuperuser = req.body.role === 'admin';
    }
    if (req.body.client_id !== undefined) {
      // Validate client exists
      if (req.body.client_id) {
        const client = await Client.findById(req.body.client_id);
        if (!client) {
          return res.status(400).json({ error: 'Client not found' });
        }
      }
      updateFields.clientId = req.body.client_id || null;
    }
    if (req.body.floor_id !== undefined) {
      // Validate floor exists and belongs to client
      if (req.body.floor_id) {
        const Floor = require('../models/Floor');
        const floor = await Floor.findById(req.body.floor_id);
        if (!floor) {
          return res.status(400).json({ error: 'Floor not found' });
        }
        if (updateFields.clientId && floor.clientId !== updateFields.clientId) {
          return res.status(400).json({ error: 'Floor does not belong to the specified client' });
        }
      }
      updateFields.floorId = req.body.floor_id || null;
    }
    if (req.body.is_active !== undefined) updateFields.isActive = req.body.is_active;
    if (req.body.phone !== undefined) updateFields.phone = req.body.phone;
    if (req.body.timezone !== undefined) updateFields.timezone = req.body.timezone;
    if (req.body.settings !== undefined) updateFields.settings = req.body.settings;
    if (req.body.avatar !== undefined) updateFields.avatar = req.body.avatar;
    
    // Handle password update
    if (req.body.password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(req.body.password, salt);
    }
    
    Object.assign(user, updateFields);
    await user.save();
    
    // Format response
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      client_id: user.clientId || null,
      floor_id: user.floorId || null,
      is_active: user.isActive !== false,
      is_staff: user.isStaff || false,
      is_superuser: user.isSuperuser || false,
      avatar: user.avatar || null,
      phone: user.phone || null,
      timezone: user.timezone || 'UTC',
      settings: user.settings || {},
      last_seen: user.lastSeen || null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id/', authenticate, isUserManager, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check permissions
    if (req.user.role === 'client' && user.clientId !== req.user.clientId) {
      return res.status(403).json({ error: 'You can only delete users from your own organization' });
    }
    
    // Prevent deleting yourself
    if (user._id === req.user._id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    await User.deleteOne({ _id: user._id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

