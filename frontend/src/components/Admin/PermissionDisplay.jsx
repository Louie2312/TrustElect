"use client";

import { useState, useEffect } from 'react';
import usePermissions, { ensureUserIdFromToken } from '../../hooks/usePermissions';
import Cookies from 'js-cookie';

export default function PermissionDisplay() {
  const { hasPermission, permissions, permissionsLoading, refreshPermissions, triggerGlobalPermissionsRefresh } = usePermissions();
  const [moduleNames, setModuleNames] = useState([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [error, setError] = useState(null);

 
  useEffect(() => {
    if (permissions && typeof permissions === 'object') {
      const filteredModules = Object.keys(permissions).filter(
        module => module !== 'reports' && module !== 'notifications'
      );
      setModuleNames(filteredModules);
    }
  }, [permissions]);

  useEffect(() => {

    const userId = Cookies.get('userId');
   
    
    if (userId) {
      refreshPermissions().catch(err => {
        console.error('Error refreshing permissions:', err);
        setError('Failed to load permissions');
      });
    } else {
      setError('No user ID found');
    }

    const refreshInterval = setInterval(() => {

      refreshPermissions().catch(err => {
        console.error('Error auto-refreshing permissions:', err);
      });
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [refreshPermissions]);

  useEffect(() => {
    const handleAdminPermissionUpdate = (event) => {
      const currentUserId = Cookies.get('userId');
      if (currentUserId && event.detail && event.detail.adminId.toString() === currentUserId) {
        refreshPermissions();
        setForceRefresh(prev => prev + 1);
      }
    };

    window.addEventListener('admin-permissions-updated', handleAdminPermissionUpdate);

    try {
      const currentUserId = Cookies.get('userId');
      if (currentUserId) {
        const lastUpdateTime = localStorage.getItem(`admin_permissions_updated_${currentUserId}`);
        if (lastUpdateTime) {
         
          refreshPermissions();
        }
      }
    } catch (error) {
      console.warn('Error checking local storage for permission updates:', error);
    }
    
    return () => {
      window.removeEventListener('admin-permissions-updated', handleAdminPermissionUpdate);
    };
  }, [refreshPermissions]);

  if (permissionsLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Your Permissions</h2>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !permissions) {
    
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3 text-black">Your Access Level</h2>
        <div className="space-y-2">
          <div className="p-2 border rounded-lg">
            <div className="flex items-center">
              <span className="text-green-500">✓</span>
              <span className="ml-2 text-black">View dashboard</span>
            </div>
          </div>
          <div className="p-2 border rounded-lg">
            <div className="flex items-center">
              <span className="text-green-500">✓</span>
              <span className="ml-2 text-black">Access elections</span>
            </div>
          </div>
          <p className="text-xs text-black mt-2 italic">For more details, contact your administrator</p>
        </div>
      </div>
    );
  }

  if (Object.keys(permissions).length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3 text-black">Your Permissions</h2>
        <p className="text-black">No specific permissions set. Please contact a System Admin if you need access to certain features.</p>
      </div>
    );
  }

  const getStatusIcon = (hasPermission) => {
    return hasPermission ? 
      <span className="text-green-500">✓</span> : 
      <span className="text-gray-300">-</span>;
  };

  const getModuleDisplayName = (module) => {
    const displayNames = {
      users: 'Student Management',
      elections: 'Election Management',
      departments: 'Department Management',
      cms: 'Content Management',
      auditLog: 'Audit Logs'
    };
    return displayNames[module] || module.charAt(0).toUpperCase() + module.slice(1);
  };

  const hasAnyPermission = (module) => {
    const perms = permissions[module];
    return perms.canView || perms.canCreate || perms.canEdit || perms.canDelete;
  };

  const activeModules = moduleNames.filter(hasAnyPermission);

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-3 text-black">Your Permissions</h2>
      
      {activeModules.length === 0 ? (
        <p className="text-black">You have view-only access to the system. Contact an administrator for additional permissions.</p>
      ) : (
        <div className="space-y-4">
          {activeModules.map(module => (
            <div key={module} className="border rounded-lg p-3">
              <h3 className="font-medium mb-2 text-black">{getModuleDisplayName(module)}</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  {getStatusIcon(permissions[module].canView)}
                  <span className="ml-2 text-sm text-black">View</span>
                </div>
                
                <div className="flex items-center">
                  {getStatusIcon(permissions[module].canCreate)}
                  <span className="ml-2 text-sm text-black">Create</span>
                </div>
                
                <div className="flex items-center">
                  {getStatusIcon(permissions[module].canEdit)}
                  <span className="ml-2 text-sm text-black">Edit</span>
                </div>
                
                <div className="flex items-center">
                  {getStatusIcon(permissions[module].canDelete)}
                  <span className="ml-2 text-sm text-black">Delete</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 