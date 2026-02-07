const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const zoneSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  floorId: {
    type: String,
    ref: 'Floor',
    index: true,
  },
  clientId: {
    type: String,
    required: true,
    ref: 'Client',
    index: true,
  },
  default_volume: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  image: {
    type: String, // URL or path to image
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
  _id: false, // Use custom _id
});

// Compound index for unique zone name per client
zoneSchema.index({ clientId: 1, name: 1 }, { unique: true });

// Virtual for devices count
zoneSchema.virtual('devices_count', {
  ref: 'Device',
  localField: '_id',
  foreignField: 'zoneId',
  count: true,
});

// Virtual for floor name
zoneSchema.virtual('floor_name', {
  ref: 'Floor',
  localField: 'floorId',
  foreignField: '_id',
  justOne: true,
  select: 'name',
});

zoneSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Zone', zoneSchema);

