const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');

const router = express.Router();

// Simple schedule model (in-memory for now, can be moved to MongoDB later)
// In production, you'd create a Schedule model similar to Announcement

// Get active simple schedules
router.get('/simple/active/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const zoneId = req.query.zone_id;

    // In production, would query Schedule model
    // For now, return empty array
    return res.status(200).json({ results: [], count: 0 });
  } catch (error) {
    console.error('Get active schedules error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Execute simple schedule
router.post('/simple/execute/', authenticate, async (req, res) => {
  try {
    const { schedule_id, zone_id } = req.body;

    // In production, would execute the schedule
    // For now, return success
    return res.status(200).json({ message: 'Schedule executed.' });
  } catch (error) {
    console.error('Execute schedule error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Get all schedules
router.get('/schedules/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);

    // In production, would query Schedule model
    return res.status(200).json({ results: [], count: 0 });
  } catch (error) {
    console.error('Get schedules error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Create schedule
router.post('/schedules/', authenticate, async (req, res) => {
  try {
    const { name, schedule_config, zones, devices, priority, enabled } = req.body;

    // In production, would create Schedule model instance
    return res.status(201).json({
      id: 'placeholder-id',
      name: name || 'New Schedule',
      schedule_config: schedule_config || {},
      enabled: enabled !== undefined ? enabled : true,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Update schedule
router.patch('/schedules/:id/', authenticate, async (req, res) => {
  try {
    // In production, would update Schedule model
    return res.status(200).json({
      id: req.params.id,
      ...req.body,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Delete schedule
router.delete('/schedules/:id/', authenticate, async (req, res) => {
  try {
    // In production, would delete Schedule model
    return res.status(204).send();
  } catch (error) {
    console.error('Delete schedule error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Toggle schedule
router.post('/schedules/:id/toggle/', authenticate, async (req, res) => {
  try {
    const { enabled } = req.body;
    // In production, would update Schedule model
    return res.status(200).json({
      id: req.params.id,
      enabled: enabled !== undefined ? enabled : true,
    });
  } catch (error) {
    console.error('Toggle schedule error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Check now
router.post('/schedules/check_now/', authenticate, async (req, res) => {
  try {
    // In production, would trigger schedule check
    return res.status(200).json({ message: 'Schedule check triggered.' });
  } catch (error) {
    console.error('Check now error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

module.exports = router;

