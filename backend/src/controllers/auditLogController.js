const auditLogModel = require('../models/auditLogModel');

/**
 * Create a new audit log entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.createAuditLog = async (req, res) => {
  try {
    const auditLog = await auditLogModel.createAuditLog(req.body);
    res.status(201).json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create audit log'
    });
  }
};

/**
 * Helper function to log system activities
 * @param {Object} data - Audit log data
 * @returns {Promise<Object>} Created audit log or null on error
 */
exports.logActivity = async (data) => {
  try {
    const requiredFields = ['user_id', 'action', 'entity_type'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields for audit log: ${missingFields.join(', ')}`);
      return null;
    }
    
    return await auditLogModel.createAuditLog(data);
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

/**
 * Get audit logs with pagination and filtering
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Parse query parameters
    const {
      user_id,
      user_email,
      user_role,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const filterOptions = {
      user_id,
      user_email,
      user_role,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      search,
      limit: parseInt(limit, 10),
      offset,
      sort_by,
      sort_order
    };

    const [logs, count] = await Promise.all([
      auditLogModel.getAuditLogs(filterOptions),
      auditLogModel.getAuditLogsCount(filterOptions)
    ]);
 
    const totalPages = Math.ceil(count / parseInt(limit, 10));
    
    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalItems: count,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
};

/**
 * Get audit logs summary by categories
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAuditLogsSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days, 10);

    const summary = await auditLogModel.getAuditLogsSummary(daysNum);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting audit logs summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs summary'
    });
  }
};

/**
 * Get user activity history
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserActivityHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const activities = await auditLogModel.getAuditLogs({
      user_id: userId,
      limit: parseInt(limit, 10),
      sort_by: 'created_at',
      sort_order: 'DESC'
    });
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting user activity history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user activity history'
    });
  }
};

/**
 * Get entity activity history
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getEntityActivityHistory = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 20 } = req.query;
    
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and ID are required'
      });
    }
    
    const activities = await auditLogModel.getAuditLogs({
      entity_type: entityType,
      entity_id: entityId,
      limit: parseInt(limit, 10),
      sort_by: 'created_at',
      sort_order: 'DESC'
    });
    
    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error getting entity activity history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve entity activity history'
    });
  }
};

/**
 * Delete audit logs older than the specified date
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteOldAuditLogs = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    const olderThan = new Date(date);
    
    if (isNaN(olderThan.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    const deletedCount = await auditLogModel.deleteOldAuditLogs(olderThan);
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} audit logs older than ${olderThan.toISOString()}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error deleting old audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete old audit logs'
    });
  }
}; 