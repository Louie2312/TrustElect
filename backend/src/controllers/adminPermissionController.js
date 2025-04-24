const { getAdminPermissions, setAdminPermissions, hasPermission } = require('../models/adminPermissionModel');

/**
 * Get permissions for a specific admin
 */
exports.getPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const permissions = await getAdminPermissions(adminId);
    
    // Convert from DB format to frontend format
    const formattedPermissions = {};
    permissions.forEach(perm => {
      formattedPermissions[perm.module] = {
        canView: perm.can_view,
        canCreate: perm.can_create,
        canEdit: perm.can_edit,
        canDelete: perm.can_delete
      };
    });
    
    // Log the permissions being returned
    console.log(`GET permissions for admin ${adminId}:`, JSON.stringify(formattedPermissions));
    
    res.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error("Error getting permissions:", error);
    res.status(500).json({ message: "Server error when retrieving permissions" });
  }
};

/**
 * Update permissions for a specific admin
 */
exports.updatePermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;

    // Log the incoming permissions request
    console.log(`PUT permissions for admin ${adminId}:`, JSON.stringify(permissions));

    // Basic validation
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ message: "Invalid permissions format" });
    }

    // Validate each module's permissions
    const validModules = ['users', 'elections', 'departments', 'notifications', 'reports'];
    const validActions = ['canView', 'canCreate', 'canEdit', 'canDelete'];

    for (const [module, perms] of Object.entries(permissions)) {
      if (!validModules.includes(module)) {
        return res.status(400).json({ message: `Invalid module: ${module}` });
      }

      for (const [action, value] of Object.entries(perms)) {
        if (!validActions.includes(action)) {
          return res.status(400).json({ message: `Invalid action: ${action}` });
        }
        if (typeof value !== 'boolean') {
          return res.status(400).json({ message: `Invalid value for ${action}: must be boolean` });
        }
      }
    }

    // Save permissions to database
    await setAdminPermissions(adminId, permissions);
    
    // Log successful update
    console.log(`Successfully updated permissions for admin ${adminId}`);
    
    res.json({ 
      message: "Admin permissions updated successfully",
      adminId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ message: "Server error when updating permissions" });
  }
};

/**
 * Debug endpoint to check permissions status for an admin
 */
exports.checkPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { module, action } = req.query;
    
    // Get all permissions for the admin
    const permissions = await getAdminPermissions(adminId);
    
    const formattedPermissions = {};
    permissions.forEach(perm => {
      formattedPermissions[perm.module] = {
        canView: perm.can_view,
        canCreate: perm.can_create,
        canEdit: perm.can_edit, 
        canDelete: perm.can_delete
      };
    });
    
    let permissionCheck = null;
    
    // If module and action are specified, check that specific permission
    if (module && action) {
      permissionCheck = await hasPermission(adminId, module, action);
    }
    
    res.json({
      adminId,
      timestamp: new Date().toISOString(),
      permissions: formattedPermissions,
      specificCheck: module && action ? {
        module,
        action,
        hasPermission: permissionCheck
      } : null,
      modules: Object.keys(formattedPermissions),
      permissionCount: permissions.length
    });
  } catch (error) {
    console.error("Error checking permissions:", error);
    res.status(500).json({ 
      message: "Server error when checking permissions",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 