const {
  getNotificationsByUser,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  debugGetNotificationsByRole,
  markNotificationsByEntityAsRead
} = require('../models/notificationModel');

const notificationService = require('../services/notificationService');

/**
  @param {Object} req 
  @param {Object} res 
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    

    let limit = req.query.limit !== undefined ? req.query.limit : 10;
    let offset = req.query.offset !== undefined ? req.query.offset : 0;
    

    limit = Number(limit);
    offset = Number(offset);
    

    if (isNaN(limit)) limit = 10;
    if (isNaN(offset)) offset = 0;
    

    
    const options = {
      limit,
      offset,
    };
    
    if (req.query.unread !== undefined) {
      options.isRead = req.query.unread === 'true' ? true : false;
    }
    
    const totalNotifications = await getNotificationsByUser(userId, { limit: 1000 });
    const allRoles = [...new Set(totalNotifications.map(n => n.role))];
    const matchingRoleNotifications = totalNotifications.filter(n => n.role === userRole);


    if (matchingRoleNotifications.length === 0 && totalNotifications.length > 0) {

      const possibleRoles = [];
      if (userRole === 'Super Admin' || userRole === 'SuperAdmin') {
        possibleRoles.push('Super Admin', 'SuperAdmin', 'super admin', 'superadmin');
      } else if (userRole === 'Admin') {
        possibleRoles.push('Admin', 'admin');
      } else if (userRole === 'Student') {
        possibleRoles.push('Student', 'student');
      }
      
      for (const alternativeRole of possibleRoles) {
        const altRoleNotifications = totalNotifications.filter(n => n.role === alternativeRole);
      }
    }
    
    const notifications = await getNotificationsByUser(userId, options);
  
    if (notifications.length > 0) {
      
    }
    
    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Get count of unread notifications for the current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await countUnreadNotifications(userId);
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to count unread notifications',
      error: error.message
    });
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const updatedNotification = await markNotificationAsRead(id, userId);
    
    if (!updatedNotification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not owned by this user'
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read for the current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedCount = await markAllNotificationsAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: `Marked ${updatedCount} notifications as read`,
      count: updatedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const deleted = await deleteNotification(id, userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not owned by this user'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Delete all notifications for the current user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const deletedCount = await deleteAllNotifications(userId);
    
    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} notifications`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all notifications',
      error: error.message
    });
  }
};

/**
 * Debug endpoint to get notifications by role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.debugNotificationsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['Admin', 'SuperAdmin', 'Super Admin', 'Student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "Admin", "SuperAdmin", "Super Admin", or "Student"'
      });
    }
    
   
    const notifications = await debugGetNotificationsByRole(role);
    
    res.status(200).json({
      success: true,
      role: role,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error debugging notifications',
      error: error.message
    });
  }
};

/**
 * Debug endpoint to send a test notification to all superadmins
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.debugSendTestToSuperadmins = async (req, res) => {
  try {
    // This should only be accessible in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is not available in production'
      });
    }
    
    const result = await notificationService.debugSendTestToSuperadmins();
    
    res.status(200).json({
      success: true,
      message: `Sent ${result.length} test notifications to superadmins`,
      data: result
    });
  } catch (error) {
    console.error('Error sending test notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notifications',
      error: error.message
    });
  }
};

/**
 * @param {Object} req 
 * @param {Object} res 
 * @returns {Object} 
 */
exports.markReadByEntity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity type and entity ID are required'
      });
    }

    const count = await markNotificationsByEntityAsRead(userId, entityType, entityId);
    
    return res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
      count
    });
  } catch (error) {
    console.error('Error marking notifications as read by entity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
}; 