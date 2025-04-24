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
    user_email,
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
    
    if (user_email) {
      query += ` AND user_email = $${paramCount}`;
      values.push(user_email);
      paramCount++;
    }

    if (user_role) {
      // Support for comma-separated roles
      if (user_role.includes(',')) {
        const roles = user_role.split(',');
        query += ` AND user_role IN (${roles.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...roles);
        paramCount += roles.length;
      } else {
        query += ` AND user_role = $${paramCount}`;
        values.push(user_role);
        paramCount++;
      }
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
      query += ` AND (
        user_email ILIKE $${paramCount} 
        OR entity_type ILIKE $${paramCount} 
        OR action ILIKE $${paramCount}
        OR CAST(entity_id AS TEXT) ILIKE $${paramCount}
        OR details ILIKE $${paramCount}
      )`;
      const searchValue = `%${search}%`;
      values.push(searchValue);
      paramCount++;
    }

    // Validate sort_by to prevent SQL injection
    const allowedSortColumns = ['created_at', 'user_id', 'user_email', 'action', 'entity_type', 'id'];
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
    
    // Process the results to parse JSON details if needed
    const processedLogs = result.rows.map(log => {
      // Try to parse details JSON if it's a string
      if (log.details && typeof log.details === 'string') {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          // Keep as string if can't parse as JSON
        }
      }
      return log;
    });
    
    console.log(`Fetched ${processedLogs.length} audit logs`);
    return processedLogs;
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
    user_email,
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
    
    if (user_email) {
      query += ` AND user_email = $${paramCount}`;
      values.push(user_email);
      paramCount++;
    }

    if (user_role) {
      // Support for comma-separated roles
      if (user_role.includes(',')) {
        const roles = user_role.split(',');
        query += ` AND user_role IN (${roles.map((_, i) => `$${paramCount + i}`).join(',')})`;
        values.push(...roles);
        paramCount += roles.length;
      } else {
        query += ` AND user_role = $${paramCount}`;
        values.push(user_role);
        paramCount++;
      }
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
      query += ` AND (
        user_email ILIKE $${paramCount} 
        OR entity_type ILIKE $${paramCount} 
        OR action ILIKE $${paramCount}
        OR CAST(entity_id AS TEXT) ILIKE $${paramCount}
        OR details ILIKE $${paramCount}
      )`;
      const searchValue = `%${search}%`;
      values.push(searchValue);
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
 * Get audit logs summary grouped by categories
 * @param {Number} days - Number of days to include in summary
 * @returns {Promise<Object>} Summary statistics
 */
const getAuditLogsSummary = async (days = 30) => {
  try {
    // Get date for filtering
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();
    
    // Queries for different summaries
    const queries = {
      actionSummary: `
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= $1 
        GROUP BY action 
        ORDER BY count DESC
      `,
      userRoleSummary: `
        SELECT user_role, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= $1 
        GROUP BY user_role 
        ORDER BY count DESC
      `,
      entityTypeSummary: `
        SELECT entity_type, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= $1 
        GROUP BY entity_type 
        ORDER BY count DESC
      `,
      timelineSummary: `
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE created_at >= $1 
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `,
      topUsers: `
        SELECT user_id, user_email, user_role, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= $1 
        GROUP BY user_id, user_email, user_role
        ORDER BY count DESC
        LIMIT 10
      `,
      recentLogins: `
        SELECT * FROM audit_logs 
        WHERE created_at >= $1 AND action = 'LOGIN'
        ORDER BY created_at DESC
        LIMIT 20
      `,
      recentVotes: `
        SELECT * FROM audit_logs 
        WHERE created_at >= $1 AND action = 'VOTE'
        ORDER BY created_at DESC
        LIMIT 20
      `
    };
    
    // Execute all queries in parallel
    const results = await Promise.all(Object.entries(queries).map(async ([key, query]) => {
      const result = await pool.query(query, [startDateStr]);
      return { [key]: result.rows };
    }));
    
    // Convert array of objects into a single object
    const summary = Object.assign({}, ...results);
    
    // Get total count
    const totalCountResult = await pool.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= $1',
      [startDateStr]
    );
    
    summary.totalCount = parseInt(totalCountResult.rows[0].total, 10);
    summary.periodDays = days;
    
    return summary;
  } catch (error) {
    console.error('Error getting audit logs summary:', error);
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
  getAuditLogsSummary,
  deleteOldAuditLogs
}; 