const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { verifyToken, isSuperAdmin} = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Only super admins can access audit logs
router.get(
  '/',
  isSuperAdmin,
  auditLogController.getAuditLogs
);

// Only super admins can create audit logs directly
router.post(
  '/',
  isSuperAdmin,
  auditLogController.createAuditLog
);

// Only super admins can delete old audit logs
router.delete(
  '/old',
  isSuperAdmin,
  auditLogController.deleteOldAuditLogs
);

module.exports = router; 