import React, { useState, useEffect } from 'react';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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
            action: selectedAction !== 'all' ? selectedAction : undefined,
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
        activities: activitiesResponse.data.data?.activities || [],
        summary: summaryResponse.data.data || {},
        pagination: activitiesResponse.data.data?.pagination || { totalPages: 1, currentPage: 1 }
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

  const handleDownload = async () => {
    try {
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
          admin_name: activity.admin_name,
          user_email: activity.user_email,
          role_name: activity.user_role,
          action: activity.action,
          entity_type: activity.entity_type,
          created_at: activity.created_at
        }))
      };

      await generatePdfReport(10, reportData); // 10 is the report ID for Admin Activity
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Admin Activity Report</h2>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>

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
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Entity Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
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
                      <div className="text-sm text-black">
                        {activity.user_email}
                      </div>
                      <div className="text-xs text-black">
                        {activity.user_role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {activity.entity_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {formatDate(activity.created_at)}
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