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
 * Get audit logs with pagination and filtering
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Parse query parameters
    const {
      user_id,
      user_role,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;
    
    // Convert page to offset
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    
    // Prepare filter options
    const filterOptions = {
      user_id,
      user_role,
      action,
      entity_type,
      entity_id,
      start_date,
      end_date,
      limit: parseInt(limit, 10),
      offset,
      sort_by,
      sort_order
    };
    
    // Get logs and total count in parallel
    const [logs, count] = await Promise.all([
      auditLogModel.getAuditLogs(filterOptions),
      auditLogModel.getAuditLogsCount(filterOptions)
    ]);
    
    // Calculate pagination info
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