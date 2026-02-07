const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const folderSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['music', 'announcements'],
    default: 'music',
    index: true,
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true,
    index: true,
  },
  zoneId: {
    type: String,
    ref: 'Zone',
    index: true,
  },
  parentId: {
    type: String,
    ref: 'Folder',
    default: null,
  },
  coverImage: {
    type: String, // URL to cover image
    default: null,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: String,
    ref: 'User',
    default: null,
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

// Compound index for unique folder names per client, zone, and type
folderSchema.index({ clientId: 1, zoneId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);

