// PRODUCTION-READY S3-ONLY MUSIC ROUTES
// This replaces the local file storage with S3-only architecture

const express = require('express');
const { getPresignedUploadUrl, getPresignedDownloadUrl, streamFile, BUCKET_NAME } = require('../services/s3');
const MusicFile = require('../models/MusicFile');
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
      const Folder = require('../models/Folder');
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
    const baseUrl = getBaseUrl(req);
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

// Export the router
module.exports = router;