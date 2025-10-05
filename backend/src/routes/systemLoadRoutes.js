const express = require('express');
const router = express.Router();
const { getSystemLoadData, resetSystemLoadCache } = require('../controllers/systemLoadController');
const { verifyToken, isSuperAdmin, allowRoles } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permissionMiddleware');

// Get system load data (login and voting activity)
// Allow both Super Admin and Admin with 'reports' view permission
router.get('/', 
  verifyToken, 
  (req, res, next) => {
    // Super Admins always have access
    if (req.user && req.user.role_id === 1) {
      return next();
    }
    // For Admins, check specific permissions
    checkPermission('reports', 'view')(req, res, next);
  }, 
  getSystemLoadData
);

// Reset system load data cache (admin and super admin with manage permission)
router.post('/reset-cache', 
  verifyToken,
  (req, res, next) => {
    // Super Admins always have access
    if (req.user && req.user.role_id === 1) {
      return next();
    }
    // For Admins, check specific permissions
    checkPermission('system', 'manage')(req, res, next);
  },
  resetSystemLoadCache
);

module.exports = router;