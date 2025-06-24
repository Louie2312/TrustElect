const { hasPermission } = require("../models/adminPermissionModel");

/**
 * @param {string} module 
 * @param {string} action 
 * @returns {Function} 
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.role_id === 1) {
        return next();
      }

      const adminId = req.user?.id;
      
      if (!adminId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Remove any existing 'can_' prefix and ensure proper format
      const cleanAction = action.replace(/^can_?/, '').toLowerCase();
      const permitted = await hasPermission(adminId, module, cleanAction);
      
      if (!permitted) {
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to ${cleanAction} ${module}.` 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Server error during permission check" });
    }
  };
};

module.exports = { checkPermission }; 