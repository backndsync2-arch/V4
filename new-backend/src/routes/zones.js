const express = require('express');
const Zone = require('../models/Zone');
const Floor = require('../models/Floor');
const Device = require('../models/Device');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper to get effective client (handles impersonation)
const getEffectiveClient = (req) => {
  // Check for impersonation header (case-insensitive)
  const impersonatingClientId = req.headers['x-impersonate-client'] || 
                                req.headers['X-Impersonate-Client'] ||
                                req.headers['X-IMPERSONATE-CLIENT'];
  
  if (impersonatingClientId && req.user.role === 'admin') {
    return impersonatingClientId;
  }
  // Admin doesn't need a client - can work without one
  if (req.user.role === 'admin') {
    return null; // Admin can work without client
  }
  return req.user.clientId;
};

// ============================================================================
// FLOORS
// ============================================================================

// Get all floors
router.get('/floors/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    let query = {};
    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: show all floors
      query = {};
    } else if (effectiveClient) {
      // Filter by effective client
      query.clientId = effectiveClient;
    } else {
      return res.status(200).json([]);
    }
    
    // Floor users can only see their assigned floor
    if (req.user.role === 'floor_user' && req.user.floorId) {
      query._id = req.user.floorId;
    }
    
    const floors = await Floor.find(query).sort({ name: 1 });
    
    // Populate counts
    const floorsWithCounts = await Promise.all(floors.map(async (floor) => {
      const zonesCount = await Zone.countDocuments({ floorId: floor._id });
      const devicesCount = await Device.countDocuments({ 
        zoneId: { $in: (await Zone.find({ floorId: floor._id }).select('_id')).map(z => z._id) }
      });
      
      const floorObj = floor.toJSON();
      floorObj.zones_count = zonesCount;
      floorObj.devices_count = devicesCount;
      return floorObj;
    }));
    
    res.json(floorsWithCounts);
  } catch (error) {
    console.error('Get floors error:', error);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

// Create floor
router.post('/floors/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    // Determine which client to use for the floor
    let floorClientId = effectiveClient;
    
    // Admin can specify clientId in request body, or use impersonated client
    if (req.user.role === 'admin') {
      if (req.body.client_id || req.body.clientId) {
        floorClientId = req.body.client_id || req.body.clientId;
      } else if (!effectiveClient) {
        return res.status(400).json({ 
          error: 'Admin must specify client_id in request body or impersonate a client' 
        });
      }
    } else {
      // Non-admin users must have a client
      if (!effectiveClient) {
        return res.status(400).json({ error: 'No client associated with this user' });
      }
    }
    
    // Validate client exists
    if (floorClientId) {
      const Client = require('../models/Client');
      const client = await Client.findById(floorClientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
    }
    
    // Check premium feature for multiple floors
    const existingFloors = await Floor.countDocuments({ clientId: floorClientId });
    
    // For now, allow multiple floors (premium check can be added later)
    const isPremium = existingFloors > 0;
    
    const floor = new Floor({
      name: req.body.name,
      description: req.body.description || '',
      clientId: floorClientId,
      is_premium: isPremium,
      createdById: req.user._id,
    });
    
    await floor.save();
    
    const floorObj = floor.toJSON();
    floorObj.zones_count = 0;
    floorObj.devices_count = 0;
    
    res.status(201).json(floorObj);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A floor with this name already exists for this client' });
    }
    console.error('Create floor error:', error);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

// Update floor
router.patch('/floors/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const floor = await Floor.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!floor) {
      return res.status(404).json({ error: 'Floor not found' });
    }
    
    if (req.body.name) floor.name = req.body.name;
    if (req.body.description !== undefined) floor.description = req.body.description;
    
    await floor.save();
    res.json(floor.toJSON());
  } catch (error) {
    console.error('Update floor error:', error);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

// Delete floor
router.delete('/floors/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const floor = await Floor.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!floor) {
      return res.status(404).json({ error: 'Floor not found' });
    }
    
    // Check if floor has zones
    const zonesCount = await Zone.countDocuments({ floorId: floor._id });
    if (zonesCount > 0) {
      return res.status(400).json({ error: 'Cannot delete floor with zones. Please delete zones first.' });
    }
    
    await Floor.deleteOne({ _id: req.params.id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete floor error:', error);
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

// ============================================================================
// ZONES
// ============================================================================

// Get all zones
router.get('/zones/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    let query = {};
    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: show all zones
      query = {};
    } else if (effectiveClient) {
      // Filter by effective client
      query.clientId = effectiveClient;
    } else {
      return res.status(200).json([]);
    }
    
    // Filter by floor if provided
    if (req.query.floor) {
      query.floorId = req.query.floor;
    }
    
    // Floor users can only see zones in their floor
    if (req.user.role === 'floor_user' && req.user.floorId) {
      query.floorId = req.user.floorId;
    }
    
    const zones = await Zone.find(query).sort({ name: 1 });
    
    // Populate counts and floor name
    const zonesWithData = await Promise.all(zones.map(async (zone) => {
      const devicesCount = await Device.countDocuments({ zoneId: zone._id });
      const zoneObj = zone.toJSON();
      zoneObj.devices_count = devicesCount;
      
      if (zone.floorId) {
        const floor = await Floor.findById(zone.floorId);
        if (floor) {
          zoneObj.floor_name = floor.name;
          zoneObj.floor = { id: floor._id, name: floor.name };
        }
      }
      
      return zoneObj;
    }));
    
    res.json(zonesWithData);
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// Create zone
router.post('/zones/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    // Debug logging
    console.log('Create zone - User role:', req.user.role);
    console.log('Create zone - User clientId:', req.user.clientId);
    console.log('Create zone - Effective client:', effectiveClient);
    console.log('Create zone - Request body client_id:', req.body.client_id || req.body.clientId);
    console.log('Create zone - Impersonation header:', req.headers['x-impersonate-client'] || req.headers['X-Impersonate-Client']);
    
    // Determine which client to use for the zone
    let zoneClientId = effectiveClient;
    
    // Admin can specify clientId in request body, or use impersonated client, or use their own clientId
    if (req.user.role === 'admin') {
      // Priority: 1) client_id in body, 2) impersonated client, 3) user's clientId
      if (req.body.client_id || req.body.clientId) {
        zoneClientId = req.body.client_id || req.body.clientId;
        console.log('Using client_id from request body:', zoneClientId);
      } else if (effectiveClient) {
        // Use impersonated client
        zoneClientId = effectiveClient;
        console.log('Using impersonated client:', zoneClientId);
      } else if (req.user.clientId) {
        // Use user's own clientId
        zoneClientId = req.user.clientId;
        console.log('Using user clientId:', zoneClientId);
      } else {
        console.log('Admin has no client - returning error');
        return res.status(400).json({ 
          error: 'Admin must specify client_id in request body, impersonate a client, or have a client associated with your account' 
        });
      }
    } else {
      // Non-admin users must have a client
      if (!effectiveClient) {
        return res.status(400).json({ error: 'No client associated with this user' });
      }
    }
    
    // Validate client exists
    if (zoneClientId) {
      const Client = require('../models/Client');
      const client = await Client.findById(zoneClientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
    }
    
    const zone = new Zone({
      name: req.body.name,
      description: req.body.description || '',
      floorId: req.body.floor_id || req.body.floorId || null,
      clientId: zoneClientId,
      default_volume: req.body.default_volume || 70,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true,
    });
    
    await zone.save();
    
    const zoneObj = zone.toJSON();
    zoneObj.devices_count = 0;
    
    // Populate floor name if floorId exists
    if (zone.floorId) {
      const floor = await Floor.findById(zone.floorId);
      if (floor) {
        zoneObj.floor_name = floor.name;
        zoneObj.floor = { id: floor._id, name: floor.name };
      }
    }
    
    res.status(201).json(zoneObj);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A zone with this name already exists for this client' });
    }
    console.error('Create zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to create zone' });
  }
});

// Update zone
router.patch('/zones/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const zone = await Zone.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    if (req.body.name) zone.name = req.body.name;
    if (req.body.description !== undefined) zone.description = req.body.description;
    if (req.body.floor_id !== undefined) zone.floorId = req.body.floor_id;
    if (req.body.floorId !== undefined) zone.floorId = req.body.floorId;
    if (req.body.default_volume !== undefined) zone.default_volume = req.body.default_volume;
    if (req.body.is_active !== undefined) zone.is_active = req.body.is_active;
    
    await zone.save();
    
    const zoneObj = zone.toJSON();
    const devicesCount = await Device.countDocuments({ zoneId: zone._id });
    zoneObj.devices_count = devicesCount;
    
    // Populate floor name if floorId exists
    if (zone.floorId) {
      const floor = await Floor.findById(zone.floorId);
      if (floor) {
        zoneObj.floor_name = floor.name;
        zoneObj.floor = { id: floor._id, name: floor.name };
      }
    }
    
    res.json(zoneObj);
  } catch (error) {
    console.error('Update zone error:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// Delete zone
router.delete('/zones/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const zone = await Zone.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    // Check if zone has devices
    const devicesCount = await Device.countDocuments({ zoneId: zone._id });
    if (devicesCount > 0) {
      return res.status(400).json({ error: 'Cannot delete zone with devices. Please remove devices first.' });
    }
    
    await Zone.deleteOne({ _id: req.params.id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete zone error:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// ============================================================================
// DEVICES
// ============================================================================

// Get all devices
router.get('/devices/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    let query = {};
    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: show all devices
      query = {};
    } else if (effectiveClient) {
      // Filter by effective client
      query.clientId = effectiveClient;
    } else {
      return res.status(200).json([]);
    }
    
    // Filter by zone if provided
    if (req.query.zone) {
      query.zoneId = req.query.zone;
    }
    
    // Filter by online status
    if (req.query.is_online !== undefined) {
      query.is_online = req.query.is_online === 'true';
    }
    
    // Floor users can only see devices in their floor
    if (req.user.role === 'floor_user' && req.user.floorId) {
      const zonesInFloor = await Zone.find({ floorId: req.user.floorId }).select('_id');
      query.zoneId = { $in: zonesInFloor.map(z => z._id) };
    }
    
    const devices = await Device.find(query).sort({ zoneId: 1, name: 1 });
    
    // Populate zone and floor names
    const devicesWithData = await Promise.all(devices.map(async (device) => {
      const deviceObj = device.toJSON();
      
      const zone = await Zone.findById(device.zoneId);
      if (zone) {
        deviceObj.zone_name = zone.name;
        deviceObj.zone = { id: zone._id, name: zone.name };
        
        if (zone.floorId) {
          const floor = await Floor.findById(zone.floorId);
          if (floor) {
            deviceObj.floor_name = floor.name;
          }
        }
      }
      
      return deviceObj;
    }));
    
    res.json(devicesWithData);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Register device
router.post('/devices/register/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    
    const { device_id, name, device_type = 'speaker', zone_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    if (!zone_id) {
      return res.status(400).json({ error: 'zone_id is required' });
    }
    
    // Find zone - admin can access any zone, others only their client's zones
    let zone;
    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: can access any zone
      zone = await Zone.findById(zone_id);
    } else if (effectiveClient) {
      // Filter by effective client
      zone = await Zone.findOne({ _id: zone_id, clientId: effectiveClient });
    } else {
      return res.status(400).json({ error: 'No client associated with this user' });
    }
    
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    // Use zone's clientId for the device
    const deviceClientId = zone.clientId;
    
    // Check if device already exists
    let device = await Device.findOne({ device_id: device_id || `temp-${Date.now()}` });
    
    if (device) {
      // Update existing device
      device.name = name;
      device.device_type = device_type;
      device.zoneId = zone_id;
      device.clientId = deviceClientId;
      await device.updateHeartbeat();
      
      const deviceObj = device.toJSON();
      deviceObj.zone_name = zone.name;
      deviceObj.zone = { id: zone._id, name: zone.name };
      
      return res.json(deviceObj);
    } else {
      // Create new device
      device = new Device({
        device_id: device_id || `temp-${Date.now()}`,
        name,
        device_type,
        zoneId: zone_id,
        clientId: deviceClientId,
        is_online: true,
      });
      
      await device.updateHeartbeat();
      
      const deviceObj = device.toJSON();
      deviceObj.zone_name = zone.name;
      deviceObj.zone = { id: zone._id, name: zone.name };
      
      return res.status(201).json(deviceObj);
    }
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// Update device
router.patch('/devices/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const device = await Device.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (req.body.name) device.name = req.body.name;
    if (req.body.device_type) device.device_type = req.body.device_type;
    if (req.body.model !== undefined) device.model = req.body.model;
    if (req.body.firmware_version !== undefined) device.firmware_version = req.body.firmware_version;
    if (req.body.ip_address !== undefined) device.ip_address = req.body.ip_address;
    if (req.body.zoneId !== undefined) device.zoneId = req.body.zoneId;
    if (req.body.zone_id !== undefined) device.zoneId = req.body.zone_id;
    
    await device.save();
    
    const deviceObj = device.toJSON();
    const zone = await Zone.findById(device.zoneId);
    if (zone) {
      deviceObj.zone_name = zone.name;
      deviceObj.zone = { id: zone._id, name: zone.name };
    }
    
    res.json(deviceObj);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Delete device
router.delete('/devices/:id/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const device = await Device.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await Device.deleteOne({ _id: req.params.id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Device heartbeat
router.post('/devices/:id/heartbeat/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const device = await Device.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await device.updateHeartbeat();
    
    const deviceObj = device.toJSON();
    const zone = await Zone.findById(device.zoneId);
    if (zone) {
      deviceObj.zone_name = zone.name;
      deviceObj.zone = { id: zone._id, name: zone.name };
    }
    
    res.json(deviceObj);
  } catch (error) {
    console.error('Device heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update device heartbeat' });
  }
});

// Set device volume
router.post('/devices/:id/volume/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const device = await Device.findOne({ _id: req.params.id, clientId: effectiveClient });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const { volume } = req.body;
    if (volume === undefined) {
      return res.status(400).json({ error: 'volume is required' });
    }
    
    if (volume < 0 || volume > 100) {
      return res.status(400).json({ error: 'volume must be between 0 and 100' });
    }
    
    device.volume = volume;
    await device.save();
    
    const deviceObj = device.toJSON();
    const zone = await Zone.findById(device.zoneId);
    if (zone) {
      deviceObj.zone_name = zone.name;
      deviceObj.zone = { id: zone._id, name: zone.name };
    }
    
    res.json(deviceObj);
  } catch (error) {
    console.error('Set device volume error:', error);
    res.status(500).json({ error: 'Failed to set device volume' });
  }
});

module.exports = router;

