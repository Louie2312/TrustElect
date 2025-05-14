const pool = require("../config/db");

/**
 * Get all permissions for a specific admin
 * @param {number} adminId - The admin's user ID
 * @returns {Array} Array of permission objects by module
 */
const getAdminPermissions = async (adminId) => {
  try {
    const query = `
      SELECT module, can_view, can_create, can_edit, can_delete
      FROM admin_permissions
      WHERE admin_id = $1
    `;
    const result = await pool.query(query, [adminId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching admin permissions:", error);
    throw error;
  }
};

/**
 * Set permissions for a specific admin
 * @param {number} adminId - The admin's user ID
 * @param {Object} permissions - Object containing permission settings
 * @returns {boolean} Success indicator
 */
const setAdminPermissions = async (adminId, permissions) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM admin_permissions WHERE admin_id = $1", [adminId]);

    for (const [module, perms] of Object.entries(permissions)) {
      const query = `
        INSERT INTO admin_permissions 
        (admin_id, module, can_view, can_create, can_edit, can_delete)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(query, [
        adminId,
        module,
        perms.canView || false,
        perms.canCreate || false,
        perms.canEdit || false,
        perms.canDelete || false
      ]);
    }

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error setting admin permissions:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if an admin has a specific permission
 * @param {number} adminId - The admin's user ID
 * @param {string} module - The module name (e.g., 'users')
 * @param {string} action - The action name (view/create/edit/delete)
 * @returns {boolean} Whether the admin has permission
 */
const hasPermission = async (adminId, module, action) => {
  try {
    const permissionColumn = action.startsWith('can_') ? action : `can_${action}`;
    
    const query = `
      SELECT ${permissionColumn}
      FROM admin_permissions
      WHERE admin_id = $1 AND module = $2
    `;
    
    const result = await pool.query(query, [adminId, module]);

    return result.rows.length > 0 ? result.rows[0][permissionColumn] : false;
  } catch (error) {
    console.error("Error checking permission:", error);
    throw error;
  }
};

module.exports = {
  getAdminPermissions,
  setAdminPermissions,
  hasPermission
}; 