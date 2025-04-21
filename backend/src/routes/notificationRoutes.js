const express = require("express");
const pool = require("../config/db");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  markReadByEntity
} = require("../controllers/notificationController");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

// Get all notifications for the current user
router.get("/", getNotifications);

// Get count of unread notifications
router.get("/unread-count", getUnreadCount);

// Mark a notification as read
router.put("/:id/read", markAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Mark notifications as read by entity type and ID
router.put("/markReadByEntity", markReadByEntity);

// Delete a notification
router.delete("/:id", deleteNotification);

// Delete all notifications
router.delete("/", deleteAllNotifications);


module.exports = router; 