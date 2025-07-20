"use client";

import { useState } from "react";
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

export default function AdminReportsPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    department: "All",
    electionType: "All",
  });

  const reports = [
    {
      id: 1,
      title: "Department Voter Report",
      type: "Voters",
      description: "View detailed voter participation statistics by department, including turnout rates and voting status.",
    },
    {
      id: 2,
      title: "Election Result Report",
      type: "Results",
      description: "View comprehensive election results including candidates, vote counts, and winners for each position.",
    },
    {
      id: 3,
      title: "Voting Time Report",
      type: "Activity",
      description: "Track when voters cast their votes, including timestamps, voter IDs, and any rejected ballots.",
    },
    {
      id: 4,
      title: "Election Summary Report",
      type: "Summary",
      description: "View overall election statistics including voter turnout, participation rates, and election status across all elections.",
    },
    {
      id: 5,
      title: "Voter Participation Report",
      type: "Participation",
      description: "View detailed voter participation analysis including turnout trends, voting patterns, and participation rates across elections.",
    },
    {
      id: 6,
      title: "Candidate List Report",
      type: "Candidates",
      description: "View comprehensive list of candidates across all elections, including their details, positions, and vote counts.",
    },
    {
      id: 7,
      title: "Admin Activity Report",
      type: "Activity",
      description: "Track all administrative actions and changes in the system, including timestamps and action details.",
    }
  ];

  const handleViewReport = (report) => {
    setSelectedReport(report);
  };

  const handleDownloadReport = (report) => {
    // Implement download functionality
    console.log("Downloading report:", report.title);
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
                    placeholder="Search reports..."
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
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onView={() => handleViewReport(report)}
                  onDownload={() => handleDownloadReport(report)}
                />
              ))}
            </div>
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
            onApply={(newFilters) => {
              setFilters(newFilters);
              setShowFilterModal(false);
            }}
            onClose={() => setShowFilterModal(false)}
          />
        )}
      </div>
    </div>
  );
}
