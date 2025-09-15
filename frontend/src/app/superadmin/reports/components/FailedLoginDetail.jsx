"use client";

import { useState, useEffect } from 'react';
import { X, Download, Shield, Lock, AlertTriangle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function FailedLoginDetail({ report, onClose, onDownload }) {
  const formatNumber = (num) => {
    if (num === undefined || num === null) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const [timeFilter, setTimeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDateRange = (filter) => {
    const now = new Date();
    const start = new Date();
    
    switch (filter) {
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const endYesterday = new Date(start);
        endYesterday.setHours(23, 59, 59, 999);
        return { start, end: endYesterday };
      case 'last7days':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'last30days':
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      default:
        return null;
    }
  };

  const fetchFilteredData = async (filter) => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const dateRange = getDateRange(filter);
      let url = '/api/reports/failed-login';
      
      if (dateRange) {
        const params = new URLSearchParams({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        });
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data && response.data.success) {
        setFilteredData(response.data.data);
      } else {
        setFilteredData(report.data); // Fallback to original data
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
      setFilteredData(report.data); // Fallback to original data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeFilter !== 'all') {
      fetchFilteredData(timeFilter);
    } else {
      setFilteredData(report.data);
    }
    setCurrentPage(1); // Reset to first page when filter changes
  }, [timeFilter]);

  const handleTimeFilterChange = (filter) => {
    setTimeFilter(filter);
  };

  const getTotalPages = () => {
    if (!filteredData || !filteredData.recent_attempts) return 1;
    return Math.ceil(filteredData.recent_attempts.length / itemsPerPage);
  };

  const getCurrentPageData = () => {
    if (!filteredData || !filteredData.recent_attempts) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.recent_attempts.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDownload = async () => {
    const dataToUse = filteredData || report.data;
    const reportData = {
      title: "Failed Login Report",
      description: `Analysis of failed login attempts and account lockouts across the system${timeFilter !== 'all' ? ` (${timeFilter.replace('last', 'Last ').replace('days', ' days').replace('yesterday', 'Yesterday')})` : ''}`,
      summary: {
        total_attempts: dataToUse.total_attempts,
        locked_accounts: dataToUse.locked_accounts
      },
      recent_attempts: dataToUse.recent_attempts.map(attempt => ({
        timestamp: formatDate(attempt.timestamp),
        email: attempt.email,
        reason: attempt.reason || 'Invalid credentials',
        status: attempt.status
      }))
    };

    try {
      // Use report ID 3 for Failed Login Report
      await generatePdfReport(3, reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
                <p className="text-sm text-gray-500">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[#01579B] text-white rounded-lg hover:bg-[#01416E] transition-colors"
              >
                <Download className="h-5 w-5" />
                Download PDF
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {report.data ? (
            <>
              {/* Time Filter Buttons */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by time period:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'last7days', label: 'Last 7 Days' },
                    { key: 'last30days', label: 'Last 30 Days' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleTimeFilterChange(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeFilter === key
                          ? 'bg-[#01579B] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Failed Attempts</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        {loading ? '...' : formatNumber((filteredData || report.data).total_attempts)}
                      </h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locked Accounts</p>
                      <h3 className="text-2xl font-bold text-orange-600 mt-1">
                        {loading ? '...' : formatNumber((filteredData || report.data).locked_accounts)}
                      </h3>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Failed Attempts Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Failed Login Attempts</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {loading ? 'Loading...' : `Showing ${getCurrentPageData().length} of ${(filteredData || report.data).recent_attempts?.length || 0} attempts`}
                      </p>
                    </div>
                    {loading && (
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#01579B]"></div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {getCurrentPageData().map((attempt, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(attempt.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attempt.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {attempt.reason || 'Invalid credentials'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              attempt.status === 'locked' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {attempt.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {getTotalPages() > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Page {currentPage} of {getTotalPages()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              currentPage === page
                                ? 'bg-[#01579B] text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === getTotalPages()}
                          className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available for this report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}