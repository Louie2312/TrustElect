"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function VotingTimeReport() {
  const [votingData, setVotingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState('all');
  const [elections, setElections] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const { token } = useAuth();

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      setCurrentPage(1);
      fetchVotingTimeData(selectedElection, 1);
    }
  }, [selectedElection]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchVotingTimeData(selectedElection, newPage);
  };

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_BASE}/elections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElections(response.data);
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError('Failed to fetch elections');
    }
  };

  const fetchVotingTimeData = async (electionId, page = 1) => {
    try {
      setLoading(true);
      const endpoint = electionId === 'all' 
        ? `/reports/voting-time?page=${page}&limit=50` 
        : `/reports/voting-time/${electionId}?page=${page}&limit=50`;
      
      console.log('Fetching voting time data from:', `${API_BASE}${endpoint}`);
      
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success) {
        setVotingData(response.data.data);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: response.data.data.length,
          hasNextPage: false,
          hasPrevPage: false
        });
        setError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch voting time data');
      }
    } catch (error) {
      console.error('Error fetching voting time data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch voting time data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Voting Time Report",
        description: "Detailed voter activity tracking including login times, session duration, and device information",
        summary: {
          total_voters: votingData.length,
          voted_count: votingData.filter(v => v.status === 'Voted').length,
          not_voted_count: votingData.filter(v => v.status === 'Not Voted').length
        },
        voting_data: votingData.map(voter => ({
          voter_id: voter.voter_id,
          election_title: voter.election_title,
          login_time: voter.login_time ? format(new Date(voter.login_time), 'yyyy-MM-dd HH:mm:ss') : '—',
          vote_submitted_time: voter.vote_submitted_time ? format(new Date(voter.vote_submitted_time), 'yyyy-MM-dd HH:mm:ss') : '—',
          session_duration: voter.session_duration || '—',
          status: voter.status,
          device_browser_info: voter.device_browser_info || '—'
        }))
      };

      await generatePdfReport(12, reportData); // 12 is the report ID for Voting Time Report
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
        <h2 className="text-xl font-semibold text-[#01579B]">Voting Time Report</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="border rounded-md p-2 text-black focus:outline-none focus:ring-2 focus:ring-[#01579B]"
          >
            <option value="all">All Elections</option>
            {elections.map(election => (
              <option key={election.id} value={election.id}>
                {election.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded hover:bg-[#01416E] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vote Submitted Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address Device / Browser
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {votingData.map((voter, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voter.voter_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voter.login_time ? format(new Date(voter.login_time), 'yyyy-MM-dd HH:mm:ss') : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voter.vote_submitted_time ? format(new Date(voter.vote_submitted_time), 'yyyy-MM-dd HH:mm:ss') : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voter.session_duration || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      voter.status === 'Voted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {voter.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voter.device_browser_info || '—'}
                  </td>
                </tr>
              ))}
              {votingData.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No voting data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {votingData.length > 0 && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {votingData.length} of {pagination.totalCount} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !pagination.hasPrevPage
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#01579B] text-white hover:bg-[#01416E]'
              }`}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !pagination.hasNextPage
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#01579B] text-white hover:bg-[#01416E]'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}