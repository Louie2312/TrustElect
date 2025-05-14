const auditLogModel = require('../models/auditLogModel');

/**
 * Create an audit log for the current request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const createAuditLog = (req, res, next) => {

  const originalEnd = res.end;

  res.end = function(chunk, encoding) {
    res.end = originalEnd;

    res.end(chunk, encoding);
    
    if (req.method === 'GET' || req.originalUrl.startsWith('/api/audit-logs')) {
      return;
    }

    if (!req.user) {
      return;
    }
    
    try {

      const user_id = req.user.id;
      const user_email = req.user.email;
      const user_role = req.user.normalizedRole || req.user.role || 'Unknown';

      let action = req.method;
 
      const urlParts = req.originalUrl.split('/').filter(Boolean);
      const apiIndex = urlParts.findIndex(part => part === 'api');
      const entity_type = urlParts[apiIndex + 1] || 'unknown';

      let entity_id = null;

      if (urlParts.length > apiIndex + 2 && !isNaN(urlParts[apiIndex + 2])) {
        entity_id = parseInt(urlParts[apiIndex + 2], 10);
      } else if (req.params && Object.keys(req.params).length > 0) {
        const numericParams = Object.values(req.params).filter(val => !isNaN(val));
        if (numericParams.length > 0) {
          entity_id = parseInt(numericParams[0], 10);
        }
      }

      const ip_address = 
        req.headers['x-forwarded-for'] || 
        req.socket.remoteAddress || 
        'unknown';

      const user_agent = req.headers['user-agent'] || 'unknown';

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

      const details = {
        status: res.statusCode,
        endpoint: req.originalUrl,
      };

      if (res.statusCode >= 200 && res.statusCode < 300 && req.body) {
        const sanitizedBody = { ...req.body };

        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.password_hash) sanitizedBody.password_hash = '[REDACTED]';
        if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
        if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[REDACTED]';
        if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
        
        details.request = sanitizedBody;
      }

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
      
   
      auditLogModel.createAuditLog(logData)
        .then(log => {
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
    
   
    const log = await auditLogModel.createAuditLog(logData);
    return log;
  } catch (error) {
    console.error('Error in direct audit logging:', error);
    return null;
  }
};

module.exports = { createAuditLog, logAction }; 