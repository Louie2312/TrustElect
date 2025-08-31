"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';
import { generateReport } from '@/utils/reportGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ElectionSummaryReport() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const { token } = useAuth();

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return "0.00%";
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/reports/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSummaryData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch election summary data');
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching election summary data:', error);
      setError('Failed to fetch election summary data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Election Summary Report",
        description: "Overview of all elections with detailed statistics and voter turnout",
        summary: {
          total_elections: summaryData.summary.total_elections,
          ongoing_elections: summaryData.summary.ongoing_elections,
          completed_elections: summaryData.summary.completed_elections,
          upcoming_elections: summaryData.summary.upcoming_elections,
          total_eligible_voters: summaryData.summary.total_eligible_voters,
          total_votes_cast: summaryData.summary.total_votes_cast,
          voter_turnout_percentage: summaryData.summary.voter_turnout_percentage
        },
        recent_elections: summaryData.recent_elections.map(election => ({
          title: election.title,
          election_type: election.election_type,
          status: election.status,
          start_date: format(new Date(election.start_date), 'MMM d, yyyy'),
          end_date: format(new Date(election.end_date), 'MMM d, yyyy'),
          voter_count: election.voter_count,
          total_votes: election.total_votes,
          turnout_percentage: ((election.total_votes / election.voter_count * 100) || 0).toFixed(2) + '%'
        }))
      };

      await generateReport(1, reportData); // 1 is the report ID for Election Summary
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#01579B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#01579B]">Election Summary Report</h2>
        <div className="flex items-center gap-4">
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-4 py-2 ${activeTab === "summary" ? "bg-[#01579B] text-white" : "bg-white text-gray-600"}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`px-4 py-2 ${activeTab === "details" ? "bg-[#01579B] text-white" : "bg-white text-gray-600"}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {activeTab === "summary" && summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Elections</h3>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.summary.total_elections)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Ongoing Elections</h3>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(summaryData.summary.ongoing_elections)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Elections</h3>
            <p className="text-2xl font-bold text-green-600">{formatNumber(summaryData.summary.completed_elections)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Upcoming Elections</h3>
            <p className="text-2xl font-bold text-orange-600">{formatNumber(summaryData.summary.upcoming_elections)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Eligible Voters</h3>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.summary.total_eligible_voters)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Votes Cast</h3>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(summaryData.summary.total_votes_cast)}</p>
            <p className="text-sm text-gray-500">
              {formatPercentage(summaryData.summary.voter_turnout_percentage)} turnout
            </p>
          </div>
        </div>
      )}

      {activeTab === "details" && summaryData && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                {summaryData.recent_elections.map((election, index) => (
                  <tr key={election.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {election.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {election.election_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        election.status === 'completed' ? 'bg-green-100 text-green-800' :
                        election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(election.start_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(election.end_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(election.voter_count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(election.total_votes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        (election.total_votes / election.voter_count * 100) >= 75 ? 'bg-green-100 text-green-800' :
                        (election.total_votes / election.voter_count * 100) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatPercentage((election.total_votes / election.voter_count * 100) || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
                {summaryData.recent_elections.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                      No election data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 

