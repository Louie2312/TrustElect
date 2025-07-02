"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Download, Filter, Search } from "lucide-react";
import ReportCard from "@/components/Reports/ReportCard";
import ReportDetailsModal from "@/components/Reports/ReportDetailsModal";
import ReportFilterModal from "@/components/Reports/ReportFilterModal";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    reportType: "All",
    dateRange: { start: null, end: null },
    department: "All",
    electionType: "All",
  });


  const sampleReports = [
    {
      id: 1,
      title: "Election Summary Report",
      type: "Election",
      description: "Overview of all elections.",
      icon: "election",
    },
    {
      id: 2,
      title: "Role-based User Report",
      type: "User",
      description: "Counts and details of users by role",
      icon: "users",
    },
    {
      id: 3,
      title: "Failed Login Report",
      type: "Security",
      description: "Track failed login attempts and errors",
      icon: "security",
    },
    {
      id: 4,
      title: "Voting Activity Audit Log",
      type: "Audit",
      description: "All actions performed by admins and voters",
      icon: "audit",
    },
    {
      id: 5,
      title: "Voter Participation Report",
      type: "Election",
      description: "Summary of voter count by department",
      icon: "participation",
    },
    {
      id: 6,
      title: "Live Vote Count Report",
      type: "Election",
      description: "Current voting status",
      icon: "votes",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setReports(sampleReports);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredReports = sampleReports.filter((report) => {
    if (filters.reportType !== "All" && report.type !== filters.reportType) {
      return false;
    }
    return true;
  });

  const generateReport = async (reportId) => {
    try {
      const token = Cookies.get("token");
      console.log(`Generating report ${reportId}`);
      alert(`Report ${reportId} generation started`);
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report.");
    }
  };

  const downloadReport = async (reportId) => {
    try {
      const token = Cookies.get("token");
      console.log(`Downloading report ${reportId}`);
      alert(`Report ${reportId} downloading`);
    } catch (error) {
      console.error("Error downloading report:", error);
      setError("Failed to download report.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Reports Module</h1>
      
      {loading && <p>Loading reports...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="flex justify-between mb-6">
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            className="border p-2 pl-10 rounded w-full text-black"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onView={() => setSelectedReport(report)}
            onGenerate={() => generateReport(report.id)}
            onDownload={() => downloadReport(report.id)}
          />
        ))}
      </div>

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDownload={() => {
            downloadReport(selectedReport.id);
            setSelectedReport(null);
          }}
        />
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
  );
}