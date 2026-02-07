const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const clientSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  businessName: String,
  email: {
    type: String,
    required: true,
    index: true,
  },
  telephone: String,
  description: String,
  subscriptionTier: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    default: 'basic',
    index: true,
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'trial'],
    default: 'trial',
    index: true,
  },
  subscriptionPrice: {
    type: Number,
    default: 0,
  },
  subscriptionStart: Date,
  subscriptionEnd: Date,
  trialDays: {
    type: Number,
    default: 14,
  },
  trialEndsAt: Date,
  stripeCustomerId: {
    type: String,
    index: true,
  },
  stripeSubscriptionId: String,
  premiumFeatures: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  maxDevices: {
    type: Number,
    default: 5,
  },
  maxStorageGB: {
    type: Number,
    default: 10,
  },
  maxFloors: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
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

module.exports = mongoose.model('Client', clientSchema);

