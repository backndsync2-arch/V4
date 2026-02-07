const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const floorSchema = new mongoose.Schema({
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
  clientId: {
    type: String,
    required: true,
    ref: 'Client',
    index: true,
  },
  is_premium: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdById: {
    type: String,
    ref: 'User',
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

// Compound index for unique floor name per client
floorSchema.index({ clientId: 1, name: 1 }, { unique: true });

// Virtual for zones count
floorSchema.virtual('zones_count', {
  ref: 'Zone',
  localField: '_id',
  foreignField: 'floorId',
  count: true,
});

// Virtual for devices count (through zones)
floorSchema.virtual('devices_count', {
  ref: 'Device',
  localField: '_id',
  foreignField: 'zoneId',
  count: true,
});

// Virtual for created by name
floorSchema.virtual('created_by_name', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
  select: 'name',
});

floorSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Floor', floorSchema);

