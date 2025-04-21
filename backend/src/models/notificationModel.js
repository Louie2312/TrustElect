const pool = require("../config/db");

/**
 * Create a new notification
 * @param {Object} notification - The notification data
 * @returns {Promise<Object>} The created notification
 */
const createNotification = async (notification) => {
  const { user_id, role, title, message, type, related_entity, entity_id } = notification;
  
  const query = `
    INSERT INTO notifications 
    (user_id, role, title, message, type, related_entity, entity_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING *
  `;
  
  const values = [user_id, role, title, message, type, related_entity, entity_id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Create notifications for multiple users with the same content
 * @param {Array} userIds - Array of user IDs
 * @param {String} role - Role of users
 * @param {String} title - Notification title
 * @param {String} message - Notification message
 * @param {String} type - Notification type
 * @param {String} related_entity - Type of related entity
 * @param {Number} entity_id - ID of related entity
 * @returns {Promise<Array>} The created notifications
 */
const createNotificationForUsers = async (userIds, role, title, message, type, related_entity, entity_id) => {
  // Create a batch query for multiple users
  const values = [];
  const placeholders = [];
  
  userIds.forEach((userId, index) => {
    const offset = index * 7;
    values.push(userId, role, title, message, type, related_entity, entity_id);
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
  });
  
  const query = `
    INSERT INTO notifications 
    (user_id, role, title, message, type, related_entity, entity_id) 
    VALUES ${placeholders.join(', ')} 
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Get notifications for a specific user
 * @param {Number} userId - User ID
 * @param {Object} options - Query options (limit, offset, isRead, includeRoleVariants)
 * @returns {Promise<Array>} List of notifications
 */
const getNotificationsByUser = async (userId, options = {}) => {
  const { 
    limit = 10, 
    offset = 0, 
    isRead, 
    includeRoleVariants = true 
  } = options;
  

  
  // Force all parameters to be the correct types
  const userIdInt = parseInt(userId, 10);
  const limitInt = parseInt(limit, 10);
  const offsetInt = parseInt(offset, 10);
 
  
  let userRole = '';
  let roleVariants = [];
  
  if (includeRoleVariants) {
    try {
      
      const userDirectQuery = await pool.query(
        'SELECT role_id FROM users WHERE id = $1',
        [userIdInt]
      );
      
      if (userDirectQuery.rows.length > 0) {
        const user = userDirectQuery.rows[0];
        console.log(`Found user with role_id=${user.role_id} for user ${userIdInt}`);
        
        // Determine role from role_id only since role column doesn't exist
        if (user.role_id) {
          // Map role_id to role string
          switch (user.role_id) {
            case 1:
              userRole = 'Super Admin';
              break;
            case 2:
              userRole = 'Admin';
              break;
            case 3:
              userRole = 'Student';
              break;
            default:
              userRole = 'Unknown';
          }
        }
      
        
        // Create role variants based on determined role
        if (userRole.toLowerCase().includes('super') && userRole.toLowerCase().includes('admin')) {
          roleVariants = ['Super Admin', 'SuperAdmin', 'super admin', 'superadmin', 'super_admin', 'SUPER ADMIN', 'Superadmin'];
        } else if (userRole.toLowerCase() === 'admin') {
          roleVariants = ['Admin', 'admin', 'ADMIN'];
        } else if (userRole.toLowerCase() === 'student') {
          roleVariants = ['Student', 'student', 'STUDENT'];
        }
        
      
      } else {
        console.warn(`No user found with ID ${userIdInt} in users table`);
        
        const queries = [
       
          pool.query('SELECT 1 FROM superadmins WHERE id = $1', [userIdInt]),
        
          pool.query('SELECT 1 FROM admins WHERE id = $1', [userIdInt]),
         
          pool.query('SELECT 1 FROM students WHERE id = $1', [userIdInt])
        ];
        
        const [superadminResult, adminResult, studentResult] = await Promise.allSettled(queries);
        
        if (superadminResult.status === 'fulfilled' && superadminResult.value.rows.length > 0) {
          userRole = 'Super Admin';
          roleVariants = ['Super Admin', 'SuperAdmin', 'super admin', 'superadmin', 'super_admin', 'SUPER ADMIN', 'Superadmin'];
        
        } else if (adminResult.status === 'fulfilled' && adminResult.value.rows.length > 0) {
          userRole = 'Admin';
          roleVariants = ['Admin', 'admin', 'ADMIN'];
         
        } else if (studentResult.status === 'fulfilled' && studentResult.value.rows.length > 0) {
          userRole = 'Student';
          roleVariants = ['Student', 'student', 'STUDENT'];
          
        }
      }
    } catch (error) {
      console.error('Error finding user role for variants:', error);
    }
  }
  
  try {

    let isSuperadminFix = false;
    if (roleVariants.some(v => v.toLowerCase().includes('super'))) {
      isSuperadminFix = true;
    }
    
  
    let query, queryParams, result;
    
    if (isSuperadminFix) {

      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userIdInt, limitInt, offsetInt];
      
    }
    // Standard queries for normal cases
    else if (isRead === undefined && roleVariants.length === 0) {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userIdInt, limitInt, offsetInt];

    }
    else if (isRead !== undefined && roleVariants.length === 0) {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND is_read = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [userIdInt, !!isRead, limitInt, offsetInt];
      
     
    }
    else if (isRead === undefined && roleVariants.length > 0) {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 OR (user_id = $1 AND role = ANY($2))
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;
      queryParams = [userIdInt, roleVariants, limitInt, offsetInt];
      
      
    }
    else {
      query = `
        SELECT * FROM notifications 
        WHERE (user_id = $1 AND is_read = $2) OR (user_id = $1 AND role = ANY($3) AND is_read = $2)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
      `;
      queryParams = [userIdInt, !!isRead, roleVariants, limitInt, offsetInt];
      

    }
      
    result = await pool.query(query, queryParams);
      
    if (result.rows.length === 0 && isSuperadminFix) {
      console.log('No notifications found with standard query, trying direct role-based search...');
      
 
      const directQuery = `
        SELECT * FROM notifications 
        WHERE role IN ('Super Admin', 'SuperAdmin', 'superadmin')
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const directResult = await pool.query(directQuery);
      
      if (directResult.rows.length > 0) {
        // Update these notifications to be associated with this user
        const updatePromises = directResult.rows.map(notification => 
          pool.query(
            'UPDATE notifications SET user_id = $1 WHERE id = $2 RETURNING *',
            [userIdInt, notification.id]
          )
        );
        
        await Promise.all(updatePromises);
    
        
        // Re-run original query to get properly associated notifications
        result = await pool.query(query, queryParams);
       
      }
    }
    
    // If we still have no notifications at all, create a test notification for debugging
    if (result.rows.length === 0 && process.env.NODE_ENV !== 'production') {

      try {
        await pool.query(
          `INSERT INTO notifications 
           (user_id, role, title, message, type, related_entity, entity_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userIdInt, userRole || 'Unknown', 
           'Debug Notification', 
           'This is a test notification because you had no notifications.', 
           'info', null, null]
        );
        
        // Query again to get the new notification
        result = await pool.query(query, queryParams);
      } catch (debugError) {
        console.error('Error creating debug notification:', debugError);
      }
    }
    
    // Log the first notification to help with debugging
    if (result.rows.length > 0) {
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error executing notification query:', error);
    console.error(error.stack);
    throw error;
  }
};

/**
 * Count unread notifications for a user
 * @param {Number} userId - User ID
 * @returns {Promise<Number>} Count of unread notifications
 */
const countUnreadNotifications = async (userId) => {
  const query = `
    SELECT COUNT(*) FROM notifications 
    WHERE user_id = $1 AND is_read = FALSE
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count, 10);
};

/**
 * Mark a notification as read
 * @param {Number} notificationId - Notification ID
 * @param {Number} userId - User ID (for security check)
 * @returns {Promise<Object>} Updated notification
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE id = $1 AND user_id = $2 
    RETURNING *
  `;
  
  const result = await pool.query(query, [notificationId, userId]);
  return result.rows[0];
};

/**
 * Mark all notifications as read for a user
 * @param {Number} userId - User ID
 * @returns {Promise<Number>} Number of updated notifications
 */
const markAllNotificationsAsRead = async (userId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE user_id = $1 AND is_read = FALSE 
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows.length;
};

/**
 * Delete a notification
 * @param {Number} notificationId - Notification ID
 * @param {Number} userId - User ID (for security check)
 * @returns {Promise<Boolean>} True if deleted, false otherwise
 */
const deleteNotification = async (notificationId, userId) => {
  const query = `
    DELETE FROM notifications 
    WHERE id = $1 AND user_id = $2 
    RETURNING id
  `;
  
  const result = await pool.query(query, [notificationId, userId]);
  return result.rows.length > 0;
};

/**
 * Delete all notifications for a user
 * @param {Number} userId - User ID
 * @returns {Promise<Number>} Number of deleted notifications
 */
const deleteAllNotifications = async (userId) => {
  const query = `
    DELETE FROM notifications 
    WHERE user_id = $1 
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows.length;
};

/**
 * Debug function to check notifications by role
 * @param {String} role - User role to check for
 * @returns {Promise<Array>} List of notifications for that role
 */
const debugGetNotificationsByRole = async (role) => {
  try {
   
    const query = `
      SELECT * FROM notifications 
      WHERE role = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [role]);

    
    if (result.rows.length > 0) {
   
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error in debugGetNotificationsByRole:', error);
    return [];
  }
};

/**
 * Mark all notifications as read that match a specific entity type and ID for a user
 * @param {Number} userId - User ID
 * @param {String} entityType - The entity type to match
 * @param {Number} entityId - The entity ID to match
 * @returns {Promise<Number>} Number of updated notifications
 */
const markNotificationsByEntityAsRead = async (userId, entityType, entityId) => {
  const query = `
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE user_id = $1 
    AND related_entity = $2 
    AND entity_id = $3 
    AND is_read = FALSE 
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId, entityType, entityId]);
  return result.rows.length;
};

module.exports = {
  createNotification,
  createNotificationForUsers,
  getNotificationsByUser,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  debugGetNotificationsByRole,
  markNotificationsByEntityAsRead
}; 