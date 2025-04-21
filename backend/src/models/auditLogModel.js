const pool = require('../config/db');

/**
 * Create a new audit log entry
 * @param {Object} logData - Audit log data
 * @returns {Promise<Object>} Created audit log
 */
const createAuditLog = async (logData) => {
  const {
    user_id,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    ip_address,
    user_agent
  } = logData;

  // Validate required fields
  if (!user_id) {
    console.error('Failed to create audit log: Missing user_id');
    throw new Error('user_id is required for audit logging');
  }

  if (!action) {
    console.error('Failed to create audit log: Missing action');
    throw new Error('action is required for audit logging');
  }

  if (!entity_type) {
    console.error('Failed to create audit log: Missing entity_type');
    throw new Error('entity_type is required for audit logging');
  }

  try {
    console.log(`Inserting audit log to database: ${action} by user ${user_id}`);
    
    // Convert details to string if it's an object
    let detailsValue = details;
    if (typeof details === 'object' && details !== null) {
      detailsValue = JSON.stringify(details);
    }

    const query = `
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, entity_type, 
        entity_id, details, ip_address, user_agent
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      user_id,
      user_email || null,
      user_role || 'Unknown',
      action,
      entity_type,
      entity_id || null,
      detailsValue || null,
      ip_address || null,
      user_agent || null
    ];

    const result = await pool.query(query, values);
    console.log(`Audit log created successfully with ID: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating audit log in database:', error);
    throw error;
  }
};

/**
 * Get audit logs with filtering options
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of audit logs
 */
const getAuditLogs = async (options = {}) => {
  console.log('Fetching audit logs with options:', JSON.stringify(options, null, 2));
  
  const {
    user_id,
    user_role,
    action,
    entity_type,
    entity_id,
    start_date,
    end_date,
    search,
    limit = 100,
    offset = 0,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = options;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(user_id);
      paramCount++;
    }

    if (user_role) {
      query += ` AND user_role = $${paramCount}`;
      values.push(user_role);
      paramCount++;
    }

    if (action) {
      // Support for comma-separated actions
      if (action.includes(',')) {
        const actions = action.split(',');
        query += ` AND action IN (${actions.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...actions);
        paramCount += actions.length;
      } else {
        query += ` AND action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }
    }

    if (entity_type) {
      // Support for comma-separated entity types
      if (entity_type.includes(',')) {
        const entityTypes = entity_type.split(',');
        query += ` AND entity_type IN (${entityTypes.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...entityTypes);
        paramCount += entityTypes.length;
      } else {
        query += ` AND entity_type = $${paramCount}`;
        values.push(entity_type);
        paramCount++;
      }
    }

    if (entity_id) {
      query += ` AND entity_id = $${paramCount}`;
      values.push(entity_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (user_email ILIKE $${paramCount} OR entity_type ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    // Validate sort_by to prevent SQL injection
    const allowedSortColumns = ['created_at', 'user_id', 'action', 'entity_type'];
    const validSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    
    // Validate sort_order to prevent SQL injection
    const validSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${validSortBy} ${validSortOrder}`;
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    console.log(`Executing query: ${query}`);
    console.log('With values:', values);

    const result = await pool.query(query, values);
    console.log(`Fetched ${result.rows.length} audit logs`);
    return result.rows;
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
};

/**
 * Get audit logs count
 * @param {Object} options - Filter options
 * @returns {Promise<Number>} Count of matching audit logs
 */
const getAuditLogsCount = async (options = {}) => {
  const {
    user_id,
    user_role,
    action,
    entity_type,
    entity_id,
    start_date,
    end_date,
    search
  } = options;

  try {
    let query = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND user_id = $${paramCount}`;
      values.push(user_id);
      paramCount++;
    }

    if (user_role) {
      query += ` AND user_role = $${paramCount}`;
      values.push(user_role);
      paramCount++;
    }

    if (action) {
      // Support for comma-separated actions
      if (action.includes(',')) {
        const actions = action.split(',');
        query += ` AND action IN (${actions.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...actions);
        paramCount += actions.length;
      } else {
        query += ` AND action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }
    }

    if (entity_type) {
      // Support for comma-separated entity types
      if (entity_type.includes(',')) {
        const entityTypes = entity_type.split(',');
        query += ` AND entity_type IN (${entityTypes.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...entityTypes);
        paramCount += entityTypes.length;
      } else {
        query += ` AND entity_type = $${paramCount}`;
        values.push(entity_type);
        paramCount++;
      }
    }

    if (entity_id) {
      query += ` AND entity_id = $${paramCount}`;
      values.push(entity_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND created_at >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }
    
    if (search) {
      query += ` AND (user_email ILIKE $${paramCount} OR entity_type ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    const result = await pool.query(query, values);
    const count = parseInt(result.rows[0].count, 10);
    console.log(`Total audit logs count: ${count}`);
    return count;
  } catch (error) {
    console.error('Error getting audit logs count:', error);
    throw error;
  }
};

/**
 * Delete audit logs older than a specified date
 * @param {Date} olderThan - Date threshold
 * @returns {Promise<Number>} Count of deleted logs
 */
const deleteOldAuditLogs = async (olderThan) => {
  try {
    const query = 'DELETE FROM audit_logs WHERE created_at < $1 RETURNING id';
    const result = await pool.query(query, [olderThan]);
    return result.rowCount;
  } catch (error) {
    console.error('Error deleting old audit logs:', error);
    throw error;
  }
};

module.exports = {
  createAuditLog,
  getAuditLogs,
  getAuditLogsCount,
  deleteOldAuditLogs
}; 