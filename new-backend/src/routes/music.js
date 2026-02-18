const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MusicFile = require('../models/MusicFile');
const Folder = require('../models/Folder');
const Client = require('../models/Client');
const Zone = require('../models/Zone');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');
const { getPresignedUploadUrl, getPresignedDownloadUrl, streamFile, BUCKET_NAME } = require('../services/s3');

const router = express.Router();

// Helper to create safe S3 path segments
const slugify = (str) => {
  return (str || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\-|\-$/g, '')
    .toLowerCase();
};

// Determine uploads directory - use /tmp in Lambda, otherwise local uploads
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseUploadsDir = isLambda ? '/tmp' : path.join(__dirname, '..', '..', 'uploads');
const musicDir = path.join(baseUploadsDir, 'music');
const coversDir = path.join(baseUploadsDir, 'covers');

// Helper function to get base URL for file serving
const getBaseUrl = (req) => {
  // Use environment variable if set (for Lambda)
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  // Fallback: construct from request headers
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
  return `${protocol}://${host}`;
};

// Lazy directory creation function - only create when needed
const ensureDirectories = () => {
  [musicDir, coversDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        // Ignore errors in Lambda if directory already exists or can't be created
        if (!isLambda) {
          console.error(`Failed to create directory ${dir}:`, error);
        }
      }
    }
  });
};

// Configure multer for file uploads - save to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directories exist before using them
    ensureDirectories();
    if (file.fieldname === 'cover_art' || file.fieldname === 'cover_image') {
      cb(null, coversDir);
    } else {
      cb(null, musicDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    // API Gateway HTTP API has a 10MB payload limit for the ENTIRE request
    // Multipart encoding adds ~10-15% overhead, so limit file to ~8.5MB to be safe
    // For files larger than this, implement S3 presigned URLs for direct upload
    fileSize: 8.5 * 1024 * 1024, // 8.5MB (accounts for multipart encoding overhead)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files for music uploads
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Configure multer for image uploads (cover images)
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  },
});

