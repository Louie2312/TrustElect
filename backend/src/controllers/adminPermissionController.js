const { getAdminPermissions, setAdminPermissions, hasPermission } = require('../models/adminPermissionModel');


exports.getPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
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
    


    res.json({ permissions: formattedPermissions });
  } catch (error) {
    console.error("Error getting permissions:", error);
    res.status(500).json({ message: "Server error when retrieving permissions" });
  }
};


exports.updatePermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { permissions } = req.body;

   

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ message: "Invalid permissions format" });
    }

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

    await setAdminPermissions(adminId, permissions);
 
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


exports.checkPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { module, action } = req.query;

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