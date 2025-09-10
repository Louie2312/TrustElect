"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Download, Filter, Search } from "lucide-react";
import ReportCard from "./components/ReportCard";
import ReportDetailsModal from "./components/ReportDetailsModal";
import ReportFilterModal from "./components/ReportFilterModal";
import DepartmentVoterReport from "./components/DepartmentVoterReport";
import ElectionResultReport from "./components/ElectionResultReport";
import VotingTimeReport from "./components/VotingTimeReport";
import ElectionSummaryReport from "./components/ElectionSummaryReport";
import VoterParticipationReport from "./components/VoterParticipationReport";
import CandidateListReport from "./components/CandidateListReport";
import AdminActivityReport from "./components/AdminActivityReport";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdminReportsPage() {
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
      title: "Department Voter Report",
      type: "Voters",
      icon: "users",
      description: "Detailed report of voters organized by department and course"
    },
    {
      id: 2,
      title: "Election Result Report",
      type: "Results",
      icon: "election",
      description: "Comprehensive results and statistics for completed elections"
    },
    {
      id: 3,
      title: "Voting Time Report",
      type: "Activity",
      icon: "votes",
      description: "Analysis of voting patterns and time-based participation"
    },
    {
      id: 4,
      title: "Election Summary Report",
      type: "Summary",
      icon: "election",
      description: "Overview of all elections with detailed statistics and voter turnout"
    },
    {
      id: 5,
      title: "Voter Participation Report",
      type: "Participation",
      icon: "participation",
      description: "Detailed analysis of voter participation rates and trends"
    },
    {
      id: 6,
      title: "Candidate List Report",
      type: "Candidates",
      icon: "users",
      description: "Complete list of candidates with their details and affiliations"
    },
    {
      id: 7,
      title: "Admin Activity Report",
      type: "Activity",
      icon: "audit",
      description: "Tracking of administrative actions and system changes"
    }
  ];

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const fetchReportData = async (reportId) => {
    try {
      setLoading(true);
      setError(""); 
      const token = Cookies.get("token");
      
      let endpoint;
      let transformedData;

      switch(reportId) {
        case 1: 
          // Department Voter Report
          endpoint = '/reports/department-voter';
          const departmentResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = departmentResponse.data;
          break;

        case 2: 
          // Election Result Report - using admin summary for now
          endpoint = '/reports/admin/summary';
          const resultResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = resultResponse.data;
          break;

        case 3: 
          // Voting Time Report
          endpoint = '/reports/voting-time';
          const timeResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = timeResponse.data;
          break;

        case 4: 
          // Election Summary Report
          endpoint = '/reports/admin/summary';
          const summaryResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Election Summary Response:', summaryResponse.data);
          transformedData = summaryResponse.data;
          break;

        case 5: 
          // Voter Participation Report
          endpoint = '/reports/admin/voter-participation';
          const participationResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = participationResponse.data;
          break;

        case 6: 
          // Candidate List Report
          endpoint = '/reports/candidate-list/admin/candidate-list';
          const candidateResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = candidateResponse.data;
          break;

        case 7: 
          // Admin Activity Report
          endpoint = '/reports/admin-activity/summary';
          const activityResponse = await axios.get(`${API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          transformedData = activityResponse.data;
          break;

        default:
          throw new Error('Report type not implemented');
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
    switch (report?.id) {
      case 1:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <DepartmentVoterReport />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <ElectionResultReport />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <VotingTimeReport />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <ElectionSummaryReport />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <VoterParticipationReport />
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <CandidateListReport />
              </div>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">{report.title}</h2>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 flex-grow overflow-y-auto">
                <AdminActivityReport />
              </div>
            </div>
          </div>
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
