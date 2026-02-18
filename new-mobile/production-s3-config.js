// PRODUCTION-READY S3-ONLY STORAGE CONFIGURATION
// This file shows the required changes to make the system production-ready

// REQUIRED CHANGES TO music.js and announcements.js:

// 1. REMOVE LOCAL FILE SYSTEM FALLBACKS
// 2. FORCE ALL UPLOADS TO S3
// 3. USE PRESIGNED URLs FOR ALL FILE ACCESS

// REPLACE THE CURRENT FILE STORAGE LOGIC WITH THIS:

const express = require('express');
const { getPresignedUploadUrl, getPresignedDownloadUrl, streamFile, BUCKET_NAME } = require('../services/s3');

// PRODUCTION CONFIGURATION - FORCE S3 ONLY
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const FORCE_S3_UPLOAD = isProduction || process.env.FORCE_S3_UPLOAD === 'true';

// REMOVE ALL LOCAL FILE SYSTEM LOGIC IN PRODUCTION
// - No more uploads/ directory
// - No more fs.mkdirSync()
// - No more local file streaming
// - Everything goes to S3

// NEW UPLOAD LOGIC:
router.post('/files/upload/', authenticate, async (req, res) => {
  try {
    const { filename, contentType, fileSize, metadata } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    // ALWAYS use S3 in production
    if (FORCE_S3_UPLOAD) {
      // Generate unique S3 key
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `music/${timestamp}-${randomId}-${sanitizedFilename}`;
      
      // Generate presigned upload URL
      const uploadUrl = await getPresignedUploadUrl(s3Key, contentType, 3600);
      
      return res.status(200).json({
        uploadUrl,
        s3Key,
        expiresIn: 3600,
        message: 'Upload to S3 directly, then call /complete/ endpoint'
      });
    }
    
    // Development only - remove this in production
    // ... (local upload logic for dev only)
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ detail: 'Upload failed' });
  }
});

// NEW FILE STREAMING LOGIC:
router.get('/files/:id/stream/', authenticate, async (req, res) => {
  try {
    const musicFile = await MusicFile.findById(req.params.id);
    
    if (!musicFile) {
      return res.status(404).json({ detail: 'File not found' });
    }
    
    // Check permissions
    const effectiveClient = getEffectiveClient(req);
    if (req.user.role !== 'admin' && musicFile.clientId !== effectiveClient) {
      return res.status(403).json({ detail: 'Access denied' });
    }
    
    // PRODUCTION: Always stream from S3
    if (FORCE_S3_UPLOAD && musicFile.s3Key) {
      try {
        // Generate presigned download URL
        const downloadUrl = await getPresignedDownloadUrl(musicFile.s3Key, 3600);
        
        // Redirect to S3 presigned URL
        return res.redirect(302, downloadUrl);
      } catch (s3Error) {
        console.error('S3 presigned URL error:', s3Error);
        return res.status(500).json({ detail: 'Failed to generate download URL' });
      }
    }
    
    // Development fallback - remove in production
    // ... (local streaming logic for dev only)
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(500).json({ detail: 'Streaming failed' });
  }
});

// DATABASE MIGRATION HELPER:
async function migrateLocalFilesToS3() {
  if (!FORCE_S3_UPLOAD) return;
  
  console.log('🔄 Migrating local files to S3...');
  
  try {
    // Find all files with local paths but no S3 keys
    const localFiles = await MusicFile.find({
      $or: [
        { s3Key: { $exists: false } },
        { s3Key: null },
        { s3Key: '' }
      ]
    });
    
    console.log(`Found ${localFiles.length} files to migrate`);
    
    for (const file of localFiles) {
      try {
        // Read local file and upload to S3
        const localPath = path.join(__dirname, '../../uploads/music', file.filename);
        
        if (fs.existsSync(localPath)) {
          console.log(`Migrating: ${file.filename}`);
          
          // Generate S3 key
          const s3Key = `music/migrated/${Date.now()}-${file.filename}`;
          
          // Upload to S3
          const fileContent = fs.readFileSync(localPath);
          await uploadToS3(s3Key, fileContent, 'audio/mpeg');
          
          // Update database
          file.s3Key = s3Key;
          file.fileUrl = null; // Remove local URL
          await file.save();
          
          console.log(`✅ Migrated: ${file.filename} -> ${s3Key}`);
        } else {
          console.log(`⚠️  File not found locally: ${file.filename}`);
        }
      } catch (error) {
        console.error(`❌ Migration failed for ${file.filename}:`, error);
      }
    }
    
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// ENVIRONMENT VARIABLES NEEDED:
// FORCE_S3_UPLOAD=true
// S3_BUCKET_NAME=your-bucket-name
// AWS_REGION=us-east-1
// NODE_ENV=production

module.exports = { migrateLocalFilesToS3 };