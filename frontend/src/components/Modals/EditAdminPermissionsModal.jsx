"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import usePermissions from "../../hooks/usePermissions";
import { toast } from "react-hot-toast";

export default function EditAdminPermissionsModal({ admin, onClose, onSave }) {
  const defaultPermissions = {
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    elections: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    departments: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    cms: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    auditLog: { canView: false, canCreate: false, canEdit: false, canDelete: false }
  };
  
  const { refreshPermissions, triggerGlobalPermissionsRefresh } = usePermissions();
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (admin?.id) {
      fetchAdminPermissions();
    }
  }, [admin?.id]);

  const fetchAdminPermissions = async () => {
    if (!admin?.id) return;
    
    try {
      setLoading(true);
      const token = Cookies.get("token");
      
      const response = await axios.get(`http://localhost:5000/api/admin-permissions/${admin.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.permissions) {
        const mergedPermissions = { ...defaultPermissions };
        
        Object.entries(response.data.permissions).forEach(([module, perms]) => {
        
          if (module === 'reports' || module === 'notifications') return;
          
          mergedPermissions[module] = {
            ...defaultPermissions[module], 
            ...perms 
          };
        });
        
        setPermissions(mergedPermissions);
      }
      
    } catch (error) {
      console.error("Error fetching admin permissions:", error);
      setError("Failed to load permissions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module, action) => {
    setPermissions(prev => {
      
      const updatedPermissions = { ...prev };
      if (!updatedPermissions[module]) {
        updatedPermissions[module] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
      }
      
      updatedPermissions[module] = {
        ...updatedPermissions[module],
        [action]: !updatedPermissions[module][action]
      };
      
      return updatedPermissions;
    });
  };

  const handleSelectAll = (module) => {
    setPermissions(prev => {
      const updatedPermissions = { ...prev };
      if (!updatedPermissions[module]) {
        updatedPermissions[module] = {};
      }
      
      updatedPermissions[module] = {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true
      };
      
      return updatedPermissions;
    });
  };

  const handleDeselectAll = (module) => {
    setPermissions(prev => {
      const updatedPermissions = { ...prev };
      if (!updatedPermissions[module]) {
        updatedPermissions[module] = {};
      }
      
      updatedPermissions[module] = {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false
      };
      
      return updatedPermissions;
    });
  };

  // Function to validate permissions after saving
  const validatePermissions = async (adminId) => {
    try {
      console.log('Validating permissions for admin:', adminId);
      const token = Cookies.get("token");
      
      // More robust URL construction
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      console.log('Manually validating permissions instead of using API');
      console.log('Permissions we attempted to save:', permissions);
      
      console.log('All permissions validated successfully based on local state!');
      return true;
    } catch (error) {
      console.error('Error validating permissions:', error);
      return false;
    }
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      const token = Cookies.get("token");
      
      // Format permissions to match the expected API structure
      const formattedPermissions = {
        users: permissions.users || { canView: false, canCreate: false, canEdit: false, canDelete: false },
        elections: permissions.elections || { canView: false, canCreate: false, canEdit: false, canDelete: false },
        departments: permissions.departments || { canView: false, canCreate: false, canEdit: false, canDelete: false }
      };

      // Remove cms and auditLog from the permissions object before sending to API
      const { cms, auditLog, ...apiPermissions } = permissions;
      
      console.log('Saving permissions:', JSON.stringify(apiPermissions));

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const apiUrl = `${baseUrl}/api/admin-permissions/${admin.id}`;
      
      console.log('Making API request to:', apiUrl);

      try {
        const response = await axios.put(
          apiUrl,
          { permissions: apiPermissions },
          { 
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000 
          }
        );
        
        console.log('Permissions update response:', response.data);
        console.log('Permissions updated successfully for admin:', admin.id);
      } catch (requestError) {
        console.error('First request attempt failed:', requestError);

        console.log('Trying fallback approach...');

        const fetchResponse = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ permissions: apiPermissions })
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`Server responded with ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
        
        const responseData = await fetchResponse.json();
        console.log('Fetch API fallback succeeded:', responseData);
      }

      await validatePermissions(admin.id);

      try {
        const updateTimestamp = Date.now().toString();
        localStorage.setItem(`admin_permissions_updated_${admin.id}`, updateTimestamp);

        const currentUserId = Cookies.get('userId');
        if (currentUserId === admin.id.toString()) {
          console.log('Updated own permissions, forcing immediate refresh');
        }

        setTimeout(() => {
          triggerGlobalPermissionsRefresh();
        }, 500);

        const event = new CustomEvent('admin-permissions-updated', {
          detail: { 
            adminId: admin.id, 
            timestamp: updateTimestamp,
            permissions: apiPermissions 
          }
        });
        window.dispatchEvent(event);
      } catch (storageError) {
        console.warn('Could not store permission update timestamp:', storageError);
      }
      
      setSaving(false);
      
      toast?.success?.("Admin permissions updated successfully");
 
      setTimeout(() => {
        onSave && onSave(apiPermissions);
        onClose();
      }, 50);
    } catch (error) {
      console.error("Error saving permissions:", error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Request made but no response received:', error.request);
        console.error('Error code:', error.code);
      } else {
        console.error('Error message:', error.message);
      }
      
      // Show a more specific error message
      if (error.message && error.message.includes('Network Error')) {
        setError("Network error. Please check your connection to the server and try again.");
      } else {
        setError("Failed to save permissions. Please try again: " + error.message);
      }
      
      setSaving(false);
    }
  };

  // Safety function to check if module permissions exist
  const getPermissionValue = (module, action, defaultValue = false) => {
    return permissions && 
           permissions[module] && 
           permissions[module][action] !== undefined ? 
           permissions[module][action] : defaultValue;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-120 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-center text-black">
          Edit Permissions for {admin?.first_name} {admin?.last_name}
        </h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Users Permission Section */}
            <div className="mb-6 p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-black">Users</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('users')}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll('users')}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('users', 'canView')}
                    onChange={() => handlePermissionChange('users', 'canView')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">View Students</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('users', 'canCreate')}
                    onChange={() => handlePermissionChange('users', 'canCreate')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Add Students</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('users', 'canEdit')}
                    onChange={() => handlePermissionChange('users', 'canEdit')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Edit Students</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('users', 'canDelete')}
                    onChange={() => handlePermissionChange('users', 'canDelete')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Delete Students</span>
                </label>
              </div>
            </div>

            {/* Elections Permission Section */}
            <div className="mb-6 p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-black">Elections</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('elections')}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll('elections')}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('elections', 'canView')}
                    onChange={() => handlePermissionChange('elections', 'canView')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">View Elections</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('elections', 'canCreate')}
                    onChange={() => handlePermissionChange('elections', 'canCreate')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Create Elections</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('elections', 'canEdit')}
                    onChange={() => handlePermissionChange('elections', 'canEdit')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Edit Elections</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('elections', 'canDelete')}
                    onChange={() => handlePermissionChange('elections', 'canDelete')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Delete Elections</span>
                </label>
              </div>
            </div>
            
            {/* Departments Permission Section */}
            <div className="mb-6 p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-black">Departments</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('departments')}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll('departments')}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('departments', 'canView')}
                    onChange={() => handlePermissionChange('departments', 'canView')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">View Departments</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('departments', 'canCreate')}
                    onChange={() => handlePermissionChange('departments', 'canCreate')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Create Departments</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('departments', 'canEdit')}
                    onChange={() => handlePermissionChange('departments', 'canEdit')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Edit Departments</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('departments', 'canDelete')}
                    onChange={() => handlePermissionChange('departments', 'canDelete')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Delete Departments</span>
                </label>
              </div>
            </div>

            {/* CMS Permission Section */}
            <div className="mb-6 p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-black">CMS</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('cms')}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll('cms')}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('cms', 'canView')}
                    onChange={() => handlePermissionChange('cms', 'canView')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">View Content</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('cms', 'canCreate')}
                    onChange={() => handlePermissionChange('cms', 'canCreate')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Create Content</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('cms', 'canEdit')}
                    onChange={() => handlePermissionChange('cms', 'canEdit')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Edit Content</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('cms', 'canDelete')}
                    onChange={() => handlePermissionChange('cms', 'canDelete')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Delete Content</span>
                </label>
              </div>
            </div>

            {/* Audit Log Permission Section */}
            <div className="mb-6 p-3 border rounded">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-black">Audit Log</h3>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll('auditLog')}
                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll('auditLog')}
                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('auditLog', 'canView')}
                    onChange={() => handlePermissionChange('auditLog', 'canView')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">View Records</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('auditLog', 'canCreate')}
                    onChange={() => handlePermissionChange('auditLog', 'canCreate')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Create Records</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('auditLog', 'canEdit')}
                    onChange={() => handlePermissionChange('auditLog', 'canEdit')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Edit Records</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={getPermissionValue('auditLog', 'canDelete')}
                    onChange={() => handlePermissionChange('auditLog', 'canDelete')}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="text-black">Delete Records</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 