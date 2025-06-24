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

// Create audit logs
router.post(
  '/',
  checkPermission('auditLog', 'canCreate'),
  auditLogController.createAuditLog
);

// Delete old audit logs
router.delete(
  '/old',
  checkPermission('auditLog', 'canDelete'),
  auditLogController.deleteOldAuditLogs
);

module.exports = router; 