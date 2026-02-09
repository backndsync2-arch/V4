const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {string} options.action - Action performed (e.g., 'create', 'update', 'delete', 'login', 'logout')
 * @param {string} options.resourceType - Type of resource (e.g., 'user', 'client', 'music_file', 'announcement')
 * @param {string} [options.resourceId] - ID of the resource
 * @param {Object} options.user - User object from req.user
 * @param {string} [options.clientId] - Client ID (from user or request)
 * @param {Object} [options.details] - Additional details about the action
 * @param {Object} [options.changes] - Object with before/after changes
 * @param {string} [options.status] - 'success', 'failure', or 'error'
 * @param {string} [options.errorMessage] - Error message if status is 'failure' or 'error'
 * @param {Object} [options.req] - Express request object (for IP and user agent)
 */
async function logAuditEvent({
  action,
  resourceType,
  resourceId = null,
  user,
  clientId = null,
  details = {},
  changes = null,
  status = 'success',
  errorMessage = null,
  req = null,
}) {
  try {
    const auditLog = new AuditLog({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: user._id || user.id,
      user_email: user.email,
      user_name: user.name,
      client_id: clientId || user.clientId || null,
      ip_address: req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip) : null,
      user_agent: req ? req.headers['user-agent'] : null,
      details,
      changes,
      status,
      error_message: errorMessage,
    });

    await auditLog.save();
  } catch (error) {
    // Don't throw error - audit logging should not break the main flow
    console.error('Failed to create audit log:', error);
  }
}

module.exports = { logAuditEvent };


