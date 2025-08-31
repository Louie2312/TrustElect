"use client";

import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import DepartmentVoterReport from "./components/DepartmentVoterReport";
import ElectionResultReport from "./components/ElectionResultReport";
import ReportCard from "./components/ReportCard";
import ReportFilterModal from "./components/ReportFilterModal";
import VotingTimeReport from "./components/VotingTimeReport";
import ElectionSummaryReport from "./components/ElectionSummaryReport";
import VoterParticipationReport from "./components/VoterParticipationReport";
import CandidateListReport from "./components/CandidateListReport";
import AdminActivityReport from "./components/AdminActivityReport";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    reportType: "All",
    dateRange: { start: null, end: null }
  });

  const staticReports = [
    {
      id: 1,
      title: "Department Voter Report",
      type: "Voters",
      icon: "users"
    },
    {
      id: 2,
      title: "Election Result Report",
      type: "Results",
      icon: "election"
    },
    {
      id: 3,
      title: "Voting Time Report",
      type: "Activity",
      icon: "votes"
    },
    {
      id: 4,
      title: "Election Summary Report",
      type: "Summary",
      icon: "election"
    },
    {
      id: 5,
      title: "Voter Participation Report",
      type: "Participation",
      icon: "participation"
    },
    {
      id: 6,
      title: "Candidate List Report",
      type: "Candidates",
      icon: "users"
    },
    {
      id: 7,
      title: "Admin Activity Report",
      type: "Activity",
      icon: "audit"
    }
  ];

  const handleViewReport = (report) => {
    setSelectedReport(report);
  };

  const handleDownloadReport = async (report) => {
    try {
      const downloadEndpoints = {
        1: '/api/reports/download/department-voter',
        2: '/api/reports/download/election-result',
        3: '/api/reports/download/voting-time',
        4: '/api/reports/download/election-summary',
        5: '/api/reports/download/voter-participation',
        6: '/api/reports/download/candidate-list',
        7: '/api/reports/download/admin-activity'
      };

      const endpoint = downloadEndpoints[report.id];
      if (!endpoint) return;

      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const renderSelectedReport = () => {
    switch (selectedReport?.id) {
      case 1:
        return <DepartmentVoterReport />;
      case 2:
        return <ElectionResultReport />;
      case 3:
        return <VotingTimeReport />;
      case 4:
        return <ElectionSummaryReport />;
      case 5:
        return <VoterParticipationReport />;
      case 6:
        return <CandidateListReport />;
      case 7:
        return <AdminActivityReport />;
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
    <div className="min-h-screen p-6">
      <div className="bg-white bg-opacity-90 rounded-lg shadow-lg p-6 backdrop-blur-sm">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-[#01579B]">Reports</h1>
        </div>

        {!selectedReport ? (
          <>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="relative w-full md:w-1/3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search reports by title, description, or type..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#01579B] focus:border-transparent text-gray-700 bg-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowFilterModal(true)}
                  className="flex items-center justify-center px-4 py-2 bg-[#01579B] text-white rounded-md hover:bg-[#01416E] transition-colors duration-200 shadow-sm"
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
                    onDownload={() => handleDownloadReport(report)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedReport(null)}
              className="mb-6 text-[#01579B] hover:text-[#01416E] font-medium"
            >
              ← Back to Reports
            </button>
            {renderSelectedReport()}
          </>
        )}

        {showFilterModal && (
          <ReportFilterModal
            filters={filters}
            onApply={handleFilterApply}
            onClose={() => setShowFilterModal(false)}
          />
        )}
      </div>
    </div>
  );
}
