const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Get audit logs
router.get(
  '/',
  checkPermission('auditLog', 'canView'),
  auditLogController.getAuditLogs
);

// Get audit logs summary
router.get(
  '/summary',
  checkPermission('auditLog', 'canView'),
  auditLogController.getAuditLogsSummary
);

// Create audit logs
router.post(
  '/',
  checkPermission('auditLog', 'canCreate'),
  auditLogController.createAuditLog
);

// Get user activity history
router.get(
  '/user/:userId',
  checkPermission('auditLog', 'canView'),
  auditLogController.getUserActivityHistory
);

// Get entity activity history
router.get(
  '/entity/:entityType/:entityId',
  checkPermission('auditLog', 'canView'),
  auditLogController.getEntityActivityHistory
);

// Delete old audit logs (admin only)
router.delete(
  '/old',
  checkPermission('auditLog', 'canDelete'),
  auditLogController.deleteOldAuditLogs
);

module.exports = router; 