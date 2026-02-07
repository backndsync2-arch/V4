const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MusicFile = require('../models/MusicFile');
const Folder = require('../models/Folder');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const musicDir = path.join(uploadsDir, 'music');
const coversDir = path.join(uploadsDir, 'covers');

[uploadsDir, musicDir, coversDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads - save to disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    fileSize: 100 * 1024 * 1024, // 100MB
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
    const formattedFiles = musicFiles.map(f => {
      const fileObj = f.toJSON ? f.toJSON() : f;
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

// Upload music file (with optional cover art)
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

    const { title, artist, album, genre, year, folder_id, zone_id, client_id } = req.body;
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

    // Generate file URLs pointing to our serving endpoint
    // Include token in query string so audio elements can access files
    // file.filename is the saved filename (with unique suffix), file.originalname is the original
    const baseUrl = req.protocol + '://' + req.get('host');
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const fileUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(file.filename)}/stream/${tokenParam}`;
    
    // Handle cover art upload
    let coverArtUrl = null;
    if (coverArtFile) {
      coverArtUrl = `${baseUrl}/api/v1/music/files/${encodeURIComponent(coverArtFile.filename)}/cover/${tokenParam}`;
    }
    
    // Extract duration from file (simplified - in production use a library like node-ffmpeg)
    // For now, set to 0 - frontend can extract it from metadata
    const duration = 0; // TODO: Extract actual duration using music-metadata or similar

    const musicFile = new MusicFile({
      filename: file.originalname,
      fileSize: file.size,
      fileUrl,
      title: title || file.originalname,
      artist: artist || 'Unknown',
      album: album || '',
      genre: genre || '',
      year: year ? parseInt(year) : null,
      duration,
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
    if (title !== undefined) musicFile.title = title;
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

// Handle CORS preflight for file streaming
router.options('/files/:filename/stream/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.sendStatus(200);
});

// Serve music file by filename (for streaming/playback)
// Use optional auth so audio elements can access files via token in query string
router.get('/files/:filename/stream/', optionalAuthenticate, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(musicDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        detail: 'File not found.'
      });
    }

    // Find the music file in database to check permissions
    // The fileUrl contains the filename, so we search for it
    const musicFile = await MusicFile.findOne({ 
      fileUrl: { $regex: filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } 
    });
    
    // If we have a user from auth, check permissions
    if (musicFile && req.user) {
      const effectiveClient = getEffectiveClient(req);
      // Check access - only if user is authenticated
      if (req.user.role !== 'admin' && musicFile.clientId !== effectiveClient) {
        return res.status(403).json({
          detail: 'You do not have permission to access this file.'
        });
      }
    } else if (musicFile && !req.user) {
      // No auth token provided - for development, allow access
      // In production, you might want to require auth
      console.warn(`File access without authentication: ${filename}`);
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
    return res.status(500).json({
      detail: 'An error occurred.'
    });
  }
});

// Serve cover art by filename
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
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Cover image error:', error);
    return res.status(500).json({
      detail: 'An error occurred.'
    });
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
      const baseUrl = req.protocol + '://' + req.get('host');
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
      const baseUrl = req.protocol + '://' + req.get('host');
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

