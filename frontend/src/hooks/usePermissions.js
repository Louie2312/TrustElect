import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

let GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();

export const updateGlobalPermissionsTimestamp = () => {
  GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('global-permissions-update'));
  }
};

export const ensureUserIdFromToken = () => {
  try {
    const userId = Cookies.get('userId');
    if (!userId) {
      const token = Cookies.get('token');
      if (token) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData && tokenData.id) {
          Cookies.set('userId', tokenData.id, { path: '/', secure: false, sameSite: 'strict' });
          return tokenData.id;
        }
      }
    }
    return userId;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
};

/**
 * Custom hook to fetch and check admin permissions
 * @returns {Object} Permission check functions and loading state
 */
export default function usePermissions() {
  const [permissions, setPermissions] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsLastUpdated, setPermissionsLastUpdated] = useState(0);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const userId = Cookies.get('userId');
    const userRole = Cookies.get('role');
    
    if (userId) {
      setUserData({
        id: userId,
        role: userRole || 'Admin'
      });
    }
  }, []);

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
      const userRole = Cookies.get('role');
      
      if (userRole === 'Super Admin') {
        console.log('User is a Super Admin, granting all permissions without API call');
        const allPermissions = {
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          cms: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          auditLog: { canView: true, canCreate: true, canEdit: true, canDelete: true }
        };
        setPermissions(allPermissions);
        setPermissionsLastUpdated(Date.now());
        setPermissionsLoading(false);
        return true;
      }
 
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
      const url = `/api/admin/permissions`;
      
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
      
      const userRole = Cookies.get('role');
      if (userRole === 'Super Admin') {
        console.log('User is a Super Admin, granting all permissions by default');
        setPermissions({
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          cms: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          auditLog: { canView: true, canCreate: true, canEdit: true, canDelete: true }
        });
      } else {
        console.log('Setting default permissions due to fetch error');
        setPermissions({
          users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          elections: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          departments: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          admins: { canView: false, canCreate: false, canEdit: false, canDelete: false },
          cms: { canView: false, canCreate: false, canEdit: false, canDelete: false },
          auditLog: { canView: false, canCreate: false, canEdit: false, canDelete: false }
        });
      }
      
      setPermissionsLastUpdated(Date.now());
      setPermissionsLoading(false);
      return false;
    }
  }, []);

  const refreshPermissions = useCallback(() => {
    const userId = userData?.id || Cookies.get('userId');
    console.log('Refreshing permissions for user:', userId);

    if (userId) {
      return fetchPermissions(userId);
    }
    
    return Promise.resolve(false);
  }, [userData, fetchPermissions]);

  const hasPermission = useCallback((module, action) => {

    const userRole = Cookies.get('role');
    if (userRole === 'Super Admin') {
      return true;
    }
  
    if (permissions && permissions[module]) {
      const permKey = action.startsWith('can') ? action : `can${action.charAt(0).toUpperCase() + action.slice(1)}`;
      return permissions[module][permKey] === true;
    }

    return false;
  }, [permissions]);

  useEffect(() => {
    const userId = userData?.id || Cookies.get('userId');
    if (userId) {
      fetchPermissions(userId);
    }
  }, [userData, fetchPermissions]);

  useEffect(() => {
    const handlePermissionUpdate = (event) => {
      const { adminId, timestamp } = event.detail;
      console.log(`Permission update event received for admin: ${adminId}, timestamp: ${timestamp}`);
      
      // Check if this update applies to the current user
      if (userData?.id && userData.id.toString() === adminId.toString()) {
        console.log('Updating permissions for current user based on event');
        refreshPermissions();
      }
    };

    const checkGlobalPermissionsUpdate = () => {
      if (typeof window !== 'undefined' && window.GLOBAL_PERMISSIONS_TIMESTAMP) {
        if (window.GLOBAL_PERMISSIONS_TIMESTAMP > permissionsLastUpdated) {
          console.log('Global permissions timestamp updated, refreshing permissions');
          refreshPermissions();
        }
      }
    };
    window.addEventListener('admin-permissions-updated', handlePermissionUpdate);
    
    const permissionCheckInterval = setInterval(checkGlobalPermissionsUpdate, 10000); 

    // Clean up
    return () => {
      window.removeEventListener('admin-permissions-updated', handlePermissionUpdate);
      clearInterval(permissionCheckInterval);
    };
  }, [userData, refreshPermissions, permissionsLastUpdated]);

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