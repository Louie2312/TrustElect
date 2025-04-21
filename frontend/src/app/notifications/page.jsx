"use client";
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Check, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();
  
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allNotifications, setAllNotifications] = useState([]);
  const [userRole, setUserRole] = useState('');
  const itemsPerPage = 20;

  useEffect(() => {
    const role = Cookies.get('role');
    setUserRole(role || '');
  }, []);

  // Get dashboard URL based on user role
  const getDashboardUrl = () => {
    switch(userRole?.toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'superadmin':
        return '/superadmin';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  // Fetch all notifications with pagination
  useEffect(() => {
    const loadNotifications = async () => {
      const newNotifications = await fetchNotifications(itemsPerPage, (page - 1) * itemsPerPage);
      
      if (page === 1) {
        setAllNotifications(newNotifications);
      } else {
        setAllNotifications(prev => [...prev, ...newNotifications]);
      }
      
      // Check if we've reached the end
      if (newNotifications.length < itemsPerPage) {
        setHasMore(false);
      }
    };
    
    loadNotifications();
  }, [fetchNotifications, page]);

  // Filter notifications based on selected filter
  const filteredNotifications = allNotifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  // Get icon based on notification type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'info':
        return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
      case 'success':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'warning':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  // Generate notification link based on type and user role
  const getNotificationLink = (notification) => {
    const { related_entity, entity_id } = notification;
    
    if (!related_entity || !entity_id) return '#';
    
    // Get current user role
    const role = userRole?.toLowerCase();
    
    switch (related_entity) {
      case 'election':
        if (role === 'superadmin') {
          return `/superadmin/elections/${entity_id}`;
        } else if (role === 'student') {
          return `/student/elections/${entity_id}`;
        } else {
          return `/admin/election/${entity_id}`;
        }
      case 'ballot':
        if (role === 'superadmin') {
          return `/superadmin/elections/${entity_id}/ballot`;
        } else {
          return `/admin/election/${entity_id}/ballot`;
        }
      case 'vote':
        return `/student/elections/${entity_id}`;
      case 'result':
        if (role === 'superadmin') {
          return `/superadmin/elections/${entity_id}/results`;
        } else if (role === 'student') {
          return `/student/elections/${entity_id}/results`;
        } else {
          return `/admin/election/${entity_id}/results`;
        }
      default:
        return '#';
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    router.push(getNotificationLink(notification));
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchNotifications(itemsPerPage, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={getDashboardUrl()} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="Refresh notifications"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          {/* Filters */}
          <div className="px-6 py-3 bg-gray-50 border-b">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Read
              </button>
            </div>
          </div>
          
          {/* Notification List */}
          <div className="divide-y divide-gray-100">
            {loading && page === 1 ? (
              <div className="p-10 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-500">
                  {filter === 'all'
                    ? 'No notifications'
                    : filter === 'unread'
                    ? 'No unread notifications'
                    : 'No read notifications'}
                </p>
              </div>
            ) : (
              <>
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors relative ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div 
                      className="flex cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0 mt-1 mr-4">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center mr-4"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark as read
                            </button>
                          )}
                          <span className="text-xs text-gray-500">
                            {notification.related_entity && (
                              <>Related to: {notification.related_entity}</>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className={`px-4 py-2 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 