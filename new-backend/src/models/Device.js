const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const deviceSchema = new mongoose.Schema({
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
  device_type: {
    type: String,
    default: 'speaker',
    enum: ['speaker', 'tablet', 'display', 'other'],
  },
  device_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  model: {
    type: String,
    default: '',
  },
  firmware_version: {
    type: String,
    default: '',
  },
  ip_address: {
    type: String,
    default: null,
  },
  last_seen: {
    type: Date,
    default: null,
    index: true,
  },
  is_online: {
    type: Boolean,
    default: false,
    index: true,
  },
  volume: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  zoneId: {
    type: String,
    required: true,
    ref: 'Zone',
    index: true,
  },
  clientId: {
    type: String,
    required: true,
    ref: 'Client',
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
  _id: false, // Use custom _id
});

// Virtual for zone name
deviceSchema.virtual('zone_name', {
  ref: 'Zone',
  localField: 'zoneId',
  foreignField: '_id',
  justOne: true,
  select: 'name',
});

// Virtual for floor name (through zone)
deviceSchema.virtual('floor_name', {
  ref: 'Zone',
  localField: 'zoneId',
  foreignField: '_id',
  justOne: true,
  select: 'floorId',
});

deviceSchema.methods.updateHeartbeat = function() {
  this.last_seen = new Date();
  this.is_online = true;
  return this.save();
};

deviceSchema.methods.markOffline = function(timeoutMinutes = 5) {
  if (this.last_seen) {
    const timeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    const now = new Date();
    if (now - this.last_seen > timeout) {
      this.is_online = false;
      return this.save();
    }
  }
  return Promise.resolve(this);
};

deviceSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Device', deviceSchema);

