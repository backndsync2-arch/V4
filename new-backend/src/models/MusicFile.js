const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const musicFileSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  filename: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    index: true,
  },
  artist: {
    type: String,
    index: true,
  },
  album: String,
  genre: String,
  year: Number,
  duration: {
    type: Number, // seconds
    required: true,
  },
  coverArtUrl: String,
  folderId: {
    type: String,
    ref: 'Folder',
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
  uploadedById: {
    type: String,
    ref: 'User',
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

module.exports = mongoose.model('MusicFile', musicFileSchema);

