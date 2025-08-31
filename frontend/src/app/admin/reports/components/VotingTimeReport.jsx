"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';
import { generateReport } from '@/utils/reportGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function VotingTimeReport() {
  const [votingData, setVotingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState('all');
  const [elections, setElections] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    fetchElections();
    fetchVotingData();
  }, [selectedElection]);

  const fetchElections = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/elections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElections(response.data);
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError('Failed to fetch elections');
    }
  };

  const fetchVotingData = async () => {
    try {
      setLoading(true);
      const endpoint = selectedElection === 'all' 
        ? '/api/reports/voting-time'
        : `/api/reports/voting-time/${selectedElection}`;
      
      const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setVotingData(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch voting time data');
      }
    } catch (error) {
      console.error('Error fetching voting time data:', error);
      setError(error.message || 'Failed to fetch voting time data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const reportData = {
        title: "Voting Time Report",
        description: "Track when voters cast their votes, including timestamps and voter IDs",
        summary: {
          total_votes: votingData.length,
          unique_voters: new Set(votingData.map(v => v.student_id)).size
        },
        voting_data: votingData.map(vote => ({
          student_id: vote.student_id,
          election_title: vote.election_title,
          first_vote_time: format(new Date(vote.first_vote_time), 'MMM d, yyyy h:mm:ss a'),
          last_vote_time: format(new Date(vote.last_vote_time), 'MMM d, yyyy h:mm:ss a'),
          total_votes: vote.total_votes
        }))
      };

      await generateReport(12, reportData); // 12 is the report ID for Voting Time Report
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
            className="border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#01579B]"
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
                  Election Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Vote Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Vote Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Votes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {votingData.map((vote, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vote.student_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vote.election_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(vote.first_vote_time), 'MMM d, yyyy h:mm:ss a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(vote.last_vote_time), 'MMM d, yyyy h:mm:ss a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vote.total_votes}
                  </td>
                </tr>
              ))}
              {votingData.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No voting data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 