import React, { useState, useEffect, useMemo } from 'react';
import { Download, X, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const AdminActivityReport = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({
    activities: [],
    summary: {},
    pagination: {}
  });
  const [error, setError] = useState(null);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          role: 'admin,superadmin,student',
          limit: 1000
        }
      });
      
      if (response.data.success) {
        const users = response.data.data?.users || [];
        // Filter out users with 'Unknown' name and only include admins and students
        const filteredUsers = users.filter(user => 
          user.first_name && 
          user.last_name && 
          user.first_name !== 'Unknown' && 
          user.last_name !== 'Unknown' &&
          (user.role === 'admin' || user.role === 'superadmin' || user.role === 'student')
        );
        setAvailableUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback: try to get users from activities if API fails
      setAvailableUsers([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = Cookies.get("token");
      
      const [activitiesResponse, summaryResponse] = await Promise.all([
        axios.get(`${API_BASE}/reports/admin-activity/activities`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            timeframe: selectedTimeframe,
            action: selectedAction !== 'all' ? selectedAction : undefined,
            user: selectedUser !== 'all' ? selectedUser : undefined,
            page: currentPage,
            limit: 100,
            sort_by: 'created_at',
            sort_order: 'DESC'
          }
        }),
        axios.get(`${API_BASE}/reports/admin-activity/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            timeframe: selectedTimeframe
          }
        })
      ]);

      if (!activitiesResponse.data.success || !summaryResponse.data.success) {
        throw new Error('Failed to fetch admin activity data');
      }

      const activities = activitiesResponse.data.data?.activities || [];
      setData({
        activities: activities,
        summary: summaryResponse.data.data || {},
        pagination: activitiesResponse.data.data?.pagination || { totalPages: 1, currentPage: 1 }
      });

      // Extract users from activities and add to available users
      const activityUsers = activities
        .map(activity => ({
          id: `activity_${activity.admin_name}`,
          first_name: activity.admin_name?.split(' ')[0] || '',
          last_name: activity.admin_name?.split(' ').slice(1).join(' ') || '',
          email: activity.user_email || '',
          role: activity.user_role || 'admin'
        }))
        .filter(user => user.first_name && user.last_name && user.first_name !== 'Unknown');

      // Combine with existing users and remove duplicates
      setAvailableUsers(prevUsers => {
        const combinedUsers = [...prevUsers, ...activityUsers];
        const uniqueUsers = combinedUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.first_name === user.first_name && u.last_name === user.last_name)
        );
        return uniqueUsers;
      });
    } catch (error) {
      console.error('Error fetching admin activity data:', error);
      setError(error.message || 'Failed to fetch admin activity data');
      
      // Set fallback data to prevent complete failure
      setData({
        activities: [],
        summary: {
          total_activities: 0,
          active_admins: 0,
          activities_today: 0,
          most_common_action: 'N/A'
        },
        pagination: { totalPages: 1, currentPage: 1 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedTimeframe, selectedAction, selectedUser, currentPage]);

  const activities = data.activities || [];
  const summary = data.summary || {};
  const pagination = data.pagination || {};

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return availableUsers;
    const searchTerm = userSearchTerm.toLowerCase().trim();
    return availableUsers.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const firstName = user.first_name?.toLowerCase() || '';
      const lastName = user.last_name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      
      return fullName.includes(searchTerm) || 
             firstName.includes(searchTerm) || 
             lastName.includes(searchTerm) ||
             email.includes(searchTerm);
    });
  }, [availableUsers, userSearchTerm]);

  const handleUserSelect = (user) => {
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    setSelectedUser(fullName);
    setUserSearchTerm(fullName);
    setIsUserDropdownOpen(false);
    setCurrentPage(1);
  };

  const handleUserSearchChange = (e) => {
    setUserSearchTerm(e.target.value);
    setIsUserDropdownOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isUserDropdownOpen && !event.target.closest('.relative')) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  const timeframes = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'LOGIN', label: 'Login' },
    { value: 'LOGOUT', label: 'Logout' },
    { value: 'APPROVE', label: 'Approve' },
    { value: 'REJECT', label: 'Reject' },
    { value: 'PUBLISH', label: 'Publish' },
    { value: 'UNPUBLISH', label: 'Unpublish' },
    { value: 'START', label: 'Start' },
    { value: 'END', label: 'End' },
    { value: 'CANCEL', label: 'Cancel' }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-orange-100 text-orange-800';
      case 'APPROVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECT':
        return 'bg-rose-100 text-rose-800';
      case 'PUBLISH':
        return 'bg-indigo-100 text-indigo-800';
      case 'UNPUBLISH':
        return 'bg-slate-100 text-slate-800';
      case 'START':
        return 'bg-lime-100 text-lime-800';
      case 'END':
        return 'bg-amber-100 text-amber-800';
      case 'CANCEL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionDescription = (activity) => {
    const { action, entity_type, admin_name, created_at } = activity;
    const timestamp = new Date(created_at).toLocaleString();
    
    switch (action) {
      case 'CREATE':
        switch (entity_type) {
          case 'election':
            return `${admin_name} created a new election on ${timestamp}`;
          case 'candidate':
            return `${admin_name} added a new candidate on ${timestamp}`;
          case 'user':
            return `${admin_name} created a new user account on ${timestamp}`;
          case 'ballot':
            return `${admin_name} created a new ballot on ${timestamp}`;
          case 'position':
            return `${admin_name} created a new position on ${timestamp}`;
          default:
            return `${admin_name} created a new ${entity_type} on ${timestamp}`;
        }
      case 'UPDATE':
        switch (entity_type) {
          case 'election':
            return `${admin_name} updated election details on ${timestamp}`;
          case 'candidate':
            return `${admin_name} modified candidate information on ${timestamp}`;
          case 'user':
            return `${admin_name} updated user profile on ${timestamp}`;
          case 'ballot':
            return `${admin_name} modified ballot configuration on ${timestamp}`;
          case 'position':
            return `${admin_name} updated position details on ${timestamp}`;
          case 'content':
            return `${admin_name} updated website content on ${timestamp}`;
          default:
            return `${admin_name} updated ${entity_type} on ${timestamp}`;
        }
      case 'DELETE':
        switch (entity_type) {
          case 'election':
            return `${admin_name} deleted an election on ${timestamp}`;
          case 'candidate':
            return `${admin_name} removed a candidate on ${timestamp}`;
          case 'user':
            return `${admin_name} deleted a user account on ${timestamp}`;
          case 'ballot':
            return `${admin_name} deleted a ballot on ${timestamp}`;
          case 'position':
            return `${admin_name} removed a position on ${timestamp}`;
          default:
            return `${admin_name} deleted ${entity_type} on ${timestamp}`;
        }
      case 'LOGIN':
        return `${admin_name} logged into the system on ${timestamp}`;
      case 'LOGOUT':
        return `${admin_name} logged out of the system on ${timestamp}`;
      case 'APPROVE':
        switch (entity_type) {
          case 'election':
            return `${admin_name} approved an election on ${timestamp}`;
          case 'user':
            return `${admin_name} approved a user account on ${timestamp}`;
          default:
            return `${admin_name} approved ${entity_type} on ${timestamp}`;
        }
      case 'REJECT':
        switch (entity_type) {
          case 'election':
            return `${admin_name} rejected an election on ${timestamp}`;
          case 'user':
            return `${admin_name} rejected a user account on ${timestamp}`;
          default:
            return `${admin_name} rejected ${entity_type} on ${timestamp}`;
        }
      case 'PUBLISH':
        return `${admin_name} published an election on ${timestamp}`;
      case 'UNPUBLISH':
        return `${admin_name} unpublished an election on ${timestamp}`;
      case 'START':
        return `${admin_name} started an election on ${timestamp}`;
      case 'END':
        return `${admin_name} ended an election on ${timestamp}`;
      case 'CANCEL':
        return `${admin_name} cancelled an election on ${timestamp}`;
      default:
        return `${admin_name} performed ${action} on ${entity_type} on ${timestamp}`;
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setPdfStatus(null);
      
      // Check if we have data to generate report
      if (!data.activities || data.activities.length === 0) {
        setPdfStatus({ type: 'error', message: 'No data available to generate report. Please try different filters.' });
        setTimeout(() => setPdfStatus(null), 5000);
        return;
      }
      
      const reportData = {
        title: "Admin Activity Report",
        description: "Detailed tracking of all administrative actions and changes in the system",
        summary: {
          total_activities: data.summary.total_activities || 0,
          active_admins: data.summary.active_admins || 0,
          activities_today: data.summary.activities_today || 0,
          most_common_action: data.summary.most_common_action || 'N/A'
        },
        activities: data.activities.map(activity => ({
          admin_name: activity.admin_name || 'Unknown',
          user_email: activity.user_email || 'N/A',
          role_name: activity.user_role || 'N/A',
          action: activity.action || 'Unknown',
          entity_type: activity.entity_type || 'Unknown',
          created_at: new Date(activity.created_at) // Convert string to Date object
        }))
      };

      const result = await generatePdfReport(10, reportData); // 10 is the report ID for Admin Activity
      
      if (result.success) {
        console.log('PDF generated successfully:', result.filename);
        setPdfStatus({ type: 'success', message: 'PDF report generated successfully!' });
        setTimeout(() => setPdfStatus(null), 3000);
      } else {
        console.error('PDF generation failed:', result.message);
        setPdfStatus({ type: 'error', message: result.message });
        setTimeout(() => setPdfStatus(null), 5000);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      setPdfStatus({ type: 'error', message: 'Failed to generate PDF report. Please try again.' });
      setTimeout(() => setPdfStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Admin Activity Report</h2>
          <button
            onClick={handleDownload}
            disabled={loading || !data.activities || data.activities.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              loading || !data.activities || data.activities.length === 0
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#01579B] hover:bg-[#01416E]'
            } text-white`}
          >
            <Download className="w-4 h-4" />
            {loading ? 'Generating PDF...' : 'Download Report'}
          </button>
        </div>

        {pdfStatus && (
          <div className={`mb-4 p-3 rounded ${
            pdfStatus.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {pdfStatus.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Total Activities</h3>
            <p className="text-2xl font-bold text-gray-800">{summary.total_activities || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Active Admins</h3>
            <p className="text-2xl font-bold text-gray-800">{summary.active_admins || 0}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Activities Today</h3>
            <p className="text-2xl font-bold text-gray-800">{summary.activities_today || 0}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Most Common Action</h3>
            <p className="text-2xl font-bold text-gray-800">{summary.most_common_action || 'N/A'}</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <select
            value={selectedTimeframe}
            onChange={(e) => {
              setSelectedTimeframe(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded p-2 text-black"
          >
            {timeframes.map(timeframe => (
              <option key={timeframe.value} value={timeframe.value}>
                {timeframe.label}
              </option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setCurrentPage(1);
            }}
            className="border rounded p-2 text-black"
          >
            {actionTypes.map(action => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={userSearchTerm}
                onChange={handleUserSearchChange}
                onFocus={() => setIsUserDropdownOpen(true)}
                placeholder="Search users..."
                className="border rounded p-2 pr-8 text-black w-full"
              />
              {userSearchTerm ? (
                <button
                  onClick={() => {
                    setUserSearchTerm('');
                    setSelectedUser('all');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
            </div>
            
            {isUserDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-black"
                  onClick={() => {
                    setSelectedUser('all');
                    setUserSearchTerm('');
                    setIsUserDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  All Users
                </div>
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-black"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                    <div className="text-xs text-gray-400 capitalize">{user.role || 'admin'}</div>
                  </div>
                ))}
                {filteredUsers.length === 0 && userSearchTerm && (
                  <div className="px-3 py-2 text-gray-500">
                    No users found for "{userSearchTerm}"
                    {availableUsers.length > 0 && (
                      <div className="text-xs mt-1">
                        Available users: {availableUsers.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-2 text-black">Loading activities...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="overflow-auto max-h-[50vh]">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Time Stamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Action Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Details/Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {formatDate(activity.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.admin_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.user_email || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.user_role || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.entity_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-black">
                        {getActionDescription(activity)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activities.length === 0 && !loading && (
            <div className="text-center py-8 text-black">
              No activities found for the selected filters
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-1 border rounded text-black disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <span className="text-sm text-black">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="flex items-center px-3 py-1 border rounded text-black disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminActivityReport; 