const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['client', 'floor_user', 'staff', 'admin'],
    default: 'client',
    index: true,
  },
  clientId: {
    type: String,
    ref: 'Client',
    index: true,
  },
  floorId: {
    type: String,
    ref: 'Floor',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isStaff: {
    type: Boolean,
    default: false,
  },
  isSuperuser: {
    type: Boolean,
    default: false,
  },
  avatar: String,
  phone: String,
  timezone: {
    type: String,
    default: 'UTC',
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastSeen: Date,
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

