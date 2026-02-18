// PRODUCTION-READY S3-ONLY MUSIC ROUTES
// Fixed version with all required endpoints

const express = require('express');
const path = require('path');
const { getPresignedUploadUrl, getPresignedDownloadUrl, streamFile, BUCKET_NAME } = require('../services/s3');
const MusicFile = require('../models/MusicFile');
const Folder = require('../models/Folder');
const Client = require('../models/Client');
const Zone = require('../models/Zone');
const { authenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');

const router = express.Router();

// PRODUCTION CONFIGURATION - FORCE S3 ONLY
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const FORCE_S3_UPLOAD = isProduction || process.env.FORCE_S3_UPLOAD === 'true';

console.log(`🚀 Storage Mode: ${FORCE_S3_UPLOAD ? 'S3-ONLY' : 'LOCAL'} (Production: ${isProduction})`);

// Helper function to get base URL for file serving
const getBaseUrl = (req) => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
  return `${protocol}://${host}`;
};

// PRODUCTION: Generate presigned upload URL for direct S3 upload
router.post('/upload-url/', authenticate, async (req, res) => {
  try {
    const { filename, contentType, fileSize, folder_id, zone_id } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = req.body.client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Generate unique S3 key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `music/${targetClientId}/${timestamp}-${randomId}-${sanitizedFilename}`;
    
    // Generate presigned upload URL (valid for 1 hour)
    const uploadUrl = await getPresignedUploadUrl(s3Key, contentType, 3600);

    return res.status(200).json({
      uploadUrl,
      s3Key,
      expiresIn: 3600,
      message: 'Upload file directly to S3, then call /complete/ endpoint'
    });
  } catch (error) {
    console.error('Upload URL error:', error);
    return res.status(500).json({ detail: 'Failed to generate upload URL' });
  }
});

