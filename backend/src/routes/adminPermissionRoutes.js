const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

// Allow both Super Admin and Admin to access admin permissions
router.get('/:adminId', verifyToken, (req, res, next) => {
  const user = req.user;
  
  // Super Admin always has access
  if (user.normalizedRole === 'Super Admin') {
    return next();
  }
  
  // Admin users also have access (no additional permission check for now)
  if (user.normalizedRole === 'Admin') {
    return next();
  }
  
  // For other roles, deny access
  return res.status(403).json({ 
    message: "Access denied. Only Super Admin and Admin can manage admin permissions." 
  });
}, getPermissions);

router.put('/:adminId', verifyToken, (req, res, next) => {
  const user = req.user;
  
  // Super Admin always has access
  if (user.normalizedRole === 'Super Admin') {
    return next();
  }
  
  // Admin users also have access (no additional permission check for now)
  if (user.normalizedRole === 'Admin') {
    return next();
  }
  
  // For other roles, deny access
  return res.status(403).json({ 
    message: "Access denied. Only Super Admin and Admin can manage admin permissions." 
  });
}, updatePermissions);

router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 