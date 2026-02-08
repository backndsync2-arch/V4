const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');
const Zone = require('../models/Zone');

const router = express.Router();

// Get playback state by zone
router.get('/state/by_zone/', authenticate, async (req, res) => {
  try {
    const { zone_id } = req.query;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    // Verify zone exists and user has access
    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to access this zone.' });
    }

    // In production, would query PlaybackState model
    // For now, return placeholder state
    return res.status(200).json({
      zone_id: zone_id,
      is_playing: false,
      current_track: null,
      current_position: 0,
      volume: 50,
      shuffle: false,
      repeat: false,
      queue: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get playback state error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Play music in zone
router.post('/control/play/', authenticate, async (req, res) => {
  try {
    const { zone_id, playlist_ids, music_file_ids, shuffle } = req.body;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    // Verify zone exists and user has access
    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would start playback using PlaybackEngine
    // For now, return success
    return res.status(200).json({ 
      message: 'Playback started.',
      zone_id,
      playlist_ids: playlist_ids || [],
      music_file_ids: music_file_ids || [],
      shuffle: shuffle || false,
    });
  } catch (error) {
    console.error('Play error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Pause playback
router.post('/control/pause/', authenticate, async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would pause playback
    return res.status(200).json({ message: 'Playback paused.', zone_id });
  } catch (error) {
    console.error('Pause error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Resume playback
router.post('/control/resume/', authenticate, async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would resume playback
    return res.status(200).json({ message: 'Playback resumed.', zone_id });
  } catch (error) {
    console.error('Resume error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Next track
router.post('/control/next/', authenticate, async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would skip to next track
    return res.status(200).json({ message: 'Skipped to next track.', zone_id });
  } catch (error) {
    console.error('Next error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Previous track
router.post('/control/previous/', authenticate, async (req, res) => {
  try {
    const { zone_id } = req.body;

    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would skip to previous track
    return res.status(200).json({ message: 'Skipped to previous track.', zone_id });
  } catch (error) {
    console.error('Previous error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Set volume
router.post('/control/volume/', authenticate, async (req, res) => {
  try {
    const { zone_id, volume } = req.body;

    if (!zone_id || volume === undefined) {
      return res.status(400).json({ detail: 'zone_id and volume are required.' });
    }

    if (volume < 0 || volume > 100) {
      return res.status(400).json({ detail: 'Volume must be between 0 and 100.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would set volume
    return res.status(200).json({ message: 'Volume set.', zone_id, volume });
  } catch (error) {
    console.error('Volume error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Seek to position
router.post('/control/seek/', authenticate, async (req, res) => {
  try {
    const { zone_id, position } = req.body;

    if (!zone_id || position === undefined) {
      return res.status(400).json({ detail: 'zone_id and position are required.' });
    }

    if (position < 0) {
      return res.status(400).json({ detail: 'Position must be non-negative.' });
    }

    const effectiveClient = getEffectiveClient(req);

    const zone = await Zone.findById(zone_id);
    if (!zone) {
      return res.status(404).json({ detail: 'Zone not found.' });
    }

    if (zone.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to control this zone.' });
    }

    // In production, would seek to position
    return res.status(200).json({ message: 'Seeked to position.', zone_id, position });
  } catch (error) {
    console.error('Seek error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

module.exports = router;

