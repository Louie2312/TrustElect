const { hasPermission } = require("../models/adminPermissionModel");

/**
 * Middleware factory to check if admin has permission for an action
 * @param {string} module - The module name (users, elections, etc.)
 * @param {string} action - The action name (view, create, edit, delete)
 * @returns {Function} Express middleware function
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // Super admins (role_id = 1) bypass permission checks
      if (req.user && req.user.role_id === 1) {
        return next();
      }

      // Get admin ID from the token/request
      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if admin has the required permission
      const permitted = await hasPermission(adminId, module, action);
      
      if (!permitted) {
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to ${action} ${module}.` 
        });
      }

      // Permission granted, proceed to the route handler
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Server error during permission check" });
    }
  };
};

module.exports = { checkPermission }; 