const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin, isAdmin } = require('../middlewares/authMiddleware');
const { getPermissions, updatePermissions, checkPermissions } = require('../controllers/adminPermissionController');

// Allow both Super Admin and Admin to access admin permissions
router.get('/:adminId', verifyToken, async (req, res, next) => {
  const user = req.user;
  
  // Super Admin always has access
  if (user.normalizedRole === 'Super Admin') {
    return next();
  }
  
  // For Admin users, check if they have admin management permissions
  if (user.normalizedRole === 'Admin') {
    try {
      const pool = require('../config/db');
      const { rows } = await pool.query(
        'SELECT can_edit, can_create FROM admin_permissions WHERE admin_id = $1 AND module = $2',
        [user.id, 'adminManagement']
      );
      
      if (rows.length > 0) {
        const permissions = rows[0];
        if (permissions.can_edit || permissions.can_create) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        message: "You don't have permission to manage admin permissions. Please contact a superadmin." 
      });
    } catch (error) {
      console.error("Error checking admin management permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
  
  // For other roles, deny access
  return res.status(403).json({ 
    message: "Access denied. Only Super Admin and Admin with proper permissions can manage admin permissions." 
  });
}, getPermissions);

router.put('/:adminId', verifyToken, async (req, res, next) => {
  const user = req.user;
  
  // Super Admin always has access
  if (user.normalizedRole === 'Super Admin') {
    return next();
  }
  
  // For Admin users, check if they have admin management permissions
  if (user.normalizedRole === 'Admin') {
    try {
      const pool = require('../config/db');
      const { rows } = await pool.query(
        'SELECT can_edit, can_create FROM admin_permissions WHERE admin_id = $1 AND module = $2',
        [user.id, 'adminManagement']
      );
      
      if (rows.length > 0) {
        const permissions = rows[0];
        if (permissions.can_edit || permissions.can_create) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        message: "You don't have permission to manage admin permissions. Please contact a superadmin." 
      });
    } catch (error) {
      console.error("Error checking admin management permissions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
  
  // For other roles, deny access
  return res.status(403).json({ 
    message: "Access denied. Only Super Admin and Admin with proper permissions can manage admin permissions." 
  });
}, updatePermissions);

router.get('/:adminId/check', verifyToken, checkPermissions);

module.exports = router; 