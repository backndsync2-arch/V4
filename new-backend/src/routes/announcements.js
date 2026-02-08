const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Announcement = require('../models/Announcement');
const Folder = require('../models/Folder');
const VoicePreview = require('../models/VoicePreview');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { getEffectiveClient } = require('../middleware/utils');
const { getPresignedUploadUrl, streamFile, BUCKET_NAME, deleteFile } = require('../services/s3');

const router = express.Router();

// Determine uploads directory - use /tmp in Lambda, otherwise local uploads
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const baseUploadsDir = isLambda ? '/tmp' : path.join(__dirname, '..', '..', 'uploads');
const announcementsDir = path.join(baseUploadsDir, 'announcements');

// Helper function to get base URL for file serving
const getBaseUrl = (req) => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
  return `${protocol}://${host}`;
};

// Lazy directory creation
const ensureDirectories = () => {
  const voicePreviewsDir = path.join(baseUploadsDir, 'voice-previews');
  [announcementsDir, voicePreviewsDir, coversDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        if (!isLambda) {
          console.error(`Failed to create directory ${dir}:`, error);
        }
      }
    }
  });
};

// Configure multer for announcement uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectories();
    cb(null, announcementsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 8.5 * 1024 * 1024, // 8.5MB
  },
  fileFilter: (req, file, cb) => {
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
const coversDir = path.join(baseUploadsDir, 'covers');
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirectories();
      cb(null, coversDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
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

// Get all announcements
router.get('/', authenticate, async (req, res) => {
  try {
    const effectiveClient = getEffectiveClient(req);
    const query = {};

    // Build query based on user role and effective client
    if (req.user.role === 'admin') {
      // Admin can see all announcements, or filter by client query param
      if (req.query.client) {
        query.clientId = req.query.client;
      }
      // If admin is impersonating, filter by that client
      if (effectiveClient) {
        query.clientId = effectiveClient;
      }
      // Otherwise, admin sees all (no clientId filter)
    } else {
      // Regular users only see their client's announcements
      if (effectiveClient) {
        query.clientId = effectiveClient;
      } else {
        // User has no client - return empty
        return res.status(200).json({ results: [], count: 0 });
      }
    }

    // Filter by zone if provided
    if (req.query.zone_id) {
      query.zoneId = req.query.zone_id;
    }

    // Filter by folder if provided
    if (req.query.folder_id) {
      query.folderId = req.query.folder_id;
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .limit(1000);

    // Format response
    const formatted = announcements.map(a => {
      const obj = a.toJSON ? a.toJSON() : a;
      return {
        id: obj._id || obj.id,
        title: obj.title,
        text: obj.text || '',
        file_url: obj.fileUrl,
        fileUrl: obj.fileUrl,
        duration: obj.duration || 0,
        voice: obj.voice || 'fable',
        provider: obj.provider || 'elevenlabs',
        folder_id: obj.folderId || obj.folder_id || obj.category || null,
        category: obj.folderId || obj.folder_id || obj.category || null,
        zone_id: obj.zoneId || obj.zone_id || null,
        zoneId: obj.zoneId || obj.zone_id || null,
        client_id: obj.clientId || obj.client_id || null,
        clientId: obj.clientId || obj.client_id || null,
        enabled: obj.enabled !== undefined ? obj.enabled : true,
        is_recording: obj.isRecording || false,
        cover_art_url: obj.coverArtUrl || null,
        coverArtUrl: obj.coverArtUrl || null,
        created_at: obj.createdAt || obj.created_at,
        updated_at: obj.updatedAt || obj.updated_at,
      };
    });

    return res.status(200).json({
      results: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Create TTS announcement
router.post('/tts/', authenticate, async (req, res) => {
  try {
    const { title, text, voice, folder_id, zone_id, client_id } = req.body;

    if (!title || !text) {
      return res.status(400).json({ detail: 'Title and text are required.' });
    }

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id.' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate folder if provided - must be an announcements folder
    if (folder_id) {
      const folder = await Folder.findOne({ _id: folder_id, clientId: targetClientId, type: 'announcements' });
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found or not accessible. Make sure it is an announcements folder.' });
      }
    }

    // For now, return a placeholder - TTS generation would require ElevenLabs API
    // In production, you'd call ElevenLabs API here to generate audio
    const baseUrl = getBaseUrl(req);
    const placeholderUrl = `${baseUrl}/api/v1/announcements/placeholder.mp3`;

    const announcement = new Announcement({
      title,
      text,
      fileUrl: placeholderUrl,
      duration: Math.ceil(text.length / 10), // Rough estimate: 10 chars per second
      voice: voice || 'fable',
      provider: 'elevenlabs',
      folderId: folder_id || null,
      category: folder_id || null, // For backward compatibility
      zoneId: zone_id || null,
      clientId: targetClientId,
      createdById: req.user._id,
      isRecording: false,
      enabled: true,
    });

    await announcement.save();

    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
    return res.status(201).json({
      id: obj._id || obj.id,
      title: obj.title,
      text: obj.text,
      file_url: obj.fileUrl,
      fileUrl: obj.fileUrl,
      duration: obj.duration,
      voice: obj.voice,
      folder_id: obj.folderId,
      category: obj.folderId,
      zone_id: obj.zoneId,
      client_id: obj.clientId,
      enabled: obj.enabled,
      cover_art_url: obj.coverArtUrl || null,
      coverArtUrl: obj.coverArtUrl || null,
      created_at: obj.createdAt,
      updated_at: obj.updatedAt,
    });
  } catch (error) {
    console.error('Create TTS announcement error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Upload announcement audio
router.post('/upload/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { title, folder_id, zone_id, is_recording, client_id } = req.body;

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id.' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate folder if provided - must be an announcements folder
    if (folder_id) {
      const folder = await Folder.findOne({ _id: folder_id, clientId: targetClientId, type: 'announcements' });
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found or not accessible. Make sure it is an announcements folder.' });
      }
    }

    const baseUrl = getBaseUrl(req);
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const fileUrl = `${baseUrl}/api/v1/announcements/files/${encodeURIComponent(req.file.filename)}/stream/${tokenParam}`;

    const announcement = new Announcement({
      title: title || req.file.originalname.replace(/\.[^/.]+$/, ''),
      text: '',
      fileUrl,
      duration: 0, // Would need to extract from file metadata
      voice: 'fable',
      provider: 'uploaded',
      folderId: folder_id || null,
      category: folder_id || null,
      zoneId: zone_id || null,
      clientId: targetClientId,
      createdById: req.user._id,
      isRecording: is_recording === 'true' || is_recording === true,
      enabled: true,
    });

    await announcement.save();

    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
    return res.status(201).json({
      id: obj._id || obj.id,
      title: obj.title,
      text: obj.text,
      file_url: obj.fileUrl,
      fileUrl: obj.fileUrl,
      duration: obj.duration,
      voice: obj.voice,
      folder_id: obj.folderId,
      category: obj.folderId,
      zone_id: obj.zoneId,
      client_id: obj.clientId,
      enabled: obj.enabled,
      is_recording: obj.isRecording,
      created_at: obj.createdAt,
      updated_at: obj.updatedAt,
    });
  } catch (error) {
    console.error('Upload announcement error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Serve cover image by announcement ID (from S3)
// This route must come before the generic /:id/ routes
router.get('/:id/cover/', optionalAuthenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        detail: 'Announcement not found.'
      });
    }

    // Try S3 first
    if (announcement.coverArtS3Key) {
      // Stream from S3
      const s3Stream = await streamFile(announcement.coverArtS3Key);
      if (s3Stream) {
        // Determine content type from S3 key extension
        const ext = path.extname(announcement.coverArtS3Key).toLowerCase();
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
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        });
        s3Stream.pipe(res);
        return;
      }
    }

    // Fallback to local storage if S3 fails or not available
    if (announcement.coverArtUrl) {
      const urlParts = announcement.coverArtUrl.split('/');
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

// Update announcement
router.patch('/:id/', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    const effectiveClient = getEffectiveClient(req);

    if (announcement.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to update this announcement.' });
    }

    const { title, text, voice, folder_id, zone_id, enabled } = req.body;

    if (title !== undefined) announcement.title = title;
    if (text !== undefined) announcement.text = text;
    if (voice !== undefined) announcement.voice = voice;
    if (folder_id !== undefined) {
      announcement.folderId = folder_id;
      announcement.category = folder_id; // For backward compatibility
    }
    if (zone_id !== undefined) announcement.zoneId = zone_id;
    if (enabled !== undefined) announcement.enabled = enabled;

    await announcement.save();

    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
    return res.status(200).json({
      id: obj._id || obj.id,
      title: obj.title,
      text: obj.text,
      file_url: obj.fileUrl,
      fileUrl: obj.fileUrl,
      duration: obj.duration,
      voice: obj.voice,
      folder_id: obj.folderId,
      category: obj.folderId,
      zone_id: obj.zoneId,
      client_id: obj.clientId,
      enabled: obj.enabled,
      cover_art_url: obj.coverArtUrl || null,
      coverArtUrl: obj.coverArtUrl || null,
      created_at: obj.createdAt,
      updated_at: obj.updatedAt,
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Upload cover image for announcement
router.post('/:id/upload_cover_art/', authenticate, imageUpload.single('cover_art'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    const effectiveClient = getEffectiveClient(req);

    if (announcement.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to update this announcement.' });
    }

    // Upload to S3 for persistence (online only)
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { S3Client } = require('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    const s3Key = `announcements/covers/${announcement._id}-${Date.now()}-${req.file.filename}`;
    
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
    const coverArtUrl = `${baseUrl}/api/v1/announcements/${announcement._id}/cover/`;

    announcement.coverArtUrl = coverArtUrl;
    announcement.coverArtS3Key = s3Key;
    await announcement.save();

    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
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

// Delete announcement
router.delete('/:id/', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    if (announcement.clientId !== req.user.clientId && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to delete this announcement.' });
    }

    // Delete file if in S3
    if (announcement.s3Key) {
      // Would need to implement deleteFile from s3 service
    } else {
      // Delete from local storage
      const filePath = path.join(announcementsDir, path.basename(announcement.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Announcement.deleteOne({ _id: req.params.id });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Regenerate TTS
router.post('/:id/regenerate_tts/', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    const effectiveClient = getEffectiveClient(req);

    if (announcement.clientId !== effectiveClient && req.user.role !== 'admin') {
      return res.status(403).json({ detail: 'You do not have permission to regenerate this announcement.' });
    }

    const { voice, provider } = req.body;

    if (voice) announcement.voice = voice;
    if (provider) announcement.provider = provider;

    // In production, call TTS API here
    // For now, just update the voice/provider
    await announcement.save();

    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
    return res.status(200).json({
      id: obj._id || obj.id,
      title: obj.title,
      text: obj.text,
      file_url: obj.fileUrl,
      fileUrl: obj.fileUrl,
      duration: obj.duration,
      voice: obj.voice,
      folder_id: obj.folderId,
      category: obj.folderId,
      zone_id: obj.zoneId,
      client_id: obj.clientId,
      enabled: obj.enabled,
      created_at: obj.createdAt,
      updated_at: obj.updatedAt,
    });
  } catch (error) {
    console.error('Regenerate TTS error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Recalculate duration
router.post('/:id/recalculate_duration/', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    // In production, would analyze the audio file to get actual duration
    // For now, return current duration
    const obj = announcement.toJSON ? announcement.toJSON() : announcement;
    return res.status(200).json({
      id: obj._id || obj.id,
      duration: obj.duration,
    });
  } catch (error) {
    console.error('Recalculate duration error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Play instant announcement
router.post('/:id/play_instant/', authenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ detail: 'Announcement not found.' });
    }

    const { device_ids, zone_ids } = req.body;

    // In production, would send playback command to devices/zones via WebSocket or API
    // For now, just return success
    return res.status(200).json({ message: 'Playback command sent.' });
  } catch (error) {
    console.error('Play instant error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Generate AI text using OpenAI
router.post('/generate-ai-text/', authenticate, async (req, res) => {
  try {
    const { topic, tone, key_points, quantity } = req.body;

    if (!topic || !tone || !quantity) {
      return res.status(400).json({ detail: 'Topic, tone, and quantity are required.' });
    }

    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ 
        detail: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    // Call OpenAI API
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: openaiKey });

      const toneDescriptions = {
        professional: 'professional and formal',
        friendly: 'warm and friendly',
        urgent: 'urgent and attention-grabbing',
        casual: 'casual and conversational',
      };

      const prompt = `Generate ${quantity} different announcement scripts about "${topic}". 
${key_points ? `Key points to include: ${key_points}` : ''}
Tone: ${toneDescriptions[tone] || tone}
Each script should be:
- 30-60 words long
- Suitable for audio announcement
- Clear and concise
- Engaging and appropriate for the ${tone} tone

Return as JSON array with format: [{"title": "Title", "text": "Script text"}, ...]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional announcement script writer. Return only valid JSON array, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0].message.content.trim();
      
      // Parse JSON response (handle markdown code blocks if present)
      let scripts;
      try {
        // Remove markdown code blocks if present
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        scripts = JSON.parse(cleaned);
      } catch (parseError) {
        // If parsing fails, try to extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scripts = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse OpenAI response as JSON');
        }
      }

      // Ensure scripts is an array
      if (!Array.isArray(scripts)) {
        scripts = [scripts];
      }

      // Limit to requested quantity
      scripts = scripts.slice(0, parseInt(quantity));

      return res.status(200).json({ scripts });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      // Fallback to placeholder if OpenAI fails
      const scripts = Array.from({ length: parseInt(quantity) || 1 }, (_, i) => ({
        title: `${topic} Announcement ${i + 1}`,
        text: `This is a ${tone} announcement about ${topic}. ${key_points || ''}`,
      }));
      return res.status(200).json({ scripts });
    }
  } catch (error) {
    console.error('Generate AI text error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Get TTS voices - only male and female, no neutral
router.get('/tts-voices/', authenticate, async (req, res) => {
  try {
    // Return list of available TTS voices - only male and female
    const voices = [
      { id: 'fable', name: 'Fable', gender: 'male', accent: 'UK English' },
      { id: 'echo', name: 'Echo', gender: 'male', accent: 'US English' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', accent: 'US English' },
      { id: 'nova', name: 'Nova', gender: 'female', accent: 'US English' },
      { id: 'onyx', name: 'Onyx', gender: 'male', accent: 'US English' },
      { id: 'alloy', name: 'Alloy', gender: 'female', accent: 'US English' },
    ];

    return res.status(200).json({ voices });
  } catch (error) {
    console.error('Get TTS voices error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Preview voice - generates or returns existing preview
router.post('/preview-voice/', authenticate, async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text || !voice) {
      return res.status(400).json({ detail: 'Text and voice are required.' });
    }

    const baseUrl = getBaseUrl(req);
    
    // Check if preview already exists in database
    let voicePreview = await VoicePreview.findOne({ voice });
    
    if (voicePreview) {
      // Preview exists, return its URL
      return res.status(200).json({ 
        preview_url: voicePreview.fileUrl,
        cached: true,
      });
    }

    // Preview doesn't exist, generate it using OpenAI TTS
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return res.status(500).json({ 
        detail: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: openaiKey });

      // Map voice IDs to OpenAI TTS voice names
      // Swapped fable and alloy voices
      const voiceMap = {
        'fable': 'alloy', // Swapped: fable uses alloy OpenAI voice (male)
        'alloy': 'nova', // Swapped: alloy uses nova OpenAI voice (female)
        'echo': 'echo',
        'shimmer': 'shimmer',
        'nova': 'nova',
        'onyx': 'onyx',
      };

      const openaiVoice = voiceMap[voice] || 'onyx';
      
      // Determine gender for icon mapping
      const genderMap = {
        'fable': 'male',
        'alloy': 'female', // Changed to female
        'echo': 'male',
        'shimmer': 'female',
        'nova': 'female',
        'onyx': 'male',
      };
      const gender = genderMap[voice] || 'male';

      // Generate audio using OpenAI TTS
      const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: openaiVoice,
        input: text || 'Hello, this is a voice preview. How does this sound?',
      });

      // Convert response to buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Save to local storage or S3
      const previewDir = path.join(baseUploadsDir, 'voice-previews');
      ensureDirectories(); // Ensure preview directory exists
      
      const filename = `${voice}-preview.mp3`;
      const filePath = path.join(previewDir, filename);
      
      // Write file to disk
      fs.writeFileSync(filePath, buffer);
      
      // Upload to S3 if in Lambda environment
      let fileUrl;
      let s3Key = null;
      
      if (isLambda || process.env.UPLOAD_TO_S3 === 'true') {
        // Upload to S3
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        
        s3Key = `voice-previews/${voice}-preview.mp3`;
        await s3Client.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: 'audio/mpeg',
        }));
        
        fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      } else {
        // Use local file URL - serve via the GET endpoint
        fileUrl = `${baseUrl}/api/v1/announcements/preview/${voice}`;
      }

      // Save to database
      voicePreview = new VoicePreview({
        voice,
        gender,
        fileUrl,
        s3Key,
        provider: 'openai',
        previewText: text || 'Hello, this is a voice preview. How does this sound?',
      });
      await voicePreview.save();

      return res.status(200).json({ 
        preview_url: fileUrl,
        cached: false,
        gender,
      });
    } catch (openaiError) {
      console.error('OpenAI TTS error:', openaiError);
      return res.status(500).json({ 
        detail: 'Failed to generate voice preview. Please check your OpenAI API key and try again.',
        error: openaiError.message,
      });
    }
  } catch (error) {
    console.error('Preview voice error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Batch create TTS announcements
router.post('/batch-tts/', authenticate, async (req, res) => {
  try {
    const { announcements, voice, folder_id, zone_id, client_id } = req.body;

    if (!announcements || !Array.isArray(announcements)) {
      return res.status(400).json({ detail: 'Announcements array is required.' });
    }

    const effectiveClient = getEffectiveClient(req);
    let targetClientId = effectiveClient;

    if (req.user.role === 'admin' && !effectiveClient) {
      targetClientId = client_id;
      if (!targetClientId) {
        return res.status(400).json({ error: 'Admin must provide client_id.' });
      }
    } else if (!targetClientId) {
      return res.status(400).json({ error: 'No client associated with this user' });
    }

    // Validate folder if provided
    if (folder_id) {
      const folder = await Folder.findOne({ _id: folder_id, clientId: targetClientId, type: 'announcements' });
      if (!folder) {
        return res.status(400).json({ error: 'Folder not found or not accessible. Make sure it is an announcements folder.' });
      }
    }

    const created = [];
    for (const ann of announcements) {
      // Validate individual folder_id if provided in announcement
      if (ann.folder_id) {
        const individualFolder = await Folder.findOne({ _id: ann.folder_id, clientId: targetClientId, type: 'announcements' });
        if (!individualFolder) {
          console.warn(`Folder ${ann.folder_id} not found for announcement "${ann.title}", skipping folder assignment`);
          ann.folder_id = null; // Remove invalid folder_id
        }
      }
      const announcement = new Announcement({
        title: ann.title,
        text: ann.text,
        fileUrl: `${getBaseUrl(req)}/api/v1/announcements/placeholder.mp3`,
        duration: Math.ceil(ann.text.length / 10),
        voice: ann.voice || voice || 'fable',
        provider: 'elevenlabs',
        folderId: ann.folder_id || folder_id || null,
        category: ann.folder_id || folder_id || null,
        zoneId: ann.zone_id || zone_id || null,
        clientId: ann.client_id || targetClientId,
        createdById: req.user._id,
        enabled: true,
      });
      await announcement.save();
      created.push(announcement);
    }

    const formatted = created.map(a => {
      const obj = a.toJSON ? a.toJSON() : a;
      return {
        id: obj._id || obj.id,
        title: obj.title,
        text: obj.text,
        file_url: obj.fileUrl,
        fileUrl: obj.fileUrl,
        duration: obj.duration,
        voice: obj.voice,
        folder_id: obj.folderId,
        category: obj.folderId,
        zone_id: obj.zoneId,
        client_id: obj.clientId,
        enabled: obj.enabled,
        created_at: obj.createdAt,
        updated_at: obj.updatedAt,
      };
    });

    return res.status(201).json({ announcements: formatted });
  } catch (error) {
    console.error('Batch TTS error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Generate templates
router.post('/generate-templates/', authenticate, async (req, res) => {
  try {
    const { category, quantity, tone } = req.body;

    // In production, would use AI to generate templates
    // For now, return placeholder templates
    const templates = Array.from({ length: quantity || 5 }, (_, i) => ({
      title: `${category || 'General'} Template ${i + 1}`,
      description: `A ${tone || 'professional'} ${category || 'general'} announcement template`,
      script: `This is a ${tone || 'professional'} announcement for ${category || 'general'} purposes.`,
      category: category || 'general',
      duration: 30,
      voiceType: 'fable',
    }));

    return res.status(200).json({
      templates,
      count: templates.length,
      category: category || 'general',
    });
  } catch (error) {
    console.error('Generate templates error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Get template folders
router.get('/templates/folders/', authenticate, async (req, res) => {
  try {
    // In production, would return actual template folders
    // For now, return empty array
    return res.status(200).json({ results: [], count: 0 });
  } catch (error) {
    console.error('Get template folders error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Serve cover image by announcement ID (from S3)
// This route must come before the generic /:id/ route
router.get('/:id/cover/', optionalAuthenticate, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        detail: 'Announcement not found.'
      });
    }

    // Use S3 presigned URL (works without GetObject permission on server)
    if (announcement.coverArtS3Key) {
      try {
        const { getPresignedDownloadUrl } = require('../services/s3');
        const presignedUrl = await getPresignedDownloadUrl(announcement.coverArtS3Key, 3600);
        
        // Redirect to presigned URL (valid for 1 hour)
        return res.redirect(302, presignedUrl);
      } catch (s3Error) {
        console.error('Failed to generate presigned URL:', s3Error);
        // If presigned URL generation fails, try streaming directly as fallback
        try {
          const s3Stream = await streamFile(announcement.coverArtS3Key);
          if (s3Stream) {
            const ext = path.extname(announcement.coverArtS3Key).toLowerCase();
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

// Serve preview audio file - handle both with and without .mp3 extension
// Use optional auth so audio elements can access it
router.get('/preview/:voice', optionalAuthenticate, async (req, res) => {
  try {
    let { voice } = req.params;
    
    // Remove .mp3 extension if present
    if (voice.endsWith('.mp3')) {
      voice = voice.replace('.mp3', '');
    }
    
    // Check if preview exists in database
    const voicePreview = await VoicePreview.findOne({ voice });
    
    if (!voicePreview) {
      // Preview doesn't exist - return 404 or trigger generation
      return res.status(404).json({ 
        detail: 'Voice preview not found. Please generate it first using POST /api/v1/announcements/preview-voice/',
        voice: voice,
      });
    }

    // Serve from S3 if s3Key is present
    if (voicePreview.s3Key) {
      const s3Stream = await streamFile(voicePreview.s3Key);
      if (s3Stream) {
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        });
        s3Stream.pipe(res);
        return;
      }
    }

    // Fallback to local storage
    const previewDir = path.join(baseUploadsDir, 'voice-previews');
    const filename = `${voice}-preview.mp3`;
    const filePath = path.join(previewDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        detail: 'Preview audio file not found.',
        voice: voice,
      });
    }

    // Serve the audio file
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Preview file error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

// Stream announcement file
router.get('/files/:filename/stream/', authenticate, async (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(announcementsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ detail: 'File not found.' });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'audio/mp4',
      '.aac': 'audio/aac',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg';

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
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
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(500).json({ detail: 'An error occurred.' });
  }
});

module.exports = router;

