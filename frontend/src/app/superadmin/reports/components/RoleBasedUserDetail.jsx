"use client";

import { useState, useMemo, useEffect } from 'react';
import { X, Download, Users, ArrowUpRight, ArrowDownRight, Activity, ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import { generateReport } from '@/utils/reportGenerator';

export default function RoleBasedUserDetail({ report, onClose, onDownload }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    // Function to handle scroll event
    const handleScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      setShowScrollButton(scrollTop > 300); // Show button when scrolled down 300px
    };

    // Add scroll event listener to the modal content
    const modalContent = document.getElementById('role-based-detail-content');
    if (modalContent) {
      modalContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      // Cleanup scroll event listener
      if (modalContent) {
        modalContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToTop = () => {
    const modalContent = document.getElementById('role-based-detail-content');
    if (modalContent) {
      modalContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  };

  const calculatePercentage = (value, total) => {
    // Parse the values and remove commas if they exist
    const parsedValue = parseFloat(String(value).replace(/,/g, '')) || 0;
    const parsedTotal = parseFloat(String(total).replace(/,/g, '')) || 0;
    
    if (!parsedTotal) return "0.00";
    return ((parsedValue / parsedTotal) * 100).toFixed(2);
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!report.data?.users) return [];
    return report.data.users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [report.data?.users, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    const newPageSize = parseInt(event.target.value);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Role Based User Report",
      description: "Comprehensive overview of user distribution across different roles",
      summary: {
        total_users: report.data.summary.total_users,
        active_users: report.data.summary.active_users,
        inactive_users: report.data.summary.inactive_users
      },
      role_distribution: report.data.role_distribution.map(role => ({
        role_name: role.role_name,
        total_users: role.total_users,
        active_users: role.active_users,
        inactive_users: role.inactive_users,
        distribution_percentage: calculatePercentage(role.total_users, report.data.summary.total_users)
      })),
      users: filteredUsers.map(user => ({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status
      }))
    };

    try {
      await generateReport(2, reportData); // 2 is the report ID for Role Based User
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
      <div className="bg-white rounded-lg w-full max-w-5xl mx-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E3F2FD] rounded-lg">
                <Users className="h-6 w-6 text-[#01579B]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">{report.title}</h2>
                <p className="text-sm text-black">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[#01579B] text-white rounded-lg hover:bg-[#01416E] transition-colors"
              >
                <Download className="h-5 w-5" />
                Download Word
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

        <div id="role-based-detail-content" className="p-6 max-h-[70vh] overflow-y-auto relative">
          {report.data ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-black">Total Users</p>
                      <h3 className="text-2xl font-bold text-black mt-1">
                        {formatNumber(report.data.summary.total_users)}
                      </h3>
                    </div>
                    <div className="p-2 bg-[#E3F2FD] rounded-lg">
                      <Users className="h-5 w-5 text-[#01579B]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black">All registered users</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-black">Active Users</p>
                      <h3 className="text-2xl font-bold text-green-600 mt-1">
                        {formatNumber(report.data.summary.active_users)}
                      </h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black">
                      {calculatePercentage(report.data.summary.active_users, report.data.summary.total_users)}% of total users
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-medium text-black">Inactive Users</p>
                      <h3 className="text-2xl font-bold text-red-600 mt-1">
                        {formatNumber(report.data.summary.inactive_users)}
                      </h3>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-black">
                      {calculatePercentage(report.data.summary.inactive_users, report.data.summary.total_users)}% of total users
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Distribution Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-black">User Distribution by Role</h3>
                  <p className="text-sm text-black mt-1">Breakdown of users across different roles</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Total Users</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Inactive</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {report.data.role_distribution?.map((role, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                            {role.role_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {formatNumber(role.total_users)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {formatNumber(role.active_users)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {formatNumber(role.inactive_users)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {calculatePercentage(role.total_users, report.data.summary.total_users)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Users List Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-black">All Users</h3>
                      <p className="text-sm text-black mt-1">Complete list of all users in the system</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="pageSize" className="text-sm text-black">Show:</label>
                      <select
                        id="pageSize"
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        className="border border-gray-300 rounded-md text-sm p-1 text-black"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-black">entries</span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-black/60"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {currentUsers.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {user.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                            {user.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-black">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} entries
                      {searchTerm && ` (filtered from ${report.data.users?.length || 0} total entries)`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-md ${
                          currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-black hover:bg-gray-100'
                        }`}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {getPageNumbers().map((pageNumber, index) => (
                        <button
                          key={index}
                          onClick={() => typeof pageNumber === 'number' && handlePageChange(pageNumber)}
                          className={`px-3 py-1 rounded-md ${
                            pageNumber === currentPage
                              ? 'bg-[#01579B] text-white'
                              : pageNumber === '...'
                              ? 'text-black cursor-default'
                              : 'text-black hover:bg-gray-100'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-md ${
                          currentPage === totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-black hover:bg-gray-100'
                        }`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scroll to Top Button */}
              <button
                onClick={scrollToTop}
                className={`fixed bottom-6 right-6 p-3 bg-[#01579B] text-white rounded-full shadow-lg transition-all duration-300 hover:bg-[#01416E] ${
                  showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                }`}
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-black">No data available for this report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 