// Get music files
router.get('/files/', authenticate, async (req, res) => {
  try {
    const { folder, zone, search } = req.query;
    const effectiveClient = getEffectiveClient(req);
    let query = {};

    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: show all files
      query = {};
    } else if (effectiveClient) {
      // Filter by effective client
      query.clientId = effectiveClient;
    } else {
      // No client associated
      return res.status(200).json({
        results: [],
        count: 0,
      });
    }

    // Filter by folder if provided
    if (folder) {
      query.folderId = folder;
    }

    // Filter by zone if provided
    if (zone) {
      query.zoneId = zone;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
      ];
    }

    // Admin can filter by client query param when not impersonating
    if (req.user.role === 'admin' && !effectiveClient && req.query.client) {
      query.clientId = req.query.client;
    }

    const musicFiles = await MusicFile.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    // Format response to match frontend expectations
    const baseUrl = getBaseUrl(req);
    const formattedFiles = musicFiles.map((f) => {
      const fileObj = f.toJSON ? f.toJSON() : f;
      
      // For S3 files, use streaming endpoint URL instead of presigned URL
      // The streaming endpoint will handle authentication and redirect to presigned URL
      let fileUrl = fileObj.fileUrl || fileObj.file_url;
      if (fileObj.s3Key) {
        // Use streaming endpoint — do NOT encode slashes; API Gateway HTTP API
        // decodes %2F → / before routing anyway, so encoding causes 404s.
        // The wildcard route /files/stream/* captures the full multi-segment key.
        fileUrl = `${baseUrl}/api/v1/music/files/stream/${fileObj.s3Key}/`;
      }
      
      // Handle cover art URL - keep presigned for images
      let coverArtUrl = fileObj.coverArtUrl || fileObj.cover_art || null;
      if (fileObj.coverArtS3Key) {
        // For cover art, we can use presigned URLs or streaming endpoint
        // Using streaming endpoint for consistency
        coverArtUrl = `${baseUrl}/api/v1/music/files/${fileObj._id || fileObj.id}/cover/`;
      }
      
      return {
        id: fileObj._id || fileObj.id,
        name: fileObj.title || fileObj.filename,
        title: fileObj.title,
        artist: fileObj.artist || 'Unknown',
        album: fileObj.album || '',
        genre: fileObj.genre || '',
        year: fileObj.year || null,
        duration: fileObj.duration || 0,
        file_size: fileObj.fileSize || 0,
        file_url: fileUrl,
        stream_url: fileUrl, // Add stream_url for mobile app compatibility
        url: fileUrl,
        cover_art: coverArtUrl,
        cover_art_url: coverArtUrl,
        folder_id: fileObj.folderId || fileObj.folder_id || null,
        folderId: fileObj.folderId || fileObj.folder_id || null,
        zone_id: fileObj.zoneId || fileObj.zone_id || null,
        zoneId: fileObj.zoneId || fileObj.zone_id || null,
        client_id: fileObj.clientId || fileObj.client_id || null,
        clientId: fileObj.clientId || fileObj.client_id || null,
        order: fileObj.order || 0,
        created_at: fileObj.createdAt || fileObj.created_at,
        updated_at: fileObj.updatedAt || fileObj.updated_at,
      };
    });

    return res.status(200).json({
      results: formattedFiles,
      count: formattedFiles.length,
    });
  } catch (error) {
    console.error('Get music files error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

// Get presigned URL for S3 upload (bypasses API Gateway 10MB limit)
router.post('/upload-url/', authenticate, async (req, res) => {
  try {
    const { filename, contentType, fileSize, zone_id, folder_id } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'filename and contentType are required'
      });
    }

    // Get effective client
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

    // Resolve client and zone names for hierarchical S3 path
    let clientName = targetClientId;
    try {
      const client = await Client.findById(targetClientId);
      if (client && client.name) clientName = client.name;
    } catch {}
    let zoneName = 'unassigned-zone';
    if (zone_id) {
      try {
        const z = await Zone.findOne({ _id: zone_id, clientId: targetClientId });
        if (z && z.name) zoneName = z.name;
      } catch {}
    }
    let folderName = 'uncategorized';
    if (folder_id) {
      try {
        const f = await Folder.findOne({ _id: folder_id, clientId: targetClientId });
        if (f && f.name) folderName = f.name;
      } catch {}
    }
    // Generate unique S3 key under client/zone/music/folder
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    const s3Key = `${slugify(clientName)}/${slugify(zoneName)}/music/${slugify(folderName)}/${slugify(name)}-${uniqueSuffix}${ext}`;

    // Generate presigned URL (valid for 1 hour)
    const uploadUrl = await getPresignedUploadUrl(s3Key, contentType, 3600);

    return res.status(200).json({
      uploadUrl,
      s3Key,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return res.status(500).json({
      detail: 'An error occurred while generating upload URL.'
    });
  }
});

// Complete upload after file is uploaded to S3
router.post('/files/complete/', authenticate, async (req, res) => {
  try {
    const { s3Key, title, artist, album, genre, year, folder_id, zone_id, client_id, fileSize, contentType, duration } = req.body;

    if (!s3Key) {
      return res.status(400).json({
        error: 's3Key is required'
      });
    }

    // Get effective client
    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = client_id;
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
    const filename = path.basename(s3Key);
    const songTitle = title || filename;
    const existingSong = await MusicFile.findOne({
      clientId: targetClientId,
      title: { $regex: new RegExp(`^${songTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (existingSong) {
      return res.status(400).json({
        error: `A song with the name "${songTitle}" already exists. Please use a different name.`
      });
    }

    // Store a stable streaming endpoint URL (not an expiring presigned URL).
    // The /files/stream/* endpoint generates a fresh presigned URL on every request,
    // so the stored URL never expires and works on both web and mobile.
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/api/v1/music/files/stream/${s3Key}/`;

    // Parse duration (should be in seconds, ensure it's a number)
    const parsedDuration = duration && !isNaN(Number(duration)) ? Math.max(0, Math.round(Number(duration))) : 0;

    const musicFile = new MusicFile({
      filename: path.basename(s3Key),
      fileSize: fileSize || 0,
      fileUrl,
      s3Key, // Store S3 key for streaming
      title: songTitle,
      artist: artist || 'Unknown',
      album: album || '',
      genre: genre || '',
      year: year ? parseInt(year) : null,
      duration: parsedDuration, // Use duration from frontend
      coverArtUrl: null,
      clientId: targetClientId,
      uploadedById: req.user._id,
      folderId: folder_id || null,
      zoneId: zone_id || null,
      order: 0,
    });

    await musicFile.save();

    // Format response
    const fileObj = musicFile.toJSON ? musicFile.toJSON() : musicFile;
    const formattedFile = {
      id: fileObj._id || fileObj.id,
      name: fileObj.title || fileObj.filename,
      title: fileObj.title,
      artist: fileObj.artist || 'Unknown',
      album: fileObj.album || '',
      genre: fileObj.genre || '',
      year: fileObj.year || null,
      duration: fileObj.duration || 0,
      file_size: fileObj.fileSize || 0,
      file_url: fileObj.fileUrl || fileObj.file_url,
      url: fileObj.fileUrl || fileObj.file_url,
      cover_art: fileObj.coverArtUrl || fileObj.cover_art || null,
      cover_art_url: fileObj.coverArtUrl || fileObj.cover_art_url || null,
      folder_id: fileObj.folderId || fileObj.folder_id || null,
      folderId: fileObj.folderId || fileObj.folder_id || null,
      zone_id: fileObj.zoneId || fileObj.zone_id || null,
      zoneId: fileObj.zoneId || fileObj.zone_id || null,
      client_id: fileObj.clientId || fileObj.client_id || null,
      clientId: fileObj.clientId || fileObj.client_id || null,
      order: fileObj.order || 0,
      created_at: fileObj.createdAt || fileObj.created_at,
      updated_at: fileObj.updatedAt || fileObj.updated_at,
    };

    return res.status(201).json(formattedFile);
  } catch (error) {
    console.error('Complete upload error:', error);
    return res.status(500).json({
      detail: 'An error occurred while completing upload.'
    });
  }
});

// Upload music file (with optional cover art) - Keep for small files < 8MB
router.post('/files/', authenticate, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover_art', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.file || !req.files.file[0]) {
      return res.status(400).json({
        error: 'No file uploaded.'
      });
    }

    const { title, artist, album, genre, year, folder_id, zone_id, client_id, duration } = req.body;
    const file = req.files.file[0];
    const coverArtFile = req.files.cover_art ? req.files.cover_art[0] : null;

    // Get effective client
    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id in request body to upload a music file.' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate folder if provided
    if (folder_id) {
      const folder = await Folder.findOne({ _id: folder_id, clientId: targetClientId });
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found or not accessible by this client' });
      }
    }

    // Check for duplicate song name (case-insensitive) for the same client
    const songTitle = title || file.originalname;
    const existingSong = await MusicFile.findOne({
      clientId: targetClientId,
      title: { $regex: new RegExp(`^${songTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (existingSong) {
      // Clean up uploaded file if duplicate found
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.warn('Failed to delete duplicate file:', err);
        }
      }
      if (coverArtFile && coverArtFile.path && fs.existsSync(coverArtFile.path)) {
        try {
          fs.unlinkSync(coverArtFile.path);
        } catch (err) {
          console.warn('Failed to delete duplicate cover art:', err);
        }
      }
      
      return res.status(400).json({
        error: `A song with the name "${songTitle}" already exists. Please use a different name.`
      });
    }

    // Generate file URLs pointing to our serving endpoint
    // Include token in query string so audio elements can access files
    // file.filename is the saved filename (with unique suffix), file.originalname is the original
    const baseUrl = getBaseUrl(req);
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const fileUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(file.filename)}/stream/${tokenParam}`;
    
    // Handle cover art upload
    let coverArtUrl = null;
    if (coverArtFile) {
      coverArtUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(coverArtFile.filename)}/cover/${tokenParam}`;
    }
    
    // Parse duration (should be in seconds, ensure it's a number)
    // If not provided, default to 0 (frontend should extract it)
    const parsedDuration = duration && !isNaN(Number(duration)) ? Math.max(0, Math.round(Number(duration))) : 0;

    const musicFile = new MusicFile({
      filename: file.originalname,
      fileSize: file.size,
      fileUrl,
      title: songTitle,
      artist: artist || 'Unknown',
      album: album || '',
      genre: genre || '',
      year: year ? parseInt(year) : null,
      duration: parsedDuration,
      coverArtUrl: coverArtUrl,
      clientId: targetClientId,
      uploadedById: req.user._id,
      folderId: folder_id || null,
      zoneId: zone_id || null,
      order: 0,
    });

    await musicFile.save();

    // Format response to match frontend expectations
    const fileObj = musicFile.toJSON ? musicFile.toJSON() : musicFile;
    const formattedFile = {
      id: fileObj._id || fileObj.id,
      name: fileObj.title || fileObj.filename,
      title: fileObj.title,
      artist: fileObj.artist || 'Unknown',
      album: fileObj.album || '',
      genre: fileObj.genre || '',
      year: fileObj.year || null,
      duration: fileObj.duration || 0,
      file_size: fileObj.fileSize || 0,
      file_url: fileObj.fileUrl || fileObj.file_url,
      url: fileObj.fileUrl || fileObj.file_url,
      cover_art: fileObj.coverArtUrl || fileObj.cover_art || null,
      cover_art_url: fileObj.coverArtUrl || fileObj.cover_art_url || null,
      folder_id: fileObj.folderId || fileObj.folder_id || null,
      folderId: fileObj.folderId || fileObj.folder_id || null,
      zone_id: fileObj.zoneId || fileObj.zone_id || null,
      zoneId: fileObj.zoneId || fileObj.zone_id || null,
      client_id: fileObj.clientId || fileObj.client_id || null,
      clientId: fileObj.clientId || fileObj.client_id || null,
      order: fileObj.order || 0,
      created_at: fileObj.createdAt || fileObj.created_at,
      updated_at: fileObj.updatedAt || fileObj.updated_at,
    };

    return res.status(201).json(formattedFile);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      detail: 'An error occurred during upload.'
    });
  }
});

// Get single music file
router.get('/files/:id/', authenticate, async (req, res) => {
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
        detail: 'You do not have permission to access this file.'
      });
    }

    return res.status(200).json(musicFile.toJSON());
  } catch (error) {
    console.error('Get music file error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

// Update music file
router.patch('/files/:id/', authenticate, async (req, res) => {
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
        detail: 'You do not have permission to update this file.'
      });
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
    return res.status(500).json({
      detail: 'An error occurred.'
    });
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
      title: { $regex: new RegExp(`^${newTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i') }
    });
    if (existing) {
      newTitle = `${newTitle} (copy)`;
    }
    // Build fileUrl: prefer the stable S3 streaming endpoint for S3 files
    const filename = musicFile.filename || (musicFile.s3Key ? path.basename(musicFile.s3Key) : '');
    const baseUrl = getBaseUrl(req);
    let fileUrl;
    if (musicFile.s3Key) {
      // S3 file — use wildcard stream endpoint (generates fresh presigned URL per request)
      fileUrl = `${baseUrl}/api/v1/music/files/stream/${musicFile.s3Key}/`;
    } else if (filename) {
      // Legacy local file
      fileUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(filename)}/stream/`;
    } else {
      fileUrl = musicFile.fileUrl || '';
    }
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
router.post('/files/:id/upload_cover_art/', authenticate, imageUpload.single('cover_art'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const musicFile = await MusicFile.findById(req.params.id);

    if (!musicFile) {
      return res.status(404).json({ detail: 'Music file not found.' });
    }

    const effectiveClient = getEffectiveClient(req);

    if (musicFile.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to update this music file.' });
    }

    // Upload to S3 for persistence (online only)
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { S3Client } = require('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    const s3Key = `music/covers/${musicFile._id}-${Date.now()}-${req.file.filename}`;
    
    // Read file and upload to S3
    const fileContent = fs.readFileSync(req.file.path);
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: req.file.mimetype,
    });
    
    await s3Client.send(putCommand);
    
    // Clean up local file (online only, no local storage)
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.warn('Failed to delete local file:', err);
    }
    
    // Generate URL for the cover image (will use presigned URL when accessed)
    const baseUrl = getBaseUrl(req);
    const coverArtUrl = `${baseUrl}/api/v1/music/files/${musicFile._id}/cover/`;

    musicFile.coverArtUrl = coverArtUrl;
    musicFile.coverArtS3Key = s3Key;
    await musicFile.save();

    const obj = musicFile.toJSON ? musicFile.toJSON() : musicFile;
    return res.status(200).json({
      id: obj._id || obj.id,
      cover_art_url: obj.coverArtUrl,
      coverArtUrl: obj.coverArtUrl,
    });
  } catch (error) {
    console.error('Upload cover art error:', error);
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

// Handle CORS preflight for file streaming (local filename-based endpoint)
router.options('/files/:filename/stream/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Authorization');
  res.sendStatus(200);
});

// Handle CORS preflight for S3 stream endpoint (wildcard — matches keys with slashes)
router.options('/files/stream/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Authorization');
  res.sendStatus(200);
});

// Serve music file by filename (for streaming/playback)
// Use optional auth so audio elements can access files via token in query string
router.get('/files/:filename/stream/', optionalAuthenticate, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);

    // Find the music file in database to check permissions and get S3 key
    const musicFile = await MusicFile.findOne({ 
      $or: [
        { fileUrl: { $regex: filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } },
        { filename: filename }
      ]
    });
    
    if (!musicFile) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      return res.status(404).json({
        detail: 'File not found in database.'
      });
    }

    // If we have a user from auth, check permissions
    if (req.user) {
      const effectiveClient = getEffectiveClient(req);
      // Check access - only if user is authenticated
      if (req.user.role !== 'admin' && musicFile.clientId !== effectiveClient) {
        res.header('Access-Control-Allow-Origin', '*');
        return res.status(403).json({
          detail: 'You do not have permission to access this file.'
        });
      }
    } else {
      // No auth token provided - for development, allow access
      console.warn(`File access without authentication: ${filename}`);
    }

    // If file is stored in S3, generate a presigned URL for direct access
    if (musicFile.s3Key) {
      try {
        // Generate presigned URL for direct S3 access (valid for 1 hour)
        const presignedUrl = await getPresignedDownloadUrl(musicFile.s3Key, 3600);
        
        // Redirect to the presigned URL - this is more reliable than proxying
        // and avoids timeout issues with large files
        return res.redirect(302, presignedUrl);
      } catch (s3Error) {
        console.error('S3 presigned URL generation error:', s3Error);
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        return res.status(500).json({
          detail: 'Error generating S3 access URL.'
        });
      }
    }

    // Fallback to local file system
    const filePath = path.join(musicDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath} (looking in ${musicDir})`);
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      return res.status(404).json({
        detail: 'File not found. Files uploaded locally are not available in Lambda. Please re-upload files through the deployed API.',
        path: filePath,
        musicDir: musicDir
      });
    }

    // Set appropriate headers for audio streaming
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Determine content type from file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.mp3': 'audio/mpeg',
      '.mpeg': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg';

    if (range) {
      // Handle range requests for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*', // Allow CORS for audio elements
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*', // Allow CORS for audio elements
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    // Ensure CORS headers on error responses
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.status(500).json({
      detail: 'An error occurred while streaming the file.'
    });
  }
});

// Stream music file by S3 key (for S3-uploaded files)
// IMPORTANT: Uses wildcard (*) because API Gateway HTTP API decodes %2F → /
// before it reaches Lambda, so ":s3Key" would only capture the first path segment.
// With wildcard, the full S3 key (e.g. "client/zone/music/folder/file.mp3") is
// captured across all path segments via req.params[0].
router.get('/files/stream/*', optionalAuthenticate, async (req, res) => {
  // Set CORS headers on every response from this handler
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range, Authorization');

  try {
    // req.params[0] is everything after /files/stream/
    // Strip any trailing slash that was part of the original URL format
    const rawKey = (req.params[0] || '').replace(/\/$/, '');

    // The key may still have encoded characters in non-slash positions — decode them
    const s3Key = decodeURIComponent(rawKey);

    if (!s3Key) {
      return res.status(400).json({ detail: 'No S3 key provided' });
    }

    console.log(`[Stream] Request for S3 key: "${s3Key}"`);

    // -----------------------------------------------------------------------
    // Fast path: skip DB lookup and generate a presigned URL directly.
    // This works as long as the key actually exists in S3 and the Lambda role
    // has s3:GetObject permission. Avoids DB round-trip and all the lookup
    // fallback chains that were causing intermittent failures.
    // -----------------------------------------------------------------------
    try {
      const presignedUrl = await getPresignedDownloadUrl(s3Key, 3600);
      console.log(`[Stream] Redirecting to presigned S3 URL for key: "${s3Key}"`);
      // 302 redirect — browser / mobile player follows it directly to S3.
      // S3 handles range requests natively so seeking works out of the box.
      return res.redirect(302, presignedUrl);
    } catch (s3DirectError) {
      // Presigned URL generation failed (wrong key, missing object, IAM issue).
      // Fall through to DB-based lookup so we can surface a better error.
      console.warn(`[Stream] Direct S3 presign failed for "${s3Key}": ${s3DirectError.message}`);
    }

    // -----------------------------------------------------------------------
    // Fallback: look up by stored s3Key in the DB, try several variations.
    // -----------------------------------------------------------------------
    let musicFile = null;

    // 1. Exact match
    musicFile = await MusicFile.findOne({ s3Key });

    // 2. Encoded/decoded variants (handles any remaining encoding differences)
    if (!musicFile) {
      const variations = [
        encodeURIComponent(s3Key),
        s3Key.replace(/\//g, '%2F'),
      ];
      for (const variant of variations) {
        musicFile = await MusicFile.findOne({ s3Key: variant });
        if (musicFile) break;
      }
    }

    // 3. Filename-based match (last segment of the key)
    if (!musicFile) {
      const filename = s3Key.split('/').pop();
      if (filename) {
        musicFile = await MusicFile.findOne({
          $or: [
            { filename },
            { s3Key: { $regex: `${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$` } },
          ],
        });
      }
    }

    if (!musicFile) {
      console.error(`[Stream] File not found for S3 key: "${s3Key}"`);
      return res.status(404).json({
        detail: 'File not found. The S3 key does not exist or cannot be accessed.',
        s3Key,
      });
    }

    console.log(`[Stream] Found DB record: ${musicFile._id}, s3Key: ${musicFile.s3Key}`);

    // Permission check (only when a valid auth token was sent)
    if (req.user) {
      const effectiveClient = getEffectiveClient(req);
      if (req.user.role !== 'admin' && musicFile.clientId !== effectiveClient) {
        return res.status(403).json({ detail: 'Access denied' });
      }
    }

    // Use the s3Key stored in the DB (most reliable) for the presigned URL
    const actualKey = musicFile.s3Key || s3Key;
    try {
      const presignedUrl = await getPresignedDownloadUrl(actualKey, 3600);
      return res.redirect(302, presignedUrl);
    } catch (s3Error) {
      console.error(`[Stream] Failed to generate presigned URL for stored key "${actualKey}":`, s3Error.message);
      return res.status(500).json({ detail: 'Failed to generate S3 download URL' });
    }
  } catch (error) {
    console.error('[Stream] Unexpected error:', error);
    return res.status(500).json({ detail: 'Streaming failed' });
  }
});

// Serve cover art by filename (legacy - for old files)
router.get('/files/:filename/cover/', optionalAuthenticate, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(coversDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        detail: 'Cover image not found.'
      });
    }

    // Set appropriate headers for image
    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }[ext] || 'image/jpeg';

    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Cover image error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

// Serve cover art by music file ID (new - uses S3)
router.get('/files/:id/cover/', optionalAuthenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);

    if (!musicFile) {
      return res.status(404).json({
        detail: 'Music file not found.'
      });
    }

    // Use S3 presigned URL (online only - no local fallback)
    if (musicFile.coverArtS3Key) {
      try {
        const presignedUrl = await getPresignedDownloadUrl(musicFile.coverArtS3Key, 3600);
        
        // Redirect to presigned URL (valid for 1 hour)
        return res.redirect(302, presignedUrl);
      } catch (s3Error) {
        console.error('Failed to generate presigned URL for cover image:', s3Error);
        // If presigned URL generation fails, try streaming directly as fallback
        try {
          const s3Stream = await streamFile(musicFile.coverArtS3Key);
          if (s3Stream) {
            const ext = path.extname(musicFile.coverArtS3Key).toLowerCase();
            const contentType = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
            }[ext] || 'image/jpeg';

            res.writeHead(200, {
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
              'Cache-Control': 'public, max-age=31536000',
            });
            s3Stream.pipe(res);
            return;
          }
        } catch (streamError) {
          console.error('S3 stream also failed:', streamError.message);
          return res.status(500).json({ 
            detail: 'Failed to retrieve cover image from S3. Please check AWS permissions.',
            error: streamError.message 
          });
        }
      }
    }

    // Fallback to legacy filename-based serving if no S3 key
    if (musicFile.coverArtUrl) {
      const urlParts = musicFile.coverArtUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (filename && filename !== 'cover/') {
        const filePath = path.join(coversDir, filename);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          const ext = path.extname(filename).toLowerCase();
          const contentType = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
          }[ext] || 'image/jpeg';

          res.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
          });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }
    }

    return res.status(404).json({
      detail: 'Cover image not found.'
    });
  } catch (error) {
    console.error('Cover image error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// ============================================================================
// FOLDERS
// ============================================================================

// Get all folders
router.get('/folders/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    let query = {};

    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating: show all folders
      query = {};
    } else if (effectiveClient) {
      // Filter by effective client
      query.clientId = effectiveClient;
    } else {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Filter by zone if provided
    if (req.query.zone) {
      query.zoneId = req.query.zone;
    }

    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const folders = await Folder.find(query)
      .sort({ name: 1 })
      .lean();

    // Format response
    const formattedFolders = folders.map(folder => ({
      id: folder._id,
      name: folder.name,
      description: folder.description || '',
      type: folder.type,
      client_id: folder.clientId,
      zone_id: folder.zoneId || null,
      parent_id: folder.parentId || null,
      cover_image: folder.coverImage || null,
      cover_image_url: folder.coverImage || null, // In production, generate signed URL
      is_system: folder.isSystem || false,
      created_by: folder.createdBy || null,
      created_at: folder.createdAt,
      updated_at: folder.updatedAt,
    }));

    res.json(formattedFolders);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Get single folder
router.get('/folders/:id/', authenticate, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id).lean();

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check access
    const effectiveClient = getEffectiveClient(req);
    if (req.user.role !== 'admin' && folder.clientId !== effectiveClient) {
      return res.status(403).json({ error: 'You do not have permission to access this folder' });
    }

    res.json({
      id: folder._id,
      name: folder.name,
      description: folder.description || '',
      type: folder.type,
      client_id: folder.clientId,
      zone_id: folder.zoneId || null,
      parent_id: folder.parentId || null,
      cover_image: folder.coverImage || null,
      cover_image_url: folder.coverImage || null,
      is_system: folder.isSystem || false,
      created_by: folder.createdBy || null,
      created_at: folder.createdAt,
      updated_at: folder.updatedAt,
    });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// Create folder (with optional cover image)
router.post('/folders/', authenticate, imageUpload.single('cover_image'), async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'music',
      zone_id,
      parent_id,
      client_id,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      // Admin not impersonating, must provide client_id
      targetClientId = client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id in request body to create a folder.' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate zone if provided
    if (zone_id) {
      const Zone = require('../models/Zone');
      const zone = await Zone.findOne({ _id: zone_id, clientId: targetClientId });
      if (!zone) {
        return res.status(400).json({ error: 'Zone not found or not accessible by this client' });
      }
    }

    // Handle cover image upload
    let coverImageUrl = null;
    if (req.file) {
      const baseUrl = getBaseUrl(req);
      const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      coverImageUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(req.file.filename)}/cover/${tokenParam}`;
    }

    // Create folder
    const folder = new Folder({
      name,
      description: description || '',
      type,
      clientId: targetClientId,
      zoneId: zone_id || null,
      parentId: parent_id || null,
      coverImage: coverImageUrl,
      createdBy: req.user._id,
    });

    await folder.save();

    res.status(201).json({
      id: folder._id,
      name: folder.name,
      description: folder.description || '',
      type: folder.type,
      client_id: folder.clientId,
      zone_id: folder.zoneId || null,
      parent_id: folder.parentId || null,
      cover_image: folder.coverImage || null,
      cover_image_url: folder.coverImage || null,
      is_system: folder.isSystem || false,
      created_by: folder.createdBy || null,
      created_at: folder.createdAt,
      updated_at: folder.updatedAt,
    });
  } catch (error) {
    console.error('Create folder error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A folder with this name already exists for this client and zone.' });
    }
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update folder (with optional cover image)
router.patch('/folders/:id/', authenticate, imageUpload.single('cover_image'), async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check access
    const effectiveClient = getEffectiveClient(req);
    if (req.user.role !== 'admin' && folder.clientId !== effectiveClient) {
      return res.status(403).json({ error: 'You do not have permission to update this folder' });
    }

    // Update fields
    if (req.body.name !== undefined) folder.name = req.body.name;
    if (req.body.description !== undefined) folder.description = req.body.description;
    if (req.body.type !== undefined) folder.type = req.body.type;
    if (req.body.zone_id !== undefined) folder.zoneId = req.body.zone_id || null;
    if (req.body.parent_id !== undefined) folder.parentId = req.body.parent_id || null;

    // Handle cover image upload
    if (req.file) {
      const baseUrl = getBaseUrl(req);
      folder.coverImage = `${baseUrl}/api/v1/music/files/${req.file.filename}/cover/`;
    } else if (req.body.cover_image === null || req.body.cover_image === '') {
      // Allow removing cover image
      folder.coverImage = null;
    }

    await folder.save();

    res.json({
      id: folder._id,
      name: folder.name,
      description: folder.description || '',
      type: folder.type,
      client_id: folder.clientId,
      zone_id: folder.zoneId || null,
      parent_id: folder.parentId || null,
      cover_image: folder.coverImage || null,
      cover_image_url: folder.coverImage || null,
      is_system: folder.isSystem || false,
      created_by: folder.createdBy || null,
      created_at: folder.createdAt,
      updated_at: folder.updatedAt,
    });
  } catch (error) {
    console.error('Update folder error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A folder with this name already exists for this client and zone.' });
    }
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
router.delete('/folders/:id/', authenticate, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check access
    const effectiveClient = getEffectiveClient(req);
    if (req.user.role !== 'admin' && folder.clientId !== effectiveClient) {
      return res.status(403).json({ error: 'You do not have permission to delete this folder' });
    }

    // Check if folder has music files
    const filesCount = await MusicFile.countDocuments({ folderId: folder._id });
    if (filesCount > 0) {
      return res.status(400).json({ error: `Cannot delete folder with ${filesCount} file(s). Please delete files first.` });
    }

    await Folder.deleteOne({ _id: folder._id });
    res.status(204).send();
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

module.exports = router;
