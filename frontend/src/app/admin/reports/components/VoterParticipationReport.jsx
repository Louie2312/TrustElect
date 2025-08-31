"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { generateReport } from '@/utils/reportGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const VOTERS_PER_PAGE = 10;

export default function VoterParticipationReport() {
  const [participationData, setParticipationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { token } = useAuth();

  useEffect(() => {
    fetchParticipationData();
  }, []);

  useEffect(() => {
    // Reset to first page when election changes
    setCurrentPage(1);
  }, [selectedElection?.id]);

  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return "0.00%";
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const fetchParticipationData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/reports/admin/voter-participation`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setParticipationData(response.data.data);
        if (response.data.data.elections.length > 0) {
          setSelectedElection(response.data.data.elections[0]);
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch voter participation data');
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching voter participation data:', error);
      setError('Failed to fetch voter participation data');
    } finally {
      setLoading(false);
    }
  };

  const getPaginatedVoters = () => {
    if (!selectedElection?.voters) return [];
    const startIndex = (currentPage - 1) * VOTERS_PER_PAGE;
    return selectedElection.voters.slice(startIndex, startIndex + VOTERS_PER_PAGE);
  };

  const totalPages = selectedElection?.voters 
    ? Math.ceil(selectedElection.voters.length / VOTERS_PER_PAGE) 
    : 0;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Voter Participation Report",
        description: "Detailed voter participation analysis including turnout trends and voting patterns",
        summary: {
          total_eligible_voters: selectedElection.total_eligible_voters,
          total_votes_cast: selectedElection.total_votes_cast,
          turnout_percentage: selectedElection.turnout_percentage
        },
        department_stats: selectedElection.department_stats.map(dept => ({
          department: dept.department,
          eligible_voters: dept.eligible_voters,
          votes_cast: dept.votes_cast,
          turnout: dept.turnout
        })),
        voters: selectedElection.voters.map(voter => ({
          student_id: voter.student_id,
          name: `${voter.first_name} ${voter.last_name}`,
          department: voter.department,
          status: voter.has_voted ? 'Voted' : 'Not Voted',
          vote_date: voter.vote_date ? format(new Date(voter.vote_date), 'MMM d, yyyy h:mm a') : '-'
        }))
      };

      await generateReport(8, reportData); // 8 is the report ID for Voter Participation Report
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
        <h2 className="text-xl font-semibold text-[#01579B]">Voter Participation Report</h2>
        <div className="flex items-center gap-4">
          {participationData?.elections && (
            <select
              className="border rounded-md px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01579B]"
              value={selectedElection?.id || ''}
              onChange={(e) => {
                const election = participationData.elections.find(el => el.id === parseInt(e.target.value));
                setSelectedElection(election);
              }}
            >
              {participationData.elections.map(election => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {selectedElection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Eligible Voters</h3>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedElection.total_eligible_voters)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Votes Cast</h3>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(selectedElection.total_votes_cast)}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Voter Turnout</h3>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(selectedElection.turnout_percentage)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h3 className="px-6 py-3 text-lg font-semibold border-b">Department Statistics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eligible Voters
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
                  {selectedElection.department_stats.map((dept, index) => (
                    <tr key={dept.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dept.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(dept.eligible_voters)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(dept.votes_cast)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          dept.turnout >= 75 ? 'bg-green-100 text-green-800' :
                          dept.turnout >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formatPercentage(dept.turnout)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {selectedElection.department_stats.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No department statistics available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-3 flex justify-between items-center border-b">
              <h3 className="text-lg font-semibold">Voter List</h3>
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * VOTERS_PER_PAGE) + 1} to {Math.min(currentPage * VOTERS_PER_PAGE, selectedElection.voters.length)} of {selectedElection.voters.length} voters
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPaginatedVoters().map((voter, index) => (
                    <tr key={voter.student_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {`${voter.first_name} ${voter.last_name}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          voter.has_voted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {voter.has_voted ? 'Voted' : 'Not Voted'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.vote_date ? format(new Date(voter.vote_date), 'MMM d, yyyy h:mm a') : '-'}
                      </td>
                    </tr>
                  ))}
                  {selectedElection.voters.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        No voter data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#01579B] hover:bg-blue-50'
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded ${
                          currentPage === pageNum
                            ? 'bg-[#01579B] text-white'
                            : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#01579B] hover:bg-blue-50'
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 