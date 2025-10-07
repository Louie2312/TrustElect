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
  const [initialized, setInitialized] = useState(false);

  // Initialize user data once
  useEffect(() => {
    if (!initialized) {
      const userId = Cookies.get('userId');
      const userRole = Cookies.get('role');
      
      if (userId) {
        setUserData({
          id: userId,
          role: userRole || 'Admin'
        });
      }
      setInitialized(true);
    }
  }, [initialized]);

  if (typeof window !== 'undefined' && !window.GLOBAL_PERMISSIONS_TIMESTAMP) {
    window.GLOBAL_PERMISSIONS_TIMESTAMP = Date.now();
  }

  const fetchPermissions = useCallback(async (userId) => {
    if (!userId) {
      setPermissionsLoading(false);
      return false;
    }

    setPermissionsLoading(true);
    
    try {
      const userRole = Cookies.get('role');
      
      if (userRole === 'Super Admin') {
        const allPermissions = {
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          adminManagement: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          cms: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          auditLog: { canView: true, canCreate: true, canEdit: true, canDelete: true }
        };
        setPermissions(allPermissions);
        setPermissionsLastUpdated(Date.now());
        setPermissionsLoading(false);
        return true;
      }
 
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
      const url = `/api/admin/permissions`;
      
      const cacheParam = `_t=${Date.now()}`;
      const requestUrl = `${url}?${cacheParam}`;
      
      
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
        setPermissions({
          users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          elections: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          departments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          admins: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          adminManagement: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          cms: { canView: true, canCreate: true, canEdit: true, canDelete: true },
          auditLog: { canView: true, canCreate: true, canEdit: true, canDelete: true }
        });
      } else {
        setPermissions({
          users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          elections: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          departments: { canView: true, canCreate: false, canEdit: false, canDelete: false },
          admins: { canView: false, canCreate: false, canEdit: false, canDelete: false },
          adminManagement: { canView: false, canCreate: false, canEdit: false, canDelete: false },
          cms: { canView: false, canCreate: false, canEdit: false, canDelete: false },
          auditLog: { canView: false, canCreate: false, canEdit: false, canDelete: false }
        });
      }
      
      setPermissionsLastUpdated(Date.now());
      setPermissionsLoading(false);
      return false;
    }
  }, []); // REMOVED all dependencies to prevent circular re-renders

  const refreshPermissions = useCallback(() => {
    const userId = userData?.id || Cookies.get('userId');

    if (userId) {
      return fetchPermissions(userId);
    }
    
    return Promise.resolve(false);
  }, [fetchPermissions, userData?.id]); // Added userData?.id dependency

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

  // Initial permissions fetch - only run once when userData is available
  useEffect(() => {
    if (userData?.id && !permissionsLastUpdated) {
      fetchPermissions(userData.id);
    }
  }, [userData?.id, fetchPermissions, permissionsLastUpdated]); // Added missing dependencies

  // Global permissions update listener - FIXED to prevent circular dependencies
  useEffect(() => {
    const handlePermissionUpdate = (event) => {
      const { adminId, timestamp } = event.detail;
      
      // Check if this update applies to the current user
      if (userData?.id && userData.id.toString() === adminId.toString()) {
        const userId = userData.id;
        fetchPermissions(userId); 
      }
    };

    const checkGlobalPermissionsUpdate = () => {
      if (typeof window !== 'undefined' && window.GLOBAL_PERMISSIONS_TIMESTAMP) {
        if (window.GLOBAL_PERMISSIONS_TIMESTAMP > permissionsLastUpdated) {
          const userId = userData?.id || Cookies.get('userId');
          if (userId) {
            fetchPermissions(userId); 
          }
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
  }, [userData?.id, permissionsLastUpdated, fetchPermissions]); // Added fetchPermissions dependency

  const triggerGlobalPermissionsRefresh = useCallback(() => {
    updateGlobalPermissionsTimestamp();
    const userId = userData?.id || Cookies.get('userId');
    if (userId) {
      return fetchPermissions(userId);
    }
    return Promise.resolve(false);
  }, [userData?.id, fetchPermissions]);

  return { 
    permissions, 
    hasPermission, 
    refreshPermissions, 
    triggerGlobalPermissionsRefresh,
    permissionsLoading, 
    permissionsLastUpdated 
  };
};