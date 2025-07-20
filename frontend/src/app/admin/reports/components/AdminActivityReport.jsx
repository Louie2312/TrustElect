import React, { useState, useEffect } from 'react';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const AdminActivityReport = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({
    activities: [],
    summary: {},
    pagination: {}
  });
  const [error, setError] = useState(null);

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
            action: selectedAction,
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

      setData({
        activities: activitiesResponse.data.data.activities,
        summary: activitiesResponse.data.data.summary,
        pagination: activitiesResponse.data.data.pagination
      });
    } catch (error) {
      console.error('Error fetching admin activity data:', error);
      setError(error.message || 'Failed to fetch admin activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTimeframe, selectedAction, currentPage]);

  const activities = data.activities || [];
  const summary = data.summary || {};
  const pagination = data.pagination || {};

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
    { value: 'LOGOUT', label: 'Logout' }
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Activity Report</h2>

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
            className="border rounded p-2"
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
            className="border rounded p-2"
          >
            {actionTypes.map(action => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading activities...</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {activity.admin_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.user_email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {activity.user_role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.entity_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        {typeof activity.details === 'object' 
                          ? JSON.stringify(activity.details, null, 2)
                          : activity.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(activity.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activities.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No activities found for the selected filters
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-1 border rounded text-gray-600 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="flex items-center px-3 py-1 border rounded text-gray-600 disabled:opacity-50"
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