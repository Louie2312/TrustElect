"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Download, X, Calendar, Eye } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';
import Cookies from 'js-cookie';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '/images/default-avatar.png';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('blob:')) return imageUrl;
  
  // Handle different image path formats
  let cleanImageUrl = imageUrl;
  
  // Remove leading slashes
  if (cleanImageUrl.startsWith('/')) {
    cleanImageUrl = cleanImageUrl.substring(1);
  }
  
  // If it already starts with uploads, use it directly
  if (cleanImageUrl.startsWith('uploads/')) {
    return `${API_BASE}/${cleanImageUrl}`;
  }
  
  // If it's just a filename, assume it's in candidates folder
  if (!cleanImageUrl.includes('/')) {
    return `${API_BASE}/uploads/candidates/${cleanImageUrl}`;
  }
  
  // Default case
  return `${API_BASE}/uploads/candidates/${cleanImageUrl}`;
};

const formatNameSimple = (lastName, firstName, fallback) => {
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  if ((!lastName && !firstName) && fallback) {
    const words = fallback.trim().split(/\s+/);
    if (words.length === 1) return cap(words[0]);
    const last = cap(words[words.length - 1]);
    const first = words.slice(0, -1).map(cap).join(' ');
    return `${last}, ${first}`;
  }
  if (!lastName && !firstName) return 'No Name';
  return `${cap(lastName)}, ${cap(firstName)}`;
};

export default function ElectionSummaryReport() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedElection, setSelectedElection] = useState(null);
  const [electionDetails, setElectionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [summaryLoading, setSummaryLoading] = useState(false);
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

  const fetchSummaryData = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const response = await axios.get(`${API_BASE}/reports/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
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
      setSummaryLoading(false);
    }
  }, [token]);

  const fetchElectionDetails = useCallback(async (electionId) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_BASE}/elections/${electionId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      });
      setElectionDetails(response.data.election);
    } catch (error) {
      console.error("Error fetching election details:", error);
      alert("Failed to fetch election details.");
    } finally {
      setLoadingDetails(false);
    }
  }, [token]);

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

  if (summaryLoading) {
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
        <div>
          <h2 className="text-xl font-bold text-black">Election Summary Report</h2>
          <p className="text-sm text-black">Overview of all elections with detailed statistics and voter turnout</p>
        </div>
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
          onClick={electionDetails ? handleDownloadElectionDetails : handleDownload}
          className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
        >
          <Download className="w-5 h-5 mr-2" />
          {electionDetails ? 'Download Election PDF' : 'Download Summary PDF'}
        </button>
      </div>

      {loadingDetails && (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#01579B]"></div>
        </div>
      )}

      <div className="overflow-y-auto max-h-[50vh]">
        {activeTab === "summary" && summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Total Elections</h3>
              <p className="text-2xl font-bold text-black">{formatNumber(summaryData.summary.total_elections)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Ongoing Elections</h3>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(summaryData.summary.ongoing_elections)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Completed Elections</h3>
              <p className="text-2xl font-bold text-green-600">{formatNumber(summaryData.summary.completed_elections)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Upcoming Elections</h3>
              <p className="text-2xl font-bold text-orange-600">{formatNumber(summaryData.summary.upcoming_elections)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Total Eligible Voters</h3>
              <p className="text-2xl font-bold text-black">{formatNumber(summaryData.summary.total_eligible_voters)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-1">Total Votes Cast</h3>
              <p className="text-2xl font-bold text-black">{formatNumber(summaryData.summary.total_votes_cast)}</p>
              <p className="text-sm text-gray-500">
                {formatPercentage(summaryData.summary.voter_turnout_percentage)} turnout
              </p>
            </div>
          </div>
        )}

        {activeTab === "details" && summaryData && (
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
                {summaryData.recent_elections.map((election) => (
                  <tr key={election.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(election)}>
                    <td className="p-3 text-sm text-black flex items-center gap-2">
                      {election.title}
                      <Eye className="w-4 h-4 text-blue-600" />
                    </td>
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
                    <td className="p-3 text-sm text-black">{formatNumber(election.voter_count)}</td>
                    <td className="p-3 text-sm text-black">{formatNumber(election.total_votes)}</td>
                    <td className="p-3 text-sm text-black">{formatPercentage((election.total_votes / election.voter_count * 100) || 0)}</td>
                  </tr>
                ))}
                {summaryData.recent_elections.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-3 text-center text-gray-500">No election data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Election Details Modal */}
      {selectedElection && electionDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">{electionDetails.title}</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Start: {formatDateTime(electionDetails.date_from || electionDetails.start_date, electionDetails.start_time)}</p>
                  <p>End: {formatDateTime(electionDetails.date_to || electionDetails.end_date, electionDetails.end_time)}</p>
                  <p className="mt-2">Status: <span className={`inline-block px-2 py-1 rounded-full text-xs ${electionDetails.status === 'ongoing' ? 'bg-blue-100 text-blue-800' : electionDetails.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{electionDetails.status?.toUpperCase()}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownloadElectionDetails}
                  className="flex items-center text-white bg-[#01579B] px-4 py-2 rounded hover:bg-[#01416E]"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </button>
                <button onClick={handleCloseDetails} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-black">Election Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Eligible Voters</p>
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(electionDetails.voter_count || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Votes Cast</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatNumber(electionDetails.vote_count !== undefined ? electionDetails.vote_count : 0)}
                    </p>
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
              </div>
              
              <h3 className="text-lg font-semibold mb-4 text-black">Ballot Details</h3>
              <div className="space-y-8">
                {electionDetails.positions?.map((position) => (
                  <div key={position.id} className="border rounded-lg p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-black">{position.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Maximum choices: {position.max_choices || 1}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {position.candidates?.map((candidate, index) => (
                        <div key={candidate.id} className="bg-white border rounded-lg p-4 flex items-start space-x-4 hover:shadow-md transition-shadow duration-200">
                          <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                            <Image
                              src={getImageUrl(candidate.image_url)}
                              alt={formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                              fill
                              sizes="96px"
                              className="rounded-lg object-cover object-center"
                              style={{ objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = '/images/default-avatar.png';
                              }}
                            />
                          </div>
                          <div className="flex-grow">
                            <h4 className="font-medium text-black text-lg">
                              {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                            </h4>
                            {candidate.party && (
                              <div className="flex items-center mt-1">
                                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">{candidate.party}</span>
                              </div>
                            )}
                            {electionDetails.status !== 'upcoming' && (
                              <div className="mt-3 space-y-1">
                                <p className="text-sm font-medium text-blue-600">
                                  Total Votes: {formatNumber(candidate.vote_count || 0)}
                                </p>
                                {parseInt(electionDetails.vote_count || 0) > 0 && (
                                  <p className="text-xs text-gray-500">
                                    {formatPercentage((parseInt(candidate.vote_count || 0) / parseInt(electionDetails.vote_count || 1)) * 100)} of total votes
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 

