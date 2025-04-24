import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

// Create a global timestamp for permission updates that all instances can access
let GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();

// Function to update the global timestamp - can be called from anywhere
export const updateGlobalPermissionsTimestamp = () => {
  GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();
  console.log('Global permissions timestamp updated:', GLOBAL_PERMISSIONS_TIMESTAMP);
  
  // Dispatch an event to notify all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('global-permissions-update'));
  }
};

/**
 * Custom hook to fetch and check admin permissions
 * @returns {Object} Permission check functions and loading state
 */
const usePermissions = () => {
  const [permissions, setPermissions] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsLastUpdated, setPermissionsLastUpdated] = useState(0);
  const [userData, setUserData] = useState(null);

  // Initialize user data from cookies on first load
  useEffect(() => {
    const userId = Cookies.get('user_id');
    const userRole = Cookies.get('role');
    
    if (userId) {
      setUserData({
        id: userId,
        role: userRole || 'Admin'
      });
    }
  }, []);

  // Set up a global timestamp tracker if it doesn't exist
  if (typeof window !== 'undefined' && !window.GLOBAL_PERMISSIONS_TIMESTAMP) {
    window.GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();
    console.log('Initialized global permissions timestamp');
  }

  const fetchPermissions = useCallback(async (userId) => {
    if (!userId) {
      console.log('No user ID provided for permissions fetch');
      setPermissionsLoading(false);
      return false;
    }

    setPermissionsLoading(true);
    console.log(`Fetching permissions for user ID: ${userId}`);
    
    try {
      // Check user role first
      const userRole = Cookies.get('role');
      
      // For Super Admins, we can skip the API call and just set full permissions
      if (userRole === 'Super Admin') {
        console.log('User is a Super Admin, granting all permissions without API call');
        // Super admin has all permissions
        setPermissions({
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        });
        setPermissionsLastUpdated(Date.now());
        setPermissionsLoading(false);
        return true;
      }
      
      // For regular admins, fetch their permissions from the API
      // Determine API URL with a fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // For regular admins, we need to call an endpoint that doesn't require Super Admin privileges
      // Use /api/admin/permissions instead of /api/admin-permissions
      const url = `${apiUrl}/api/admin/permissions`;
      
      // Include cache-busting parameter
      const cacheParam = `_t=${Date.now()}`;
      const requestUrl = `${url}?${cacheParam}`;
      
      console.log(`Making permissions request to: ${requestUrl}`);
      
      const token = Cookies.get('token');
      if (!token) {
        console.warn('No auth token found, cannot fetch permissions');
        setPermissionsLoading(false);
        return false;
      }
      
      const response = await axios.get(requestUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data && response.data.permissions) {
        console.log(`Permissions fetched successfully for user ${userId}:`, response.data.permissions);
        setPermissions(response.data.permissions);
        setPermissionsLastUpdated(Date.now());
        setPermissionsLoading(false);
        return true;
      } else {
        console.warn('API returned invalid permissions format:', response.data);
        setPermissionsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      
      // Check if user is a super admin
      const userRole = Cookies.get('role');
      if (userRole === 'Super Admin') {
        console.log('User is a Super Admin, granting all permissions by default');
        // Super admin has all permissions
        setPermissions({
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
        });
      } else {
        // Set default minimal permissions for non-super admins on error
        console.log('Setting default permissions due to fetch error');
        setPermissions({
          users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          elections: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          departments: { canView: true, canCreate: false, canEdit: false, canDelete: false }
        });
      }
      
      setPermissionsLastUpdated(Date.now());
      setPermissionsLoading(false);
      return false;
    }
  }, []);

  const refreshPermissions = useCallback(() => {
    console.log('Refreshing permissions for user:', userData?.id);
    if (userData?.id) {
      return fetchPermissions(userData.id);
    }
    return Promise.resolve(false);
  }, [userData, fetchPermissions]);

  const hasPermission = useCallback((module, action) => {
    // Super Admin always has all permissions
    const userRole = Cookies.get('role');
    if (userRole === 'Super Admin') {
      return true;
    }

    // Check if module and action exist in permissions
    if (permissions && permissions[module]) {
      // Map from action to permission key format
      const permKey = action.startsWith('can') ? action : `can${action.charAt(0).toUpperCase() + action.slice(1)}`;
      return permissions[module][permKey] === true;
    }

    return false;
  }, [permissions]);

  // Load permissions when userData is available
  useEffect(() => {
    if (userData?.id) {
      fetchPermissions(userData.id);
    }
  }, [userData, fetchPermissions]);

  // Set up listeners for permission updates
  useEffect(() => {
    // Function to handle the custom event
    const handlePermissionUpdate = (event) => {
      const { adminId, timestamp } = event.detail;
      console.log(`Permission update event received for admin: ${adminId}, timestamp: ${timestamp}`);
      
      // Check if this update applies to the current user
      if (userData?.id && userData.id.toString() === adminId.toString()) {
        console.log('Updating permissions for current user based on event');
        refreshPermissions();
      }
    };

    // Global polling for permission updates
    const checkGlobalPermissionsUpdate = () => {
      if (typeof window !== 'undefined' && window.GLOBAL_PERMISSIONS_TIMESTAMP) {
        if (window.GLOBAL_PERMISSIONS_TIMESTAMP > permissionsLastUpdated) {
          console.log('Global permissions timestamp updated, refreshing permissions');
          refreshPermissions();
        }
      }
    };

    // Add event listener
    window.addEventListener('admin-permissions-updated', handlePermissionUpdate);
    
    // Set up polling interval
    const permissionCheckInterval = setInterval(checkGlobalPermissionsUpdate, 10000); // Check every 10 seconds

    // Clean up
    return () => {
      window.removeEventListener('admin-permissions-updated', handlePermissionUpdate);
      clearInterval(permissionCheckInterval);
    };
  }, [userData, refreshPermissions, permissionsLastUpdated]);

  // Expose a function to manually trigger permission refresh
  const triggerGlobalPermissionsRefresh = useCallback(() => {
    updateGlobalPermissionsTimestamp();
    return refreshPermissions();
  }, [refreshPermissions]);

  return { 
    permissions, 
    hasPermission, 
    refreshPermissions, 
    triggerGlobalPermissionsRefresh,
    permissionsLoading, 
    permissionsLastUpdated 
  };
};

export default usePermissions; 