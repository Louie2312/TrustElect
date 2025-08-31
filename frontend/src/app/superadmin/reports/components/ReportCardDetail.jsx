"use client";

import { useState } from "react";
import { Download, X, Calendar, Filter, Users, BarChart2, Eye } from "lucide-react";
import { generatePdfReport } from '@/utils/pdfGenerator';
import Cookies from 'js-cookie';
import Image from 'next/image';

const API_BASE = '/api';
const BASE_URL = '';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '/default-candidate.png';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/uploads')) return `${BASE_URL}${imageUrl}`;
  if (!imageUrl.startsWith('/')) return `${BASE_URL}/uploads/candidates/${imageUrl}`;
  return `${BASE_URL}${imageUrl}`;
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

// Helper functions moved outside the component to be accessible by generateElectionDetailPdf
const formatDate = (dateString) => {
  if (!dateString) {
    console.log('formatDate: No date string provided');
    return 'N/A';
  }
  
  try {
    // Handle different date formats
    let dateObj;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      dateObj = dateString;
    }
    // If it's a string, try to parse it
    else if (typeof dateString === 'string') {
      // Handle ISO date strings, MySQL datetime format, etc.
      dateObj = new Date(dateString);
      
      // If that fails, try parsing common formats
      if (isNaN(dateObj.getTime())) {
        // Try parsing YYYY-MM-DD format
        const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          dateObj = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
        }
      }
    }
    // Handle timestamp numbers
    else if (typeof dateString === 'number') {
      dateObj = new Date(dateString);
    }
    else {
      console.log('formatDate: Unsupported date type:', typeof dateString, dateString);
      return 'N/A';
    }
    
    // Validate the date object
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.log('formatDate: Invalid date after parsing:', dateString);
      return 'N/A';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('formatDate: Error formatting date:', error, dateString);
    return 'N/A';
  }
};

const formatDateTime = (dateString, timeString) => {
  if (!dateString) {
    console.log('formatDateTime: Missing date string');
    return 'N/A';
  }
  
  try {
    // First format the date
    const formattedDate = formatDate(dateString);
    
    // If date formatting failed, return N/A
    if (formattedDate === 'N/A') {
      console.log('formatDateTime: Date formatting failed for:', dateString);
      return 'N/A';
    }
    
    // If we have a time string, append it
    if (timeString && timeString.trim() !== '') {
      // Clean up the time string
      const cleanTime = timeString.trim();
      return `${formattedDate} at ${cleanTime}`;
    }
    
    return formattedDate;
  } catch (error) {
    console.error('formatDateTime: Error formatting date/time:', error, dateString, timeString);
    return 'N/A';
  }
};

const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  return `${parseFloat(value).toFixed(2)}%`;
};

const calculateTurnout = (votesCast, totalVoters) => {
  if (!totalVoters || totalVoters === 0) return 0;
  
  // Handle both string and number types
  let votes = 0;
  let voters = 0;
  
  try {
    votes = typeof votesCast === 'string' ? 
      parseInt(votesCast.replace(/,/g, '')) : 
      parseInt(votesCast || 0);
      
    voters = typeof totalVoters === 'string' ? 
      parseInt(totalVoters.replace(/,/g, '')) : 
      parseInt(totalVoters || 0);
  } catch (error) {
    console.error('Error parsing vote counts:', error);
    return 0;
  }
  
  if (isNaN(votes) || isNaN(voters) || voters === 0) return 0;
  return (votes / voters) * 100;
};

// Function to generate PDF for a single election
const generateElectionDetailPdf = async (electionDetails) => {
  try {
    // Prepare data for the PDF
    const reportData = {
      title: `${electionDetails.title} - Election Details`,
      description: `Detailed report for ${electionDetails.title} election`,
      summary: {
        election_title: electionDetails.title,
        election_type: electionDetails.election_type,
        status: electionDetails.status,
        start_date: formatDateTime(electionDetails.date_from, electionDetails.start_time),
        end_date: formatDateTime(electionDetails.date_to, electionDetails.end_time),
        total_eligible_voters: formatNumber(electionDetails.voter_count || 0),
        total_votes_cast: formatNumber(electionDetails.vote_count || 0),
        voter_turnout_percentage: formatPercentage(calculateTurnout(electionDetails.vote_count || 0, electionDetails.voter_count || 0))
      },
      positions: electionDetails.positions?.map(position => ({
        name: position.name,
        max_choices: position.max_choices || 1,
        candidates: position.candidates?.map(candidate => ({
          name: formatNameSimple(candidate.last_name, candidate.first_name, candidate.name),
          party: candidate.party || 'Independent',
          vote_count: formatNumber(candidate.vote_count || 0),
          vote_percentage: formatPercentage(electionDetails.vote_count > 0 ? 
            ((candidate.vote_count || 0) / electionDetails.vote_count * 100) : 0)
        }))
      }))
    };

    // Generate the PDF using a new report type (11 for Election Detail)
    await generatePdfReport(11, reportData);
    return true;
  } catch (error) {
    console.error('Error generating election detail PDF:', error);
    throw error;
  }
};