// PRODUCTION: Complete upload after file is uploaded to S3
router.post('/files/complete/', authenticate, async (req, res) => {
  try {
    const { s3Key, title, artist, album, genre, year, folder_id, zone_id, fileSize, contentType, duration } = req.body;

    if (!s3Key) {
      return res.status(400).json({ error: 's3Key is required' });
    }

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = req.body.client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate folder if provided
    if (folder_id) {
      const folder = await Folder.findOne({ _id: folder_id, clientId: targetClientId });
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found or not accessible' });
      }
    }

    // Check for duplicate song name (case-insensitive) for the same client
    const songTitle = title || path.basename(s3Key);
    const existingSong = await MusicFile.findOne({
      clientId: targetClientId,
      title: { $regex: new RegExp(`^${songTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (existingSong) {
      return res.status(400).json({
        error: `A song with the name "${songTitle}" already exists. Please use a different name.`
      });
    }

    // Generate file URL (S3 presigned URL endpoint)
    const baseUrl = getBaseUrl();
    const fileUrl = `${baseUrl}/api/v1/music/files/stream/${encodeURIComponent(s3Key)}/`;

    // Parse duration
    const parsedDuration = duration && !isNaN(Number(duration)) ? Math.max(0, Math.round(Number(duration))) : 0;

    const musicFile = new MusicFile({
      filename: path.basename(s3Key),
      fileSize: fileSize || 0,
      fileUrl,
      s3Key,
      title: songTitle,
      artist: artist || 'Unknown',
      album: album || '',
      genre: genre || '',
      year: year ? parseInt(year) : null,
      duration: parsedDuration,
      coverArtUrl: null,
      clientId: targetClientId,
      uploadedById: req.user._id,
      folderId: folder_id || null,
      zoneId: zone_id || null,
      order: 0,
    });

    await musicFile.save();

    // Return formatted response
    return res.status(201).json({
      id: musicFile._id,
      name: musicFile.title,
      title: musicFile.title,
      artist: musicFile.artist,
      album: musicFile.album,
      genre: musicFile.genre,
      year: musicFile.year,
      duration: musicFile.duration,
      file_size: musicFile.fileSize,
      file_url: musicFile.fileUrl,
      url: musicFile.fileUrl,
      cover_art: musicFile.coverArtUrl,
      cover_art_url: musicFile.coverArtUrl,
      folder_id: musicFile.folderId,
      folderId: musicFile.folderId,
      zone_id: musicFile.zoneId,
      zoneId: musicFile.zoneId,
      client_id: musicFile.clientId,
      clientId: musicFile.clientId,
      order: musicFile.order,
      created_at: musicFile.createdAt,
      updated_at: musicFile.updatedAt,
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    return res.status(500).json({ detail: 'Failed to complete upload' });
  }
});

// Get music files (updated for S3)
router.get('/files/', authenticate, async (req, res) => {
  try {
    const { folder, zone, search } = req.query;
    const effectiveClient = getEffectiveClient(req);
    let query = {};

    if (req.user.role === 'admin' && !effectiveClient) {
      query = {};
    } else if (effectiveClient) {
      query.clientId = effectiveClient;
    } else {
      return res.status(200).json({ results: [], count: 0 });
    }

    if (folder) query.folderId = folder;
    if (zone) query.zoneId = zone;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.user.role === 'admin' && !effectiveClient && req.query.client) {
      query.clientId = req.query.client;
    }

    const musicFiles = await MusicFile.find(query).sort({ createdAt: -1 }).limit(100);

    // Return files with S3 streaming URLs
    const formattedFiles = musicFiles.map(file => ({
      id: file._id,
      name: file.title || file.filename,
      title: file.title,
      artist: file.artist || 'Unknown',
      album: file.album || '',
      genre: file.genre || '',
      year: file.year || null,
      duration: file.duration || 0,
      file_size: file.fileSize || 0,
      file_url: file.s3Key ? `${getBaseUrl()}/api/v1/music/files/stream/${encodeURIComponent(file.s3Key)}/` : file.fileUrl,
      url: file.s3Key ? `${getBaseUrl()}/api/v1/music/files/stream/${encodeURIComponent(file.s3Key)}/` : file.fileUrl,
      cover_art: file.coverArtUrl,
      cover_art_url: file.coverArtUrl,
      folder_id: file.folderId,
      folderId: file.folderId,
      zone_id: file.zoneId,
      zoneId: file.zoneId,
      client_id: file.clientId,
      clientId: file.clientId,
      order: file.order || 0,
      created_at: file.createdAt,
      updated_at: file.updatedAt,
    }));

    return res.status(200).json({ results: formattedFiles, count: formattedFiles.length });
  } catch (error) {
    console.error('Get music files error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// PRODUCTION: Stream music file from S3 using presigned URLs
router.get('/files/stream/:s3Key/', authenticate, async (req, res) => {
  try {
    const s3Key = decodeURIComponent(req.params.s3Key);
    
    // Find the music file by S3 key
    const musicFile = await MusicFile.findOne({ s3Key });
    
    if (!musicFile) {
      return res.status(404).json({ detail: 'File not found' });
    }

    // Check permissions
    const effectiveClient = getEffectiveClient(req);
    if (req.user.role !== 'admin' && musicFile.clientId !== effectiveClient) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Generate presigned download URL (valid for 1 hour)
    try {
      const downloadUrl = await getPresignedDownloadUrl(s3Key, 3600);
      
      // Redirect to S3 presigned URL
      return res.redirect(302, downloadUrl);
    } catch (s3Error) {
      console.error('S3 presigned URL error:', s3Error);
      return res.status(500).json({ detail: 'Failed to generate download URL' });
    }
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(500).json({ detail: 'Streaming failed' });
  }
});

// Get single music file
router.get('/files/:id/', authenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);

    if (!musicFile) {
      return res.status(404).json({ detail: 'Music file not found.' });
    }

    // Check access
    if (musicFile.clientId !== req.user.clientId && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to access this file.' });
    }

    return res.status(200).json(musicFile.toJSON());
  } catch (error) {
    console.error('Get music file error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Update music file
router.patch('/files/:id/', authenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);

    if (!musicFile) {
      return res.status(404).json({ detail: 'Music file not found.' });
    }

    // Check access
    if (musicFile.clientId !== req.user.clientId && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to update this file.' });
    }

    // Update fields
    const { title, artist, album, genre, year, folder_id, zone_id, order } = req.body;
    
    // Check for duplicate song name if title is being updated
    if (title !== undefined && title !== musicFile.title) {
      const existingSong = await MusicFile.findOne({
        _id: { $ne: musicFile._id }, // Exclude current song
        clientId: musicFile.clientId,
        title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (existingSong) {
        return res.status(400).json({
          error: `A song with the name "${title}" already exists. Please use a different name.`
        });
      }
      musicFile.title = title;
    }
    
    if (artist !== undefined) musicFile.artist = artist;
    if (album !== undefined) musicFile.album = album;
    if (genre !== undefined) musicFile.genre = genre;
    if (year !== undefined) musicFile.year = year;
    if (folder_id !== undefined) musicFile.folderId = folder_id;
    if (zone_id !== undefined) musicFile.zoneId = zone_id;
    if (order !== undefined) musicFile.order = order;

    await musicFile.save();

    return res.status(200).json(musicFile.toJSON());
  } catch (error) {
    console.error('Update music file error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Copy a music file to another zone (duplicate record pointing to same file)
router.post('/files/:id/copy_to_zone/', authenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);
    if (!musicFile) {
      return res.status(404).json({ detail: 'Music file not found.' });
    }
    const effectiveClient = getEffectiveClient(req);
    if (musicFile.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to copy this file.' });
    }
    const { zone_id, folder_id, title } = req.body;
    if (!zone_id) {
      return res.status(400).json({ detail: 'zone_id is required.' });
    }
    // Prepare new title, avoiding duplicates for this client
    let newTitle = title || musicFile.title;
    const existing = await MusicFile.findOne({
      clientId: musicFile.clientId,
      title: { $regex: new RegExp(`^${newTitle.replace(/[.*+?^${}[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existing) {
      newTitle = `${newTitle} (copy)`;
    }
    // Build fileUrl from existing filename/s3Key
    const filename = musicFile.filename || (musicFile.s3Key ? path.basename(musicFile.s3Key) : '');
    const baseUrl = getBaseUrl();
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const fileUrl = filename ? `${baseUrl}/api/v1/music/files/stream/${encodeURIComponent(filename)}/${tokenParam}` : (musicFile.fileUrl || '');
    // Create duplicate record
    const duplicate = new MusicFile({
      filename: filename || musicFile.filename,
      fileSize: musicFile.fileSize || 0,
      fileUrl,
      s3Key: musicFile.s3Key || null,
      title: newTitle,
      artist: musicFile.artist || 'Unknown',
      album: musicFile.album || '',
      genre: musicFile.genre || '',
      year: musicFile.year || null,
      duration: musicFile.duration || 0,
      coverArtUrl: musicFile.coverArtUrl || null,
      coverArtS3Key: musicFile.coverArtS3Key || null,
      clientId: musicFile.clientId,
      uploadedById: req.user._id,
      folderId: folder_id !== undefined ? folder_id : musicFile.folderId || null,
      zoneId: zone_id,
      order: 0,
    });
    await duplicate.save();
    return res.status(201).json(duplicate.toJSON());
  } catch (error) {
    console.error('Copy music file error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Upload cover art for music file
router.post('/files/:id/upload_cover_art/', authenticate, async (req, res) => {
  try {
    // For production, implement S3 upload for cover art
    // For now, return placeholder
    return res.status(501).json({ detail: 'Cover art upload not implemented for S3 yet' });
  } catch (error) {
    console.error('Cover art upload error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Delete music file
router.delete('/files/:id/', authenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);

    if (!musicFile) {
      return res.status(404).json({
        detail: 'Music file not found.'
      });
    }

    // Check access
    if (musicFile.clientId !== req.user.clientId && req.user.role !== 'admin') {
      return res.status(403).json({
        detail: 'You do not have permission to delete this file.'
      });
    }

    await MusicFile.deleteOne({ _id: req.params.id });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete music file error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

module.exports = router;