const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const auditLogSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource_type: {
    type: String,
    required: true,
    index: true,
  },
  resource_id: {
    type: String,
    index: true,
  },
  user_id: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  user_email: {
    type: String,
    index: true,
  },
  user_name: {
    type: String,
  },
  client_id: {
    type: String,
    ref: 'Client',
    index: true,
  },
  ip_address: {
    type: String,
  },
  user_agent: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success',
    index: true,
  },
  error_message: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
  _id: false,
});

// Index for common queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user_id: 1, createdAt: -1 });
auditLogSchema.index({ client_id: 1, createdAt: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);




