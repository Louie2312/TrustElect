"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Download, X, Calendar, Eye } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function ElectionSummaryReport() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedElection, setSelectedElection] = useState(null);
  const [electionDetails, setElectionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes);
    }
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  };

  const calculateTurnout = (votes, voters) => {
    if (!voters || voters === 0) return 0;
    return (votes / voters) * 100;
  };

  const fetchSummaryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reports/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('Election Summary Data:', response.data.data);
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

  const fetchElectionDetails = async (electionId) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_BASE}/elections/${electionId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElectionDetails(response.data.election);
    } catch (error) {
      console.error("Error fetching election details:", error);
      alert("Failed to fetch election details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (election) => {
    setSelectedElection(election);
    fetchElectionDetails(election.id);
  };

  const handleCloseDetails = () => {
    setSelectedElection(null);
    setElectionDetails(null);
  };

  const generateElectionDetailPdf = async (electionDetails) => {
    try {
      if (!electionDetails) {
        throw new Error('No election details provided');
      }

      const reportData = {
        title: `${electionDetails.title || 'Election'} - Election Details`,
        description: `Detailed report for ${electionDetails.title || 'Unknown Election'} election`,
        summary: {
          election_title: electionDetails.title || 'Unknown Election',
          election_type: electionDetails.election_type || 'Unknown Type',
          status: electionDetails.status || 'Unknown Status',
          start_date: formatDateTime(electionDetails.date_from || electionDetails.start_date, electionDetails.start_time),
          end_date: formatDateTime(electionDetails.date_to || electionDetails.end_date, electionDetails.end_time),
          total_eligible_voters: electionDetails.voter_count || 0,
          total_votes_cast: electionDetails.vote_count || 0,
          voter_turnout_percentage: formatPercentage(calculateTurnout(electionDetails.vote_count || 0, electionDetails.voter_count || 0))
        },
        positions: (electionDetails.positions || []).map(position => ({
          name: position.name || 'Unknown Position',
          max_choices: position.max_choices || 1,
          candidates: (position.candidates || []).map(candidate => ({
            name: `${candidate.first_name} ${candidate.last_name}`,
            party: candidate.party || 'Independent',
            vote_count: candidate.vote_count || 0,
            vote_percentage: formatPercentage(electionDetails.vote_count > 0 ? 
              ((candidate.vote_count || 0) / electionDetails.vote_count * 100) : 0)
          }))
        }))
      };

      const result = await generatePdfReport(11, reportData); // 11 for Election Detail
      if (!result.success) {
        console.error('PDF generation failed:', result.message);
        alert('Failed to generate PDF: ' + result.message);
      }
      return result;
    } catch (error) {
      console.error('Error generating election detail PDF:', error);
      alert('Error generating election detail PDF: ' + error.message);
      return { success: false, message: error.message };
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
          start_date: formatDate(election.start_date),
          end_date: formatDate(election.end_date),
          voter_count: election.voter_count,
          total_votes: election.total_votes,
          turnout_percentage: formatPercentage((election.total_votes / election.voter_count * 100) || 0)
        }))
      };

      const result = await generatePdfReport(1, reportData); // 1 is the report ID for Election Summary
      if (!result.success) {
        console.error('PDF generation failed:', result.message);
        alert('Failed to generate PDF: ' + result.message);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handleDownloadElectionDetails = async () => {
    if (!electionDetails) {
      console.error('No election details available');
      return;
    }
    
    try {
      const result = await generateElectionDetailPdf(electionDetails);
      if (result && !result.success) {
        console.error('Election detail PDF generation failed:', result.message);
        alert('Failed to generate PDF: ' + result.message);
      }
    } catch (error) {
      console.error('Error generating election detail report:', error);
      alert('Error generating election detail PDF: ' + error.message);
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

  if (!summaryData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No election data available</p>
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
            onClick={electionDetails ? handleDownloadElectionDetails : handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            {electionDetails ? 'Download Election PDF' : 'Download Summary PDF'}
          </button>
        </div>
      </div>

      {loadingDetails && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#01579B]"></div>
        </div>
      )}

      {!loadingDetails && activeTab === "summary" && summaryData && (
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

      {!loadingDetails && activeTab === "details" && !electionDetails && summaryData && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Election Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voters</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes Cast</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnout</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.recent_elections.map((election, index) => (
                  <tr key={election.id} className={`cursor-pointer hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} onClick={() => handleViewDetails(election)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                      {election.title}
                      <Eye className="w-4 h-4 text-blue-600" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{election.election_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        election.status === 'completed' ? 'bg-green-100 text-green-800' :
                        election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(election.start_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(election.end_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(election.voter_count)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(election.total_votes)}</td>
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
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">No election data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loadingDetails && activeTab === "details" && electionDetails && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">{electionDetails.title}</h3>
            <button 
              onClick={handleCloseDetails}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600">{electionDetails.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Eligible Voters</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(electionDetails.voter_count || 0)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Votes Cast</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(electionDetails.vote_count !== undefined ? electionDetails.vote_count : 0)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Voter Turnout</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatPercentage(calculateTurnout(
                  electionDetails.vote_count !== undefined ? electionDetails.vote_count : 0,
                  electionDetails.voter_count !== undefined ? electionDetails.voter_count : 0
                ))}
              </p>
            </div>
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mt-6">Ballot Details</h4>
          <div className="space-y-4">
            {(electionDetails.positions || []).map(position => (
              <div key={position.id} className="border rounded-lg p-4">
                <h5 className="font-semibold text-gray-800">{position.name}</h5>
                <p className="text-sm text-gray-600">Max Choices: {position.max_choices}</p>
                <div className="mt-2 space-y-2">
                  {(position.candidates || []).map(candidate => (
                    <div key={candidate.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span className="text-gray-800">{`${candidate.first_name} ${candidate.last_name}`} ({candidate.party})</span>
                      <span className="font-medium text-gray-800">{formatNumber(candidate.vote_count || 0)} votes ({formatPercentage(electionDetails.vote_count > 0 ? ((candidate.vote_count || 0) / electionDetails.vote_count * 100) : 0)})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 

