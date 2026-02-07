/**
 * Utility functions for middleware
 */

/**
 * Get the effective client ID for the current request.
 * Handles admin impersonation and user client associations.
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - Client ID or null
 */
const getEffectiveClient = (req) => {
  // Check for impersonation header (case-insensitive)
  const impersonatingClientId = req.headers['x-impersonate-client'] || 
                                req.headers['X-Impersonate-Client'] ||
                                req.headers['X-IMPERSONATE-CLIENT'];
  
  if (impersonatingClientId && req.user.role === 'admin') {
    return impersonatingClientId;
  }
  // Admin doesn't need a client - can work without one
  if (req.user.role === 'admin') {
    return null; // Admin can work without client
  }
  return req.user.clientId;
};

module.exports = { getEffectiveClient };

