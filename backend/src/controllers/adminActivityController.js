const auditLogModel = require('../models/auditLogModel');

/**
 * Get admin activity logs with filtering and pagination
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAdminActivities = async (req, res) => {
  try {
    
    const {
      timeframe = 'all',
      action = 'all',
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC',
      search = ''
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Base filter for admin roles
    const filterOptions = {
      user_role: 'admin,superadmin,Admin,SuperAdmin,Super Admin',
      limit: parseInt(limit, 10),
      offset,
      sort_by,
      sort_order,
      search
    };
    

    // Add date filtering based on timeframe
    const now = new Date();
    if (timeframe !== 'all') {
      switch (timeframe) {
        case 'today':
          filterOptions.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          filterOptions.start_date = weekStart.toISOString();
          break;
        case 'month':
          const monthStart = new Date(now);
          monthStart.setMonth(now.getMonth() - 1);
          filterOptions.start_date = monthStart.toISOString();
          break;
      }
    }

    // Add action filtering
    if (action !== 'all') {
      filterOptions.action = action;
    }

    // Get activities and total count
    
    let activities, count;
    try {
      [activities, count] = await Promise.all([
        auditLogModel.getAuditLogs(filterOptions),
        auditLogModel.getAuditLogsCount(filterOptions)
      ]);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    let activeAdmins;
    try {
      const activeAdminsQuery = `
        SELECT COUNT(DISTINCT u.id) as count
        FROM users u
        WHERE u.role_id IN (1, 2)  -- 1 for superadmin, 2 for admin
        AND u.is_active = true
      `;
      const activeAdminsResult = await auditLogModel.executeQuery(activeAdminsQuery, []);
      activeAdmins = parseInt(activeAdminsResult.rows[0]?.count || 0);
    } catch (error) {
      console.error('Error getting active admins:', error);
      activeAdmins = 0;
    }

    // Get most common action
    let mostCommonAction = 'N/A';
    try {
      const actionCountQuery = `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE user_role IN ('admin', 'superadmin', 'Admin', 'SuperAdmin', 'Super Admin')
        ${filterOptions.start_date ? "AND created_at >= $1" : ""}
        GROUP BY action
        ORDER BY count DESC
        LIMIT 1
      `;
      const actionCountValues = filterOptions.start_date ? [filterOptions.start_date] : [];
      const actionCountResult = await auditLogModel.executeQuery(actionCountQuery, actionCountValues);
      mostCommonAction = actionCountResult.rows[0]?.action || 'N/A';
    } catch (error) {
      console.error('Error getting most common action:', error);
    }

    // Get activities today
    let activitiesToday = 0;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const activitiesTodayQuery = `
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE user_role IN ('admin', 'superadmin', 'Admin', 'SuperAdmin', 'Super Admin')
        AND created_at >= $1
      `;
      const activitiesTodayResult = await auditLogModel.executeQuery(activitiesTodayQuery, [todayStart]);
      activitiesToday = parseInt(activitiesTodayResult.rows[0]?.count || 0);
      console.log('Activities today:', activitiesToday);
    } catch (error) {
      console.error('Error getting activities today:', error);
    }

    // Get admin details for each activity
    let activitiesWithDetails = [];
    try {
      activitiesWithDetails = await Promise.all(
        activities.map(async (activity) => {
          try {
            const adminQuery = `
              SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, u.is_active
              FROM users u
              WHERE u.id = $1 AND u.role_id IN (1, 2)
            `;
            const adminResult = await auditLogModel.executeQuery(adminQuery, [activity.user_id]);
            const admin = adminResult.rows[0];
            
            return {
              ...activity,
              user_email: admin?.email || activity.user_email,
              admin_name: admin ? `${admin.first_name} ${admin.last_name}` : 'Unknown',
              is_active: admin?.is_active || false,
              role_name: admin?.role_id === 1 ? 'Super Admin' : 'Admin'
            };
          } catch (error) {
            console.error('Error getting admin details for activity:', activity.id, error);
            return {
              ...activity,
              user_email: activity.user_email || 'Unknown',
              admin_name: 'Unknown',
              is_active: false,
              role_name: 'Unknown'
            };
          }
        })
      );
      console.log('Activities with details processed:', activitiesWithDetails.length);
    } catch (error) {
      console.error('Error processing activities with details:', error);
      activitiesWithDetails = activities.map(activity => ({
        ...activity,
        user_email: activity.user_email || 'Unknown',
        admin_name: 'Unknown',
        is_active: false,
        role_name: 'Unknown'
      }));
    }

    const totalPages = Math.ceil(count / parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: {
        activities: activitiesWithDetails,
        summary: {
          total_activities: count,
          active_admins: activeAdmins,
          activities_today: activitiesToday,
          most_common_action: mostCommonAction
        },
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalItems: count,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error getting admin activities:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin activities',
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Get admin activity summary statistics
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAdminActivitySummary = async (req, res) => {
  try {
    console.log('Admin activity summary request received:', req.query);
    
    const { timeframe = 'all' } = req.query;

    let startDate;
    const now = new Date();

    // Calculate start date based on timeframe
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate = null;
    }

    // Base query conditions
    const baseConditions = `
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE u.role_id IN (1, 2)
      AND u.is_active = true
      ${startDate ? "AND a.created_at >= $1" : ""}
    `;
    const queryValues = startDate ? [startDate] : [];

    // Get total activities
    const totalActivitiesResult = await auditLogModel.executeQuery(
      `SELECT COUNT(*) as count ${baseConditions}`,
      queryValues
    );
    const totalActivities = parseInt(totalActivitiesResult.rows[0]?.count || 0);

    // Get active admins
    const activeAdminsResult = await auditLogModel.executeQuery(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u 
       WHERE u.role_id IN (1, 2) 
       AND u.is_active = true`,
      []
    );
    const activeAdmins = parseInt(activeAdminsResult.rows[0]?.count || 0);

    // Get most common action
    const mostCommonActionResult = await auditLogModel.executeQuery(
      `SELECT a.action, COUNT(*) as count ${baseConditions} 
       GROUP BY a.action ORDER BY count DESC LIMIT 1`,
      queryValues
    );
    const mostCommonAction = mostCommonActionResult.rows[0]?.action || 'N/A';

    // Get activities by type
    const actionTypesResult = await auditLogModel.executeQuery(
      `SELECT a.action, COUNT(*) as count ${baseConditions} 
       GROUP BY a.action ORDER BY count DESC`,
      queryValues
    );
    const actionTypes = actionTypesResult.rows.reduce((acc, row) => {
      acc[row.action] = parseInt(row.count);
      return acc;
    }, {});

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activitiesTodayQuery = `
      SELECT COUNT(*) as count
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE u.role_id IN (1, 2)
      AND u.is_active = true
      AND a.created_at >= $1
    `;
    const activitiesTodayResult = await auditLogModel.executeQuery(activitiesTodayQuery, [todayStart]);
    const activitiesToday = parseInt(activitiesTodayResult.rows[0]?.count || 0);

    res.status(200).json({
      success: true,
      data: {
        total_activities: totalActivities,
        active_admins: activeAdmins,
        activities_today: activitiesToday,
        most_common_action: mostCommonAction,
        action_types: actionTypes
      }
    });
  } catch (error) {
    console.error('Error getting admin activity summary:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin activity summary',
      error: error.message,
      stack: error.stack
    });
  }
}; 