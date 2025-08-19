"use client";

import { useState, useMemo } from 'react';
import { X, Download, Filter, Search, ArrowUp, Activity, Clock, Calendar } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

export default function AuditLogDetail({ report, onClose, onDownload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showScrollButton, setShowScrollButton] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
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
        return 'text-green-600';
      case 'UPDATE':
        return 'text-blue-600';
      case 'DELETE':
        return 'text-red-600';
      case 'VOTE':
        return 'text-purple-600';
      case 'LOGIN':
        return 'text-cyan-600';
      case 'LOGOUT':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  // Function to generate descriptive action message
  const getDescriptiveAction = (log) => {
    try {
      // Parse details if it's a string
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      
      switch (log.action?.toUpperCase()) {
        case 'VOTE':
          if (log.entity_type === 'ELECTION' && details?.election_title) {
            return `Voted in ${details.election_title}`;
          } else if (details?.election_id) {
            return `Voted in Election #${details.election_id}`;
          }
          return 'Voted in an election';
          
        case 'CREATE':
          if (log.entity_type === 'ELECTION' && details?.title) {
            return `Created election "${details.title}"`;
          } else if (log.entity_type === 'CANDIDATE' && details?.name) {
            return `Added candidate ${details.name}`;
          } else if (log.entity_type === 'POSITION' && details?.name) {
            return `Created position ${details.name}`;
          }
          return `Created ${log.entity_type?.toLowerCase() || 'item'}`;
          
        case 'UPDATE':
          if (log.entity_type === 'ELECTION' && details?.title) {
            return `Updated election "${details.title}"`;
          } else if (log.entity_type === 'CANDIDATE' && details?.name) {
            return `Updated candidate ${details.name}`;
          } else if (log.entity_type === 'POSITION' && details?.name) {
            return `Updated position ${details.name}`;
          } else if (log.entity_type === 'USER' && details?.email) {
            return `Updated user ${details.email}`;
          }
          return `Updated ${log.entity_type?.toLowerCase() || 'item'}`;
          
        case 'DELETE':
          if (log.entity_type === 'ELECTION' && details?.title) {
            return `Deleted election "${details.title}"`;
          } else if (log.entity_type === 'CANDIDATE' && details?.name) {
            return `Removed candidate ${details.name}`;
          }
          return `Deleted ${log.entity_type?.toLowerCase() || 'item'}`;
          
        case 'LOGIN':
          return 'Logged in to system';
          
        case 'LOGOUT':
          return 'Logged out from system';
          
        default:
          return log.action;
      }
    } catch (error) {
      console.error('Error parsing action details:', error);
      return log.action;
    }
  };

  const uniqueActions = useMemo(() => {
    const actions = new Set(report.data.logs.map(log => log.action?.toUpperCase()));
    return Array.from(actions).sort();
  }, [report.data.logs]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(report.data.logs.map(log => log.user_role?.toLowerCase()));
    return Array.from(roles).sort();
  }, [report.data.logs]);

  const filteredLogs = useMemo(() => {
    return report.data.logs.filter(log => {
      const matchesSearch = searchTerm === '' || 
        (log.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.entity_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.user_role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (getDescriptiveAction(log).toLowerCase()).includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || log.action?.toUpperCase() === filterType;
      const matchesRole = filterRole === 'all' || log.user_role?.toLowerCase() === filterRole;

      return matchesSearch && matchesType && matchesRole;
    });
  }, [report.data.logs, searchTerm, filterType, filterRole]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayActivities = report.data.logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= today;
    }).length;

    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last24HourActivities = report.data.logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= last24Hours;
    }).length;

    const thisWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const weeklyActivities = report.data.logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= thisWeek;
    }).length;

    return {
      total: report.data.logs.length,
      today: todayActivities,
      last24Hours: last24HourActivities,
      weekly: weeklyActivities
    };
  }, [report.data.logs]);

  // Handle scroll to top
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    setShowScrollButton(scrollTop > 300);
  };

  const scrollToTop = () => {
    const tableContainer = document.getElementById('audit-log-table-container');
    if (tableContainer) {
      tableContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Activity Audit Log Report",
      description: "Track all system activities and user actions",
      summary: {
        total_activities: summaryMetrics.total,
        activities_today: summaryMetrics.today,
        last_24_hours: summaryMetrics.last24Hours,
        weekly_activities: summaryMetrics.weekly
      },
      logs: filteredLogs.map(log => ({
        user_email: log.user_email,
        user_role: log.user_role,
        action: getDescriptiveAction(log),
        entity_type: log.entity_type,
        created_at: log.created_at
      }))
    };

    try {
      await generatePdfReport(4, reportData); // 4 is the report ID for Audit Log
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-6xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-6 flex justify-between items-center border-b">
          <div>
            <h2 className="text-2xl font-bold text-black">{report.title}</h2>
            <p className="text-sm text-black mt-1">Track all system activities and user actions</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-[#01579B]" />
                <h3 className="text-sm font-medium text-black">Total Activities</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summaryMetrics.total}</p>
              <p className="text-sm text-black/70">All time activities</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-[#01579B]" />
                <h3 className="text-sm font-medium text-black">Last 24 Hours</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summaryMetrics.last24Hours}</p>
              <p className="text-sm text-black/70">Activities in last 24h</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-[#01579B]" />
                <h3 className="text-sm font-medium text-black">Today's Activities</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summaryMetrics.today}</p>
              <p className="text-sm text-black/70">Activities since midnight</p>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-[#01579B]" />
                <h3 className="text-sm font-medium text-black">Weekly Activities</h3>
              </div>
              <p className="text-2xl font-bold text-black">{summaryMetrics.weekly}</p>
              <p className="text-sm text-black/70">Last 7 days</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user, action, or entity..."
                className="pl-10 p-2 border rounded w-full text-black placeholder-black/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="p-2 border rounded text-black bg-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0) + action.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              className="p-2 border rounded text-black bg-white"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-black">
            Showing {filteredLogs.length} of {report.data.logs.length} activities
            {(filterType !== 'all' || filterRole !== 'all' || searchTerm) && ' (filtered)'}
          </div>

          {/* Logs Table */}
          <div 
            id="audit-log-table-container"
            className="overflow-auto max-h-[50vh] relative"
            onScroll={handleScroll}
          >
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Entity Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{log.user_email}</div>
                      <div className="text-sm text-black/70">{log.user_role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${getActionColor(log.action)} font-medium`}>
                        {getDescriptiveAction(log)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {log.entity_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
          </div>
        </div>
      </div>
    </div>
  );
}