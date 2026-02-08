const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const announcementSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  title: {
    type: String,
    required: true,
    index: true,
  },
  text: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    sparse: true,
  },
  duration: {
    type: Number, // seconds
    default: 0,
  },
  voice: {
    type: String,
    default: 'fable', // Default to fable (UK English)
  },
  provider: {
    type: String,
    default: 'elevenlabs', // TTS provider
  },
  coverArtUrl: {
    type: String,
    default: null,
  },
  coverArtS3Key: {
    type: String,
    sparse: true,
  },
  folderId: {
    type: String,
    ref: 'Folder',
    index: true,
  },
  category: {
    type: String, // Alias for folderId for backward compatibility
    index: true,
  },
  zoneId: {
    type: String,
    ref: 'Zone',
    index: true,
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true,
    index: true,
  },
  createdById: {
    type: String,
    ref: 'User',
  },
  isRecording: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
    index: true,
  },
  order: {
    type: Number,
    default: 0,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  _id: false,
});

// Index for common queries
announcementSchema.index({ clientId: 1, zoneId: 1 });
announcementSchema.index({ clientId: 1, folderId: 1 });
announcementSchema.index({ clientId: 1, enabled: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);

