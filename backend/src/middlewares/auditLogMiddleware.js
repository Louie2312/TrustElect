const auditLogModel = require('../models/auditLogModel');

/**
 * Create an audit log for the current request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const createAuditLog = (req, res, next) => {
  // Store the original end function
  const originalEnd = res.end;
  
  // Debug: Log that middleware is triggered
  console.log(`Audit middleware triggered for: ${req.method} ${req.originalUrl}`);
  
  // Override the end function to log after response is sent
  res.end = function(chunk, encoding) {
    // Restore the original end function
    res.end = originalEnd;
    
    // Call the original end function
    res.end(chunk, encoding);
    
    // Don't log for GET requests or audit log endpoints to avoid infinite loops
    if (req.method === 'GET' || req.originalUrl.startsWith('/api/audit-logs')) {
      console.log(`Skipping audit log for GET or audit-logs endpoint: ${req.originalUrl}`);
      return;
    }
    
    // Only log if authentication is present
    if (!req.user) {
      console.log(`Skipping audit log due to missing user authentication for: ${req.originalUrl}`);
      return;
    }
    
    try {
      // Extract user info
      const user_id = req.user.id;
      const user_email = req.user.email;
      const user_role = req.user.normalizedRole || req.user.role || 'Unknown';
      
      // Determine action based on HTTP method
      let action = req.method;
      
      // Extract entity type from URL path
      const urlParts = req.originalUrl.split('/').filter(Boolean);
      const apiIndex = urlParts.findIndex(part => part === 'api');
      const entity_type = urlParts[apiIndex + 1] || 'unknown';
      
      // Extract entity ID if present in URL
      let entity_id = null;
      
      // Try to get entity ID from the request URL path
      if (urlParts.length > apiIndex + 2 && !isNaN(urlParts[apiIndex + 2])) {
        entity_id = parseInt(urlParts[apiIndex + 2], 10);
      } else if (req.params && Object.keys(req.params).length > 0) {
        // Try to get first numeric parameter
        const numericParams = Object.values(req.params).filter(val => !isNaN(val));
        if (numericParams.length > 0) {
          entity_id = parseInt(numericParams[0], 10);
        }
      }
      
      // Get client IP address
      const ip_address = 
        req.headers['x-forwarded-for'] || 
        req.socket.remoteAddress || 
        'unknown';
      
      // Get user agent
      const user_agent = req.headers['user-agent'] || 'unknown';
      
      // Create a more specific action name based on the endpoint
      if (req.originalUrl.includes('login')) {
        action = 'LOGIN';
      } else if (req.originalUrl.includes('logout')) {
        action = 'LOGOUT';
      } else if (req.method === 'POST') {
        action = 'CREATE';
      } else if (req.method === 'PUT' || req.method === 'PATCH') {
        action = 'UPDATE';
      } else if (req.method === 'DELETE') {
        action = 'DELETE';
      }
      
      // Include special paths
      if (urlParts.includes('approve')) {
        action = 'APPROVE';
      } else if (urlParts.includes('reject')) {
        action = 'REJECT';
      } else if (urlParts.includes('restore')) {
        action = 'RESTORE';
      } else if (urlParts.includes('unlock')) {
        action = 'UNLOCK';
      } else if (urlParts.includes('reset-password')) {
        action = 'RESET_PASSWORD';
      } else if (urlParts.includes('vote')) {
        action = 'VOTE';
      }
      
      // Create details object with sanitized request body
      const details = {
        status: res.statusCode,
        endpoint: req.originalUrl,
      };
      
      // Only include body data for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && req.body) {
        const sanitizedBody = { ...req.body };
        
        // Remove sensitive fields
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.password_hash) sanitizedBody.password_hash = '[REDACTED]';
        if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
        if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[REDACTED]';
        if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
        
        details.request = sanitizedBody;
      }
      
      // Construct the log data
      const logData = {
        user_id,
        user_email,
        user_role,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        user_agent
      };
      
      console.log(`Creating audit log: ${action} on ${entity_type} by ${user_email} (${user_role})`);
      
      // Log asynchronously without awaiting completion
      auditLogModel.createAuditLog(logData)
        .then(log => {
          console.log(`Successfully created audit log ID: ${log.id}`);
        })
        .catch(err => {
          console.error('Failed to create audit log:', err);
        });
    } catch (error) {
      console.error('Error in audit log middleware:', error);
    }
  };
  
  next();
};

// Add a special action logger for direct use
const logAction = async (user, action, entityType, entityId, details = {}) => {
  try {
    if (!user || !user.id) {
      console.error('Cannot log action: Missing user information');
      return null;
    }
    
    const logData = {
      user_id: user.id,
      user_email: user.email || 'unknown',
      user_role: user.normalizedRole || user.role || 'Unknown',
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details,
      ip_address: 'direct-call',
      user_agent: 'system'
    };
    
    console.log(`Directly logging action: ${action} on ${entityType} by ${logData.user_email}`);
    const log = await auditLogModel.createAuditLog(logData);
    console.log(`Successfully created direct audit log ID: ${log.id}`);
    return log;
  } catch (error) {
    console.error('Error in direct audit logging:', error);
    return null;
  }
};

module.exports = { createAuditLog, logAction }; 