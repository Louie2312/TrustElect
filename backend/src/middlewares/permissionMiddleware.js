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

      const permitted = await hasPermission(adminId, module, action);
      
      if (!permitted) {
        return res.status(403).json({ 
          message: `Access denied. You don't have permission to ${action} ${module}.` 
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