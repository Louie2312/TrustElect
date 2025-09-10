"use client";

import { useState } from "react";
import { X, Download } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { generatePdfReport } from "@/utils/reportGenerator";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const formatNumber = (num) => {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return "0.00%";
  return `${parseFloat(value).toFixed(2)}%`;
};

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return 'Not set';
  try {
    const date = new Date(dateStr);
    const time = timeStr ? ` at ${timeStr}` : '';
    return date.toLocaleDateString() + time;
  } catch (error) {
    return 'Invalid date';
  }
};

const formatNameSimple = (lastName, firstName, fallback) => {
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  if ((!lastName && !firstName) && fallback) {
    const words = fallback.trim().split(/\s+/);
    if (words.length === 1) {
      return cap(words[0]);
    } else {
      const last = cap(words[words.length - 1]);
      const first = words.slice(0, -1).map(cap).join(' ');
      return `${last}, ${first}`;
    }
  }
  if (!lastName && !firstName) return 'No Name';
  return `${cap(lastName)}, ${cap(firstName)}`;
};

const calculateTurnout = (votes, voters) => {
  if (!voters || voters === 0) return 0;
  return (votes / voters) * 100;
};

export default function ReportDetailsModal({ report, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [electionDetails, setElectionDetails] = useState(null);

  const handleDownload = async () => {
    if (!report || !report.data) {
      console.error('No report data available');
      return;
    }

    const reportData = {
      title: report.title,
      description: report.description || "Detailed report data",
      summary: report.data.summary || {},
      data: report.data
    };

    try {
      console.log('Generating PDF with data:', reportData);
      const result = await generatePdfReport(report.id, reportData);
      console.log('PDF generation result:', result);
      
      if (!result.success) {
        console.error('PDF generation failed:', result.message);
        alert('Failed to generate PDF: ' + result.message);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handleElectionClick = async (election) => {
    try {
      // Fetch detailed election data
      const token = Cookies.get("token");
      const response = await axios.get(`${API_BASE}/elections/${election.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.election) {
        setElectionDetails(response.data.election);
      }
    } catch (error) {
      console.error('Error fetching election details:', error);
    }
  };

  const closeElectionDetails = () => {
    setElectionDetails(null);
  };

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden m-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-black">{report.title}</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E]"
            >
              <Download className="w-4 h-4" />
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

        <div className="p-6">
          <div className="flex border-b mb-6">
            <button
              className={`px-4 py-2 ${activeTab === "summary" ? "border-b-2 border-[#01579B] text-[#01579B]" : "text-gray-600"}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`px-4 py-2 ${activeTab === "details" ? "border-b-2 border-[#01579B] text-[#01579B]" : "text-gray-600"}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            {activeTab === "summary" && report.data && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(report.data.summary || {}).map(([key, value]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-black mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-2xl font-bold text-black">{formatNumber(value)}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "details" && report.data && (
              <div className="space-y-6">
                {report.data.recent_elections && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-black">Recent Elections</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Election Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Start Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              End Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Voters
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Votes Cast
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Turnout
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {report.data.recent_elections.map((election, index) => (
                            <tr 
                              key={election.id || index} 
                              className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer`}
                              onClick={() => handleElectionClick(election)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-medium">
                                {election.title}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                {election.election_type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  election.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {election.status?.charAt(0).toUpperCase() + election.status?.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                {formatDateTime(election.start_date, election.start_time)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                {formatDateTime(election.end_date, election.end_time)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                {formatNumber(election.voter_count)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                {formatNumber(election.total_votes || election.votes_cast)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  calculateTurnout(election.total_votes || election.votes_cast, election.voter_count) >= 75 ? 'bg-green-100 text-green-800' :
                                  calculateTurnout(election.total_votes || election.votes_cast, election.voter_count) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {formatPercentage(calculateTurnout(election.total_votes || election.votes_cast, election.voter_count))}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {report.data.activities && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-black">Activities</h3>
                    <div className="space-y-4">
                      {report.data.activities.map((activity, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-black">{activity.action || 'Activity'}</h4>
                              <p className="text-sm text-gray-600">{activity.description || 'No description'}</p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDateTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}