export default function ReportDetailsModal({ report, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filters, setFilters] = useState({
    department: "All",
    electionType: "All",
  });
  const [selectedElection, setSelectedElection] = useState(null);
  const [electionDetails, setElectionDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const fetchElectionDetails = async (electionId) => {
    setIsLoadingDetails(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/elections/${electionId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch election details');
      
      const data = await response.json();
      console.log('Election details received:', data.election);
      console.log('Date values detailed:', {
        start_date: data.election.start_date,
        start_date_type: typeof data.election.start_date,
        end_date: data.election.end_date,
        end_date_type: typeof data.election.end_date,
        start_time: data.election.start_time,
        end_time: data.election.end_time
      });
      
      // Test the formatting functions with the received data
      console.log('Formatted dates test:', {
        formatted_start: formatDateTime(data.election.start_date, data.election.start_time),
        formatted_end: formatDateTime(data.election.end_date, data.election.end_time)
      });
      
      setElectionDetails(data.election);
    } catch (error) {
      console.error('Error fetching election details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = async (election) => {
    setSelectedElection(election);
    await fetchElectionDetails(election.id);
  };

  const handleCloseDetails = () => {
    setSelectedElection(null);
    setElectionDetails(null);
  };

  const handleDownload = async () => {
    const reportData = {
      title: "Election Summary Report",
      description: "Overview of all elections with detailed statistics and voter turnout",
      summary: {
        total_elections: formatNumber(report.data.summary.total_elections),
        ongoing_elections: formatNumber(report.data.summary.ongoing_elections),
        completed_elections: formatNumber(report.data.summary.completed_elections),
        upcoming_elections: formatNumber(report.data.summary.upcoming_elections),
        total_eligible_voters: formatNumber(report.data.summary.total_eligible_voters),
        total_votes_cast: formatNumber(report.data.summary.total_votes_cast),
        voter_turnout_percentage: formatPercentage(report.data.summary.voter_turnout_percentage)
      },
      recent_elections: report.data.recent_elections.map(election => ({
        title: election.title,
        election_type: election.election_type,
        status: election.status,
        start_date: formatDateTime(election.start_date, election.start_time),
        end_date: formatDateTime(election.end_date, election.end_time),
        voter_count: formatNumber(election.voter_count),
        votes_cast: formatNumber(election.votes_cast),
        turnout_percentage: formatPercentage(election.turnout_percentage)
      }))
    };

    try {
      await generatePdfReport(1, reportData); // 1 is the report ID for Election Summary
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  // Function to handle downloading individual election details
  const handleDownloadElectionDetails = async () => {
    if (!electionDetails) return;
    
    try {
      await generateElectionDetailPdf(electionDetails);
    } catch (error) {
      console.error('Error generating election detail report:', error);
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
              Download PDF
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh]">
            {activeTab === "summary" && report.data && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Elections</h3>
                  <p className="text-2xl font-bold text-black">{formatNumber(report.data.summary.total_elections)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Ongoing Elections</h3>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(report.data.summary.ongoing_elections)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Completed Elections</h3>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(report.data.summary.completed_elections)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Upcoming Elections</h3>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(report.data.summary.upcoming_elections)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Eligible Voters</h3>
                  <p className="text-2xl font-bold text-black">{formatNumber(report.data.summary.total_eligible_voters)}</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-black mb-1">Total Votes Cast</h3>
                  <p className="text-2xl font-bold text-black">{formatNumber(report.data.summary.total_votes_cast)}</p>
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
                        <td className="p-3 text-sm text-black">{formatNumber(election.votes_cast)}</td>
                        <td className="p-3 text-sm text-black">{formatPercentage(election.turnout_percentage)}</td>
                      </tr>
                    ))}
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
                      <p>Start: {formatDateTime(electionDetails.date_from, electionDetails.start_time)}</p>
                      <p>End: {formatDateTime(electionDetails.date_to, electionDetails.end_time)}</p>
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
                              <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                                <Image
                                  src={getImageUrl(candidate.image_url)}
                                  alt={formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                  fill
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  priority
                                  className="rounded-lg object-cover object-center"
                                  style={{ objectFit: 'cover' }}
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
      </div>
    </div>
  );
}
