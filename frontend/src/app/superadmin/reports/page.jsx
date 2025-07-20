"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Download, Filter, Search } from "lucide-react";
import ReportCard from "./components/ReportCard";
import ReportDetailsModal from "./components/ReportCardDetail";
import ReportFilterModal from "./components/ReportFilterModal";
import RoleBasedUserDetail from "./components/RoleBasedUserDetail";
import FailedLoginDetail from "./components/FailedLoginDetail";
import AuditLogDetail from './components/AuditLogDetail';
import UpcomingElectionDetail from './components/UpcomingElectionDetail';
import LiveVoteCountDetail from './components/LiveVoteCountDetail';
import SystemLoadDetail from './components/SystemLoadDetail';
import VoterParticipationDetail from './components/VoterParticipationDetail';
import CandidateListDetail from './components/CandidateListDetail';
import AdminActivityDetail from './components/AdminActivityDetail';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    reportType: "All"
  });

  const staticReports = [
    {
      id: 1,
      title: "Election Summary Report",
      type: "Election",
      description: "Overview of all elections with detailed statistics and voter turnout.",
      icon: "election",
    },
    {
      id: 2,
      title: "Role Based User Report",
      type: "Users",
      description: "Comprehensive overview of user distribution across different roles and their activity status.",
      icon: "users",
    },
    {
      id: 3,
      title: "Failed Login Report",
      type: "Security",
      description: "Analysis of failed login attempts and account lockouts across the system.",
      icon: "security",
    },
    {
      id: 4,
      title: "Activity Audit Log Report",
      type: "Audit",
      description: "Detailed log of all user activities including voting, administrative actions, and system changes.",
      icon: "audit",
    },
    {
      id: 5,
      title: "Upcoming Elections Report",
      type: "Election",
      description: "Detailed overview of all upcoming elections including ballot information and voter eligibility.",
      icon: "election",
    },
    {
      id: 6,
      title: "Live Vote Count Report",
      type: "Election",
      description: "Real-time monitoring of ongoing elections with live vote counts and turnout statistics.",
      icon: "election",
    },
    {
      id: 7,
      title: "System Load Report",
      type: "System",
      description: "Analysis of peak usage times, including login and voting activity patterns.",
      icon: "system",
    },
    {
      id: 8,
      title: "Voter Participation Report",
      type: "Election",
      description: "Detailed analysis of voter turnout, eligible voters, and individual voting status.",
      icon: "election",
    },
    {
      id: 9,
      title: "Candidate List Report",
      type: "Election",
      description: "Comprehensive list of all candidates per election with their course and party affiliations.",
      icon: "election",
    },
    {
      id: 10,
      title: "Admin Activity Report",
      type: "Admin",
      description: "Detailed tracking of all administrative actions and changes in the system.",
      icon: "admin",
    }
  ];

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const fetchReportData = async (reportId) => {
    try {
      setLoading(true);
      setError("");  // Clear any previous errors
      const token = Cookies.get("token");
      
      let endpoint;
      let transformedData;

      switch(reportId) {
        case 1: // Election Summary Report
          endpoint = '/reports/summary';
          const electionResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          transformedData = {
            summary: {
              total_elections: electionResponse.data.data.summary.total_elections,
              ongoing_elections: electionResponse.data.data.summary.ongoing_elections,
              completed_elections: electionResponse.data.data.summary.completed_elections,
              upcoming_elections: electionResponse.data.data.summary.upcoming_elections,
              total_eligible_voters: electionResponse.data.data.summary.total_eligible_voters,
              total_votes_cast: electionResponse.data.data.summary.total_votes_cast,
              voter_turnout_percentage: electionResponse.data.data.summary.voter_turnout_percentage
            },
            recent_elections: electionResponse.data.data.recent_elections.map(election => ({
              id: election.id,
              title: election.title,
              status: election.status,
              election_type: election.election_type,
              start_date: election.start_date,
              end_date: election.end_date,
              voter_count: formatNumber(election.voter_count || 0),
              votes_cast: formatNumber(election.total_votes || 0),
              turnout_percentage: election.voter_turnout_percentage
            }))
          };
          break;

        case 2: // Role Based User Report
          endpoint = '/reports/role-based/summary';
          const userResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('User response data:', userResponse.data); // Debug log

          const userData = userResponse.data.data;
          if (!userData) {
            throw new Error('No data received from role-based user report');
          }

          transformedData = {
            summary: {
              total_users: userData.summary?.total_users || 0,
              active_users: userData.summary?.active_users || 0,
              inactive_users: userData.summary?.inactive_users || 0
            },
            role_distribution: (userData.role_distribution || []).map(role => ({
              role_name: role.role_name || 'Unknown',
              total_users: role.total_users || 0,
              active_users: role.active_users || 0,
              inactive_users: role.inactive_users || 0
            })),
            users: (userData.users || []).map(user => ({
              name: user.name || 'N/A',
              email: user.email || 'N/A',
              role: user.role || 'N/A',
              department: user.department || 'N/A',
              status: user.status || 'inactive'
            }))
          };
          break;

        case 3: // Failed Login Report
          endpoint = '/reports/failed-logins';
          const loginResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          console.log('Raw login data:', loginResponse.data);
          transformedData = {
            total_attempts: loginResponse.data.data.total_attempts,
            locked_accounts: loginResponse.data.data.locked_accounts,
            recent_attempts: loginResponse.data.data.recent_attempts,
            time_distribution: loginResponse.data.data.time_distribution
          };
          break;

        case 4: // Activity Audit Log Report
          endpoint = '/audit-logs';
          const auditResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              limit: 100,
              sort_by: 'created_at',
              sort_order: 'DESC'
            }
          });

          // Get summary data
          const summaryResponse = await axios.get(`${API_BASE}/audit-logs/summary`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          transformedData = {
            summary: {
              total_activities: summaryResponse.data.data.total_activities || 0,
              unique_users: summaryResponse.data.data.unique_users || 0,
              total_votes: summaryResponse.data.data.total_votes || 0,
              activities_today: summaryResponse.data.data.activities_today || 0
            },
            logs: auditResponse.data.data.map(log => ({
              ...log,
              created_at: new Date(log.created_at).toISOString(),
              details: log.details || {}
            }))
          };
          break;

        case 5: // Upcoming Elections Report
          endpoint = '/reports/upcoming-elections';
          const upcomingResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          transformedData = {
            summary: {
              total_upcoming: upcomingResponse.data.data.total_upcoming || 0,
              upcoming_this_month: upcomingResponse.data.data.upcoming_this_month || 0,
              total_expected_voters: upcomingResponse.data.data.total_expected_voters || 0
            },
            upcoming_elections: upcomingResponse.data.data.elections.map(election => ({
              id: election.id,
              title: election.title,
              description: election.description,
              election_type: election.election_type,
              date_from: election.date_from,
              date_to: election.date_to,
              start_time: election.start_time,
              end_time: election.end_time,
              voter_count: election.voter_count || 0,
              ballot: election.ballot || null
            }))
          };
          break;

        case 6: // Live Vote Count Report
          endpoint = '/reports/live-vote-count';
          const liveResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          transformedData = {
            summary: liveResponse.data.data.summary,
            live_elections: liveResponse.data.data.live_elections,
            onRefresh: async () => {
              const refreshResponse = await axios.get(`${API_BASE}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setReportData({
                ...transformedData,
                summary: refreshResponse.data.data.summary,
                live_elections: refreshResponse.data.data.live_elections
              });
            }
          };
          break;

        case 7:
          endpoint = '/reports/system-load';
          const loadResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeframe: '24h'
            }
          });

          transformedData = {
            summary: {
              peak_login_hour: loadResponse.data.data.peak_login_hour,
              peak_login_count: loadResponse.data.data.peak_login_count,
              peak_voting_hour: loadResponse.data.data.peak_voting_hour,
              peak_voting_count: loadResponse.data.data.peak_voting_count,
              total_active_users: loadResponse.data.data.total_active_users
            },
            login_activity: loadResponse.data.data.login_activity,
            voting_activity: loadResponse.data.data.voting_activity
          };
          break;

        case 8: // Voter Participation Report
          endpoint = '/reports/voter-participation';
          try {
            console.log('Fetching voter participation data...');
            const participationResponse = await axios.get(`${API_BASE}${endpoint}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Voter participation response:', participationResponse.data);

            if (!participationResponse.data.success) {
              throw new Error(participationResponse.data.error || 'Failed to fetch voter participation data');
            }

            transformedData = {
              elections: participationResponse.data.data.elections.map(election => ({
                id: election.id,
                title: election.title,
                total_eligible_voters: election.total_eligible_voters,
                total_votes_cast: election.total_votes_cast,
                turnout_percentage: ((election.total_votes_cast / election.total_eligible_voters) * 100).toFixed(1),
                department_stats: election.department_stats,
                voters: election.voters.map(voter => ({
                  student_id: voter.student_id,
                  name: `${voter.first_name} ${voter.last_name}`,
                  department: voter.department,
                  has_voted: voter.has_voted,
                  vote_date: voter.vote_date
                }))
              }))
            };
          } catch (error) {
            console.error('Error fetching voter participation data:', error);
            console.error('Error details:', error.response?.data);
            throw new Error(
              error.response?.data?.details || 
              error.response?.data?.error || 
              'Failed to fetch voter participation data'
            );
          }
          break;

        case 9: // Candidate List Report
          endpoint = '/reports/candidate-list';
          try {
            console.log('Fetching candidate list data...');
            const candidateResponse = await axios.get(`${API_BASE}${endpoint}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Candidate list response:', candidateResponse.data);

            if (!candidateResponse.data.success) {
              throw new Error(candidateResponse.data.error || 'Failed to fetch candidate list data');
            }

            transformedData = {
              elections: candidateResponse.data.data.elections
            };
          } catch (error) {
            console.error('Error fetching candidate list data:', error);
            console.error('Error details:', error.response?.data);
            throw new Error(
              error.response?.data?.details || 
              error.response?.data?.error || 
              'Failed to fetch candidate list data'
            );
          }
          break;

        case 10: // Admin Activity Report
          endpoint = '/reports/admin-activity/activities';
          try {
            const [activitiesResponse, summaryResponse] = await Promise.all([
              axios.get(`${API_BASE}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                  timeframe: filters.timeframe || 'all',
                  action: filters.action || 'all',
                  page: 1,
                  limit: 100,
                  sort_by: 'created_at',
                  sort_order: 'DESC'
                }
              }),
              axios.get(`${API_BASE}/reports/admin-activity/summary`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                  timeframe: filters.timeframe || 'all'
                }
              })
            ]);

            if (!activitiesResponse.data.success || !summaryResponse.data.success) {
              throw new Error('Failed to fetch admin activity data');
            }

            transformedData = {
              activities: activitiesResponse.data.data.activities,
              summary: {
                total_activities: activitiesResponse.data.data.summary.total_activities,
                active_admins: activitiesResponse.data.data.summary.active_admins,
                activities_today: activitiesResponse.data.data.summary.activities_today,
                most_common_action: activitiesResponse.data.data.summary.most_common_action
              },
              pagination: activitiesResponse.data.data.pagination
            };
          } catch (error) {
            console.error('Error fetching admin activity data:', error);
            throw new Error(
              error.response?.data?.message || 
              'Failed to fetch admin activity data'
            );
          }
          break;

        default:
          throw new Error('Report type not implemented');
      }

      // Remove the summary number formatting for failed login report
      if (reportId !== 3 && transformedData.summary) {
        Object.keys(transformedData.summary).forEach(key => {
          if (typeof transformedData.summary[key] === 'number') {
            transformedData.summary[key] = formatNumber(transformedData.summary[key]);
          }
        });
      }

      console.log('Transformed data:', transformedData);
      setReportData(transformedData);
      return transformedData;
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError(error.message || "Failed to fetch report data");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (report) => {
    const data = await fetchReportData(report.id);
    if (data) {
      setSelectedReport({ ...report, data });
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const token = Cookies.get("token");
      const data = await fetchReportData(reportId);
      
      if (!data) {
        throw new Error('No data available for download');
      }

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading report:", error);
      setError("Failed to download report.");
    }
  };

  const renderReportDetail = (report) => {
    switch (report.id) {
      case 1:
        return (
          <ReportDetailsModal
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 2:
        return (
          <RoleBasedUserDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 3:
        return (
          <FailedLoginDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 4:
        return (
          <AuditLogDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 5:
        return (
          <UpcomingElectionDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 6:
        return (
          <LiveVoteCountDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 7:
        return (
          <SystemLoadDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 8:
        return (
          <VoterParticipationDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 9:
        return (
          <CandidateListDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      case 10:
        return (
          <AdminActivityDetail
            report={report}
            onClose={() => setSelectedReport(null)}
            onDownload={() => {
              downloadReport(report.id);
              setSelectedReport(null);
            }}
          />
        );
      default:
        return null;
    }
  };

  // Filter reports based on search term and filters
  const filteredReports = useMemo(() => {
    return staticReports.filter(report => {
      // Search term filter
      const searchMatch = searchTerm === "" || 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.type.toLowerCase().includes(searchTerm.toLowerCase());

      // Report type filter
      const typeMatch = filters.reportType === "All" || report.type === filters.reportType;

      return searchMatch && typeMatch;
    });
  }, [staticReports, searchTerm, filters]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Reports Module</h1>
      
      {loading && <p>Loading reports...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports by title, description, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 pl-10 rounded w-full text-black placeholder-black/60"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {filters.reportType !== "All" && (
              <span className="ml-2 bg-white text-[#01579B] rounded-full w-5 h-5 flex items-center justify-center text-xs">
                ✓
              </span>
            )}
          </button>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No reports found matching your criteria
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={() => handleViewReport(report)}
              onDownload={() => downloadReport(report.id)}
            />
          ))}
        </div>
      )}

      {selectedReport && renderReportDetail(selectedReport)}

      {showFilterModal && (
        <ReportFilterModal
          filters={filters}
          onApply={handleFilterApply}
          onClose={() => setShowFilterModal(false)}
        />
      )}
    </div>
  );
}