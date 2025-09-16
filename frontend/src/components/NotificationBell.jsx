"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2, RefreshCw } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const normalizeRole = (role) => {
  if (!role) return '';
 
  if (typeof role === 'string' && role.toLowerCase().includes('super') && role.toLowerCase().includes('admin')) {
    return 'superadmin';
  }
  
  const lowercaseRole = role.toLowerCase();
  
  if (lowercaseRole === 'admin') {
    return 'admin';
  } else if (lowercaseRole === 'student') {
    return 'student';
  }
  
  return lowercaseRole;
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [deletingNotificationIds, setDeletingNotificationIds] = useState([]);
  const [votedElections, setVotedElections] = useState({});
  const [checkingVoteStatus, setCheckingVoteStatus] = useState({});
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);
  const notifListRef = useRef(null);
  const itemsPerPage = 10;
  const router = useRouter();

  // Get user role from cookies
  useEffect(() => {
    const role = Cookies.get('role');
    setUserRole(role || '');
    console.log(`User role from cookie: ${role}`);
    console.log(`Normalized role: ${normalizeRole(role)}`);
  }, []);

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    countUnreadNotifications
  } = useNotifications();

  const normalizedUserRole = normalizeRole(userRole);

  const toggleDropdown = () => {
    if (!isOpen) {
    
      setPage(1);
      setHasMore(true);
      setAllNotifications([]);
      setLoading(true);
     
      const limit = Number(itemsPerPage);
      const offset = 0;
      
     
      
      fetchNotifications(limit, offset).then(data => {
        
        if (data.length > 0) {
          
        }   
        setAllNotifications(data || []);
        setLoading(false);
        setHasMore(data && data.length >= itemsPerPage);
      }).catch(err => {
        console.error('Error fetching notifications:', err);
        setLoading(false);
      });
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      countUnreadNotifications();
    }
  };

  const handleClickOutside = (event) => {

    if (
      dropdownRef.current && 
      !dropdownRef.current.contains(event.target) && 
      modalRef.current && 
      !modalRef.current.contains(event.target)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!notifListRef.current || loading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = notifListRef.current;

      if (scrollHeight - scrollTop - clientHeight < 50) {
        handleLoadMore();
      }
    };
    
    const listElement = notifListRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (listElement) {
        listElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading, hasMore]);

  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Ensure we're passing numeric values
    const limit = Number(itemsPerPage);
    const offset = Number(page * itemsPerPage);
    
    
    fetchNotifications(limit, offset)
      .then(newNotifications => {
        if (newNotifications && newNotifications.length > 0) {
         
          setAllNotifications(prev => [...prev, ...newNotifications]);
          setPage(prev => prev + 1);
          setHasMore(newNotifications.length >= itemsPerPage);
        } else {
          setHasMore(false);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading more notifications:', error);
        setLoading(false);
      });
  };

  const filteredNotifications = allNotifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  const checkIfVoted = async (electionId) => {
    if (normalizedUserRole !== 'student') return false;

    if (votedElections[electionId] !== undefined) {
      return votedElections[electionId];
    }
    
  
    if (checkingVoteStatus[electionId]) return false;
    
    try {
      setCheckingVoteStatus(prev => ({ ...prev, [electionId]: true }));
      
      const token = Cookies.get('token');
      const userId = Cookies.get('userId');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      
     
      const response = await fetch(`${API_URL}/elections/student/status/${electionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error checking election status: ${response.status}`);
      }
      
      const data = await response.json();
      const hasVoted = data.hasVoted || false;
    
      setVotedElections(prev => ({ ...prev, [electionId]: hasVoted }));
      return hasVoted;
    } catch (error) {
      console.error(`Error checking vote status for election ${electionId}:`, error);
      return false;
    } finally {
      setCheckingVoteStatus(prev => ({ ...prev, [electionId]: false }));
    }
  };

  const getNotificationLink = async (notification) => {
    const { entity_type, entity_id, notification_type } = notification;
    const normalizedRole = normalizeRole(userRole);
  
    const baseRoutes = {
      student: '/student/elections',
      admin: '/admin/election',
      superadmin: '/superadmin/election'
    };
    
    const baseRoute = baseRoutes[normalizedRole] || '/';
    
    // Handle election-related notifications
    if (entity_type === 'ELECTION') {
      // For students
      if (normalizedRole === 'student') {
        try {
       
          const token = Cookies.get('token');
          const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
          
         
          const electionResponse = await fetch(`${API_URL}/elections/${entity_id}/details`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!electionResponse.ok) {
            throw new Error(`Error fetching election details: ${electionResponse.status}`);
          }
          
          const electionData = await electionResponse.json();
          
       
          let electionDetails;
          if (electionData.data) {
            electionDetails = electionData.data;
          } else if (electionData.success && electionData.election) {
            electionDetails = electionData.election;
          } else if (electionData.id) {
         
            electionDetails = electionData;
          } else {
            console.error('Unexpected election data format:', electionData);
      
            electionDetails = { status: 'unknown' };
          }
          
          console.log('Processed election details:', electionDetails);
          
         
          const electionStatus = electionDetails.status?.toLowerCase() || '';
          console.log(`Election status: ${electionStatus}`);
          
        
          const studentStatusResponse = await fetch(`${API_URL}/elections/student/status/${entity_id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!studentStatusResponse.ok) {
            throw new Error(`Error checking student election status: ${studentStatusResponse.status}`);
          }
          
          const studentData = await studentStatusResponse.json();
          const hasVoted = studentData.hasVoted || false;
      
          if (electionStatus === 'ongoing') {
            if (hasVoted) {
              return `${baseRoute}/${entity_id}/receipt`; 
            } else {
              return `${baseRoute}/${entity_id}/vote`;
            }
          } else if (electionStatus === 'completed') {
            return `${baseRoute}/${entity_id}/results`; 
          } else if (electionStatus === 'upcoming') {
            return `${baseRoute}/${entity_id}`; 
          }
        } catch (error) {
          console.error('Error determining correct notification link:', error);
          // Fall back to basic routing if there's an error
        }
      
        if (notification.message.includes('started')) {
          return `${baseRoute}/${entity_id}/vote`;
        }
        if (notification.message.includes('results') || notification.message.includes('completed')) {
          return `${baseRoute}/${entity_id}/results`;
        }
        if (notification.message.includes('receipt') || notification.message.includes('voted')) {
          return `${baseRoute}/${entity_id}/receipt`;
        }
      
        return `${baseRoute}/${entity_id}`;
      }
      
      // For admins
      if (normalizedRole === 'admin') {
       
        if (notification.message.includes('approved') || notification.message.includes('rejected')) {
          return `${baseRoute}/details/${entity_id}`;
        }
     
        return `${baseRoute}/${entity_id}`;
      }
      
      // For superadmins
      if (normalizedRole === 'superadmin') {
        // Approval requests
        if (notification.message.includes('needs approval')) {
          return `${baseRoute}/approve/${entity_id}`;
        }
        // Default to election details
        return `${baseRoute}/${entity_id}`;
      }
      
      // Default election link
      return `${baseRoute}/${entity_id}`;
    }

    if (entity_type === 'BALLOT') {
      if (normalizedRole === 'admin') {
        return `/admin/election/details/${entity_id}`;
      }
      if (normalizedRole === 'superadmin') {
        return `/superadmin/election/${entity_id}`;
      }
      return baseRoute;
    }
 
    if (entity_type === 'VOTE') {
      if (normalizedRole === 'student') {
        return `${baseRoute}/vote/${entity_id}`;
      }
      return baseRoute;
    }
  
    if (entity_type === 'RESULT') {
      if (normalizedRole === 'student') {
        return `${baseRoute}/results/${entity_id}`;
      }
      if (normalizedRole === 'admin' || normalizedRole === 'superadmin') {
        return `${baseRoute}/${entity_id}/results`;
      }
      return baseRoute;
    }
    
    return baseRoute;
  };

  const handleNotificationClick = async (notification) => {
    try {
  
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      const { entity_type, entity_id } = notification;
      
      if (!entity_id) {
        console.error('Missing entity_id in notification:', notification);
  
        const idMatch = notification.message.match(/\b(\d+)\b/);
        const extractedId = idMatch ? idMatch[0] : null;
        
        if (extractedId) {
          console.log(`Extracted ID ${extractedId} from notification message`);
          notification.entity_id = extractedId;
        } else {
          console.error('Could not extract ID from notification message');
        
          router.push('/student/elections');
          setIsOpen(false);
          return;
        }
      }
      
  
      const normalizedRole = normalizeRole(userRole);
      console.log(`Using role: ${normalizedRole} for navigation`);
      

      if (normalizedRole === 'student') {
        try {
          const token = Cookies.get('token');
          const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
          
          console.log(`Processing notification with entity_id: ${notification.entity_id}`);
          
   
          const electionResponse = await fetch(`${API_URL}/elections/${notification.entity_id}/details`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!electionResponse.ok) {
            throw new Error(`Error fetching election details: ${electionResponse.status}`);
          }
          
          const electionData = await electionResponse.json();
          console.log('Raw election API response:', JSON.stringify(electionData));
        
          let electionDetails;
          if (electionData.data) {
            electionDetails = electionData.data;
          } else if (electionData.success && electionData.election) {
            electionDetails = electionData.election;
          } else if (electionData.id) {
         
            electionDetails = electionData;
          } else {
            console.error('Unexpected election data format:', electionData);
  
            electionDetails = { status: 'unknown' };
          }
          
        
          const electionStatus = electionDetails.status?.toLowerCase() || '';
       
          const eligibilityResponse = await fetch(`${API_URL}/elections/${notification.entity_id}/student-eligible`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!eligibilityResponse.ok) {
            throw new Error(`Error checking student eligibility: ${eligibilityResponse.status}`);
          }
          
          const eligibilityData = await eligibilityResponse.json();
          console.log('Student eligibility data (raw):', JSON.stringify(eligibilityData));
          

          let hasVoted = false;

          if (eligibilityData.hasVoted !== undefined) {
            hasVoted = Boolean(eligibilityData.hasVoted);
            
          } else if (eligibilityData.eligible === true && eligibilityData.message && eligibilityData.message.toLowerCase().includes('already voted')) {
            hasVoted = true;
            
          }

          if (!hasVoted) {
        
            const statusResponse = await fetch(`${API_URL}/elections/student/status/${notification.entity_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log('Student status data (raw):', JSON.stringify(statusData));
            
              if (statusData.hasVoted !== undefined) {
                hasVoted = Boolean(statusData.hasVoted);
                console.log('Setting hasVoted from status endpoint:', hasVoted);
              } else if (statusData.data && statusData.data.hasVoted !== undefined) {
                hasVoted = Boolean(statusData.data.hasVoted);
                console.log('Setting hasVoted from status data object:', hasVoted);
              } else if (statusData.eligible && statusData.vote_receipt_url) {
                hasVoted = true;
                console.log('Setting hasVoted based on status vote_receipt_url existence');
              }
            }
          }
          
         
          if (!hasVoted && notification.message) {
            const voteIndicators = [
              'voted',
              'receipt',
              'cast',
              'ballot submitted',
              'vote received',
              'thanks for voting'
            ];
            
            const messageLC = notification.message.toLowerCase();
            const hasVoteIndicator = voteIndicators.some(indicator => messageLC.includes(indicator));
            
            if (hasVoteIndicator) {
              hasVoted = true;
            
            }
          }
          
          console.log(`FINAL hasVoted value: ${hasVoted}`);
          
        
          let targetUrl;
          
          if (electionStatus === 'ongoing') {
            if (hasVoted) {
          
              targetUrl = `/student/elections/${notification.entity_id}/receipt`;
              
            } else {
       
              targetUrl = `/student/elections/${notification.entity_id}/vote`;
             
            }
          } else if (electionStatus === 'completed') {
         
            targetUrl = `/student/elections/${notification.entity_id}/results`;
            console.log('Election is completed, directing to results page');
          } else if (electionStatus === 'upcoming') {
         
            console.log('Election is upcoming, directing to dashboard');
            router.push('/student');
           
            setTimeout(() => {
              const tabElement = document.querySelector('button[data-status="upcoming"]');
              if (tabElement) {
                tabElement.click();
              }
            }, 500);
            
            setIsOpen(false);
            return;
          } else {
          
            targetUrl = '/student';
          }
        
          router.push(targetUrl);
          setIsOpen(false);
          return;
        } catch (error) {
          console.error('Error handling student notification click:', error);
          // On error, redirect to the student dashboard
          router.push('/student');
          setIsOpen(false);
          return;
        }
      }
      
      const link = await getNotificationLink(notification);
      console.log(`Fallback navigation to: ${link}`);
      router.push(link);

      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
  
      router.push('/student/elections');
      setIsOpen(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    setLoading(true);

    const limit = Number(itemsPerPage);
    const offset = 0;
    
    console.log(`Refreshing notifications with limit=${limit}, offset=${offset}`);
    
    fetchNotifications(limit, offset).then(data => {
      console.log(`Refreshed with ${data.length} notifications`);
      setAllNotifications(data || []);
      setLoading(false);
      setHasMore(data && data.length >= itemsPerPage);
    }).catch(error => {
      console.error('Error refreshing notifications:', error);
      setLoading(false);
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'info':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const renderNotificationDetails = (notification) => {

    const maxMessageLength = 100;
    let message = notification.message;
    
    if (message && message.length > maxMessageLength) {
      message = message.substring(0, maxMessageLength) + '...';
    }
    
    return (
      <div className="w-full">
        <p className="text-sm font-semibold text-gray-900 mb-1">
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 mb-1">
          {message}
        </p>
        <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
          <span>
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
          {!notification.is_read && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              New
            </span>
          )}
        </div>
      </div>
    );
  };

  const handleDeleteNotification = async (notificationId) => {
    try {

      setDeletingNotificationIds(prev => [...prev, notificationId]);
      

      const success = await deleteNotification(notificationId);
      
      if (success) {
        // If successful, remove from local state
        setAllNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
      } else {
        console.error(`Failed to delete notification ${notificationId}`);
        alert('Could not delete notification. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('An error occurred while deleting the notification.');
    } finally {
      // Remove from deleting state regardless of outcome
      setDeletingNotificationIds(prev => 
        prev.filter(id => id !== notificationId)
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="p-1 rounded-full hover:bg-gray-100 focus:outline-none relative"
      >
        <Bell className="h-6 w-6 text-yellow " />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div 
          ref={modalRef}
          className="absolute right-0 mt-2 bg-white rounded-md shadow-lg z-50 flex flex-col overflow-hidden w-[380px] lg:w-[600px] max-h-[600px]"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="text-lg font-medium text-yellow-500">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark all as read
                </button>
              )}
              <button 
                onClick={handleRefresh}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              {/* Close button */}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-2 bg-gray-50 border-b">
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
          <div 
            ref={notifListRef}
            className="overflow-y-auto flex-grow"
          >
            {loading && allNotifications.length === 0 ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>
                  {filter === 'all'
                    ? 'No notifications'
                    : filter === 'unread'
                    ? 'No unread notifications'
                    : 'No read notifications'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors relative ${!notification.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1 mr-3">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-grow">
                        <div 
                          onClick={() => handleNotificationClick(notification)}
                          className="block cursor-pointer"
                        >
                          {renderNotificationDetails(notification)}
                        </div>
                        
                        <div className="mt-2 flex items-center gap-3">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs bg-blue-50 text-blue-600 hover:text-blue-800 px-2 py-1 rounded flex items-center"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark as read
                            </button>
                          )}
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification.id);
                            }}
                            disabled={deletingNotificationIds.includes(notification.id)}
                            className={`text-xs ${
                              deletingNotificationIds.includes(notification.id) 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-gray-50 text-gray-500 hover:text-red-500 hover:bg-red-50'
                            } px-2 py-1 rounded flex items-center transition-colors`}
                            aria-label="Delete notification"
                          >
                            {deletingNotificationIds.includes(notification.id) ? (
                              <div className="w-3 h-3 border-t-2 border-r-2 border-gray-500 rounded-full animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                
                {/* Loading indicator at bottom */}
                {loading && (
                  <li className="p-3 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 