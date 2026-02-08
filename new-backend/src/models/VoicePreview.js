const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const voicePreviewSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  voice: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true,
    index: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    sparse: true,
  },
  provider: {
    type: String,
    default: 'openai',
  },
  previewText: {
    type: String,
    default: 'Hello, this is a voice preview. How does this sound?',
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

module.exports = mongoose.model('VoicePreview', voicePreviewSchema);

