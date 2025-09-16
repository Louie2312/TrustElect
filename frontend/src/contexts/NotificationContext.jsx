"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const normalizeRole = (role) => {
  if (!role) return '';
  
  console.log(`Normalizing role: "${role}"`);
  
 
  const lowercaseRole = typeof role === 'string' ? role.toLowerCase() : '';
  
 
  if (lowercaseRole.includes('super') && lowercaseRole.includes('admin')) {
    console.log(`Role "${role}" normalized to "superadmin"`);
    return 'superadmin';
  } 
  
  if (lowercaseRole === 'admin') {
    console.log(`Role "${role}" normalized to "admin"`);
    return 'admin';
  } 
  
  if (lowercaseRole === 'student') {
    console.log(`Role "${role}" normalized to "student"`);
    return 'student';
  }
  

  return lowercaseRole;
};

// Create the context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  // Get user's role and token
  const getAuthInfo = useCallback(() => {
    const token = Cookies.get('token');
    const role = Cookies.get('role');
    
    if (!token) {
      console.warn('No authentication token found in cookies');
    } else {
      console.log(`Token found (length: ${token.length}), first 10 chars: ${token.substring(0, 10)}...`);
    }
    
    if (!role) {
      console.warn('No role found in cookies');
    } else {
      console.log(`Role found: ${role}`);
    }
    
    const normalizedRole = normalizeRole(role);
    
    return { token, role: normalizedRole };
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (limit = 10, offset = 0) => {
    setLoading(true);
    setError(null);

    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    
    // Use defaults if parameters are invalid
    const finalLimit = !isNaN(limitNum) ? limitNum : 10;
    const finalOffset = !isNaN(offsetNum) ? offsetNum : 0;

    const { token, role } = getAuthInfo();
    console.log(`Fetching notifications for ${role} user, limit: ${finalLimit}, offset: ${finalOffset}`);
    console.log(`Using API URL: ${API_URL}`);

    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return [];
    }

    try {
      const response = await axios.get(`${API_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          limit: finalLimit,
          offset: finalOffset,
        },
      });  
      const fetchedNotifications = response.data.data || [];
       
      setLastFetched(new Date());
      return fetchedNotifications;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
      
      // Handle token expiration
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('Token expired or invalid, redirecting to login page');
        
        // Clear cookies
        Cookies.remove('token');
        Cookies.remove('role');
        
        // Redirect to login page after a small delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Fetch unread count
  const countUnreadNotifications = useCallback(async () => {
    const { token, role } = getAuthInfo();

    if (!token) {
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Error counting unread notifications:', err);
      console.error('Error details:', err.response || err.message);
    }
  }, [API_URL]);


  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { token } = getAuthInfo();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      
      const response = await axios.put(
        `${API_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        return true;
      } else {
        console.error('API reported error:', response.data.message);
        return false;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      
      // Handle token expiration
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('Token expired or invalid, redirecting to login page');
        
        // Clear cookies
        Cookies.remove('token');
        Cookies.remove('role');
        
        // Redirect to login page after a small delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
      
      return false;
    }
  }, [API_URL]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { token, role } = getAuthInfo();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.put(
        `${API_URL}/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
        
       
        return true;
      } else {
        console.error('API reported error:', response.data.message);
        return false;
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      
      // Handle token expiration
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('Token expired or invalid, redirecting to login page');
        
        // Clear cookies
        Cookies.remove('token');
        Cookies.remove('role');
        
        // Redirect to login page after a small delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
      
      return false;
    }
  }, [API_URL]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { token } = getAuthInfo();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
  
      
      const response = await axios.delete(
        `${API_URL}/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        // Find if notification was unread before removing from state
        const wasUnread = notifications.find(n => n.id === parseInt(notificationId) && !n.is_read);
        
        // Update local state
        setNotifications(prev => 
          prev.filter(notification => notification.id !== parseInt(notificationId))
        );
        
        // Update unread count if the deleted notification was unread
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return true;
      } else {
        console.error('API reported error:', response.data.message);
        return false;
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      
      // Handle token expiration
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log('Token expired or invalid, redirecting to login page');
        
        // Clear cookies
        Cookies.remove('token');
        Cookies.remove('role');
        
        // Redirect to login page after a small delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
      
      return false;
    }
  }, [API_URL, notifications]);

  // Load initial data
  useEffect(() => {
    const { token, role } = getAuthInfo();
    
    if (token) {
      console.log(`Initial loading for ${role} user...`);
      
      // Slightly delay the initial loads to ensure cookies/auth are ready
      const initialLoadTimeout = setTimeout(() => {
        countUnreadNotifications();
        // When called with no arguments, we should still update the notifications state
        fetchNotifications(10, 0).then(data => {
          setNotifications(data || []);
        });
      }, 500);
      
      return () => clearTimeout(initialLoadTimeout);
    } else {
      console.log('No token found, skipping initial load');
    }
  }, [fetchNotifications, countUnreadNotifications]);

  // Setup polling for unread count and new notifications (every 30 seconds)
  useEffect(() => {
    const { token, role } = getAuthInfo();
    if (!token) return;
    
    console.log(`Setting up notification polling for ${role} user...`);
    
    const interval = setInterval(() => {
      console.log('Polling for new notifications...');
      countUnreadNotifications();
      
      // Optionally refresh notifications list if the panel is open
      if (notifications.length > 0) {
        fetchNotifications(10, 0).then(data => {
          setNotifications(data || []);
        });
      }
    }, 30000); // 30 seconds
    
    return () => {
      console.log('Clearing notification polling interval');
      clearInterval(interval);
    }
  }, [fetchNotifications, countUnreadNotifications, notifications.length]);

  // Provide the context value
  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    lastFetched,
    fetchNotifications,
    countUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 