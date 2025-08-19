"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Download, X, ChevronLeft, ChevronRight, Search, Users, Activity, Clock, Filter } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const AdminActivityDetail = ({ report, onClose, onDownload }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState(report.data);
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
            limit: pageSize,
            sort_by: 'created_at',
            sort_order: 'DESC',
            search: searchTerm
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
  }, [selectedTimeframe, selectedAction, currentPage, pageSize, searchTerm]);

  const activities = data.activities || [];
  const summary = data.summary || {};
  const pagination = data.pagination || {};

  const timeframes = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const actionTypes = useMemo(() => {
    const uniqueActions = new Set(activities.map(activity => activity.action));
    const defaultActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
    defaultActions.forEach(action => uniqueActions.add(action));
    
    return [
      { value: 'all', label: 'All Actions' },
      ...Array.from(uniqueActions)
        .sort()
        .map(action => ({ 
          value: action, 
          label: action.charAt(0) + action.slice(1).toLowerCase() 
        }))
    ];
  }, [activities]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
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
      case 'LOGIN_FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Admin Activity Report",
      description: "Detailed tracking of all administrative actions and changes in the system",
      summary: {
        total_activities: summary.total_activities || 0,
        active_admins: summary.active_admins || 0,
        activities_today: summary.activities_today || 0,
        most_common_action: summary.most_common_action || 'N/A'
      },
      activities: activities.map(activity => ({
        admin_name: activity.admin_name,
        user_email: activity.user_email,
        role_name: activity.role_name,
        action: activity.action,
        entity_type: activity.entity_type,
        created_at: activity.created_at
      }))
    };

    try {
      await generatePdfReport(10, reportData); // 10 is the report ID for Admin Activity
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">Admin Activity Report</h2>
              <p className="text-sm text-black/70">Track and monitor all admin activities</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-black">Total Activities</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summary.total_activities || 0}</p>
              <p className="text-sm text-black/70">All recorded actions</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-black">Active Admins</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summary.active_admins || 0}</p>
              <p className="text-sm text-black/70">Currently active administrators</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-medium text-black">Today's Activities</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summary.activities_today || 0}</p>
              <p className="text-sm text-black/70">Activities in the last 24 hours</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-medium text-black">Most Common Action</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summary.most_common_action || 'N/A'}</p>
              <p className="text-sm text-black/70">Most frequent activity type</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by admin, action, or entity type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2 border rounded w-full text-black placeholder-black/60"
              />
            </div>
            <select
              value={selectedTimeframe}
              onChange={(e) => {
                setSelectedTimeframe(e.target.value);
                setCurrentPage(1);
              }}
              className="border rounded p-2 text-black bg-white"
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
              className="border rounded p-2 text-black bg-white"
            >
              {actionTypes.map(action => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border rounded p-2 text-black bg-white"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              <div className="overflow-auto max-h-[50vh]">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 sticky top-0">
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
                          <div className="text-sm font-medium text-black">
                            {activity.admin_name}
                          </div>
                          <div className="text-sm text-black/70">
                            {activity.user_email}
                          </div>
                          <div className="text-xs text-black/50">
                            {activity.role_name}
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
                  <div className="text-sm text-black">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.totalItems)} of {pagination.totalItems} entries
                    {(searchTerm || selectedAction !== 'all') && ' (filtered)'}
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminActivityDetail;