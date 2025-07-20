"use client";

import { useState } from "react";
import { Download, X, Calendar, Filter, Users, BarChart2 } from "lucide-react";
import { generateReport } from '@/utils/reportGenerator';

export default function ReportDetailsModal({ report, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filters, setFilters] = useState({
    department: "All",
    electionType: "All",
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const calculateTurnout = (votesCast, totalVoters) => {
    if (!totalVoters || totalVoters === 0) return 0;
    const votes = parseInt(votesCast.replace(/,/g, ''));
    const voters = parseInt(totalVoters.replace(/,/g, ''));
    return (votes / voters) * 100;
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Election Summary Report",
      description: "Overview of all elections with detailed statistics and voter turnout",
      summary: {
        total_elections: report.data.summary.total_elections,
        ongoing_elections: report.data.summary.ongoing_elections,
        completed_elections: report.data.summary.completed_elections,
        upcoming_elections: report.data.summary.upcoming_elections,
        total_eligible_voters: report.data.summary.total_eligible_voters,
        total_votes_cast: report.data.summary.total_votes_cast,
        voter_turnout_percentage: report.data.summary.voter_turnout_percentage
      },
      recent_elections: report.data.recent_elections.map(election => ({
        title: election.title,
        election_type: election.election_type,
        status: election.status,
        start_date: formatDate(election.start_date),
        end_date: formatDate(election.end_date),
        voter_count: election.voter_count,
        votes_cast: election.votes_cast,
        turnout_percentage: formatPercentage(election.turnout_percentage)
      }))
    };

    try {
      await generateReport(1, reportData); // 1 is the report ID for Election Summary
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center ">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-black">{report.title}</h2>
              <p className="text-sm text-black">{report.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex border-b mb-4">
            <button
              className={`px-4 py-2 font-medium ${activeTab === "summary" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === "details" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
          </div>

          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-black" />
                <input
                  type="date"
                  className="border p-2 pl-10 rounded text-sm text-black"
                  placeholder="Start date"
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <span className="self-center">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-black" />
                <input
                  type="date"
                  className="border p-2 pl-10 rounded text-sm text-black"
                  placeholder="End date"
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Word
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            {activeTab === "summary" && report.data && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Elections</h3>
                  <p className="text-2xl font-bold text-black">{report.data.summary.total_elections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Ongoing Elections</h3>
                  <p className="text-2xl font-bold text-blue-600">{report.data.summary.ongoing_elections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Completed Elections</h3>
                  <p className="text-2xl font-bold text-green-600">{report.data.summary.completed_elections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Upcoming Elections</h3>
                  <p className="text-2xl font-bold text-orange-600">{report.data.summary.upcoming_elections}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Eligible Voters</h3>
                  <p className="text-2xl font-bold text-black">{report.data.summary.total_eligible_voters}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Votes Cast</h3>
                  <p className="text-2xl font-bold text-black">{report.data.summary.total_votes_cast}</p>
                  <p className="text-sm text-gray-500">
                    {formatPercentage(report.data.summary.voter_turnout_percentage)} turnout
                  </p>
                </div>
              </div>
            )}

            {activeTab === "details" && report.data && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left text-sm font-medium text-black">Election Name</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Type</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Status</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Start Date</th>
                      <th className="p-3 text-left text-sm font-medium text-black">End Date</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Voters</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Votes Cast</th>
                      <th className="p-3 text-left text-sm font-medium text-black">Turnout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.recent_elections.map((election) => (
                      <tr key={election.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm text-black">{election.title}</td>
                        <td className="p-3 text-sm text-black">{election.election_type}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            election.status === "ongoing" ? "bg-blue-100 text-blue-800" :
                            election.status === "completed" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {election.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-black">{formatDate(election.start_date)}</td>
                        <td className="p-3 text-sm text-black">{formatDate(election.end_date)}</td>
                        <td className="p-3 text-sm text-black">{election.voter_count}</td>
                        <td className="p-3 text-sm text-black">{election.votes_cast}</td>
                        <td className="p-3 text-sm text-black">{formatPercentage(election.turnout_percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}