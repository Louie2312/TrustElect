import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Cookies from 'js-cookie';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const ElectionResultReport = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    elections: [],
    selectedElection: null,
    positions: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      total_pages: 0
    }
  });
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch completed elections
  const fetchElections = async () => {
    try {
      const token = Cookies.get('token');
      const response = await axios.get(`${API_BASE}/elections/status/completed`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setData(prev => ({
          ...prev,
          elections: response.data
        }));
      }
    } catch (err) {
      console.error('Error fetching elections:', err);
      setError('Failed to fetch elections');
    } finally {
      setLoading(false);
    }
  };

  // Fetch election results
  const fetchResults = async (electionId) => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      
      const response = await axios.get(`${API_BASE}/elections/completed/${electionId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch election results');
      }

      const { election, positions } = response.data.data;
      
      // Flatten positions and candidates for table display
      const results = [];
      positions.forEach(position => {
        position.candidates.forEach(candidate => {
          results.push({
            position: position.position_name,
            candidate_id: candidate.id,
            candidate_name: `${candidate.first_name} ${candidate.last_name}`,
            image_url: candidate.image_url,
            partylist: candidate.partylist_name || '-',
            vote_count: candidate.vote_count,
            is_winner: candidate.is_winner
          });
        });
      });

      setData(prev => ({
        ...prev,
        selectedElection: election,
        positions: results,
        pagination: {
          ...prev.pagination,
          total: results.length,
          total_pages: Math.ceil(results.length / prev.pagination.limit)
        }
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching election results:', err);
      setError(err.response?.data?.message || 'Failed to fetch election results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElectionId) {
      fetchResults(selectedElectionId);
    } else {
      setData(prev => ({
        ...prev,
        selectedElection: null,
        positions: []
      }));
    }
  }, [selectedElectionId]);

  const handleElectionChange = (event) => {
    setSelectedElectionId(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleDownload = async () => {
    if (!selectedElectionId) return;

    try {
      const reportData = {
        title: "Election Result Report",
        description: "Comprehensive election results including candidates, vote counts, and winners",
        election_details: {
          title: data.selectedElection.title,
          type: data.selectedElection.election_type,
          status: data.selectedElection.status,
          total_votes: data.selectedElection.total_votes,
          date: new Date(data.selectedElection.date_to).toLocaleDateString()
        },
        positions: data.positions.map(result => ({
          position: result.position,
          candidates: [{
            name: result.candidate_name,
            party: result.partylist || 'Independent',
            vote_count: result.vote_count,
            status: result.is_winner ? 'Winner' : 'Runner-up'
          }]
        }))
      };

      await generateReport(13, reportData); // 13 is the report ID for Election Result Report
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  // Calculate paginated results
  const getPaginatedResults = () => {
    const startIndex = (currentPage - 1) * data.pagination.limit;
    const endIndex = startIndex + data.pagination.limit;
    return data.positions.slice(startIndex, endIndex);
  };

  if (loading && !data.elections.length) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01579B]"></div>
    </div>
  );

  if (error && !data.elections.length) return (
    <div className="bg-red-50 p-4 rounded-md">
      <p className="text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <select
          value={selectedElectionId}
          onChange={handleElectionChange}
          className="w-64 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01579B] text-black"
        >
          <option value="">Select Election</option>
          {data.elections.map(election => (
            <option key={election.id} value={election.id}>
              {election.title} ({new Date(election.date_to).toLocaleDateString()})
            </option>
          ))}
        </select>
        <button
          onClick={handleDownload}
          disabled={!selectedElectionId}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            selectedElectionId 
              ? 'bg-[#01579B] text-white hover:bg-[#01416E]' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      {data.selectedElection && (
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
          <h2 className="text-xl font-semibold text-black mb-2">{data.selectedElection.title}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-black mb-4">
            <div>
              <p><span className="font-medium">Date:</span> {new Date(data.selectedElection.date_to).toLocaleDateString()}</p>
              <p><span className="font-medium">Type:</span> {data.selectedElection.election_type}</p>
            </div>
            <div>
              <p><span className="font-medium">Total Votes Cast:</span> {data.selectedElection.total_votes}</p>
              <p><span className="font-medium">Status:</span> {data.selectedElection.status}</p>
            </div>
          </div>
        </div>
      )}

      {selectedElectionId && loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01579B]"></div>
        </div>
      ) : selectedElectionId && error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      ) : selectedElectionId && data.positions.length > 0 ? (
        <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black">Position</TableHead>
                <TableHead className="text-black">Candidate</TableHead>
                <TableHead className="text-black">Party List</TableHead>
                <TableHead className="text-black">Vote Count</TableHead>
                <TableHead className="text-black">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getPaginatedResults().map((result) => (
                <TableRow key={`${result.position}-${result.candidate_id}`}>
                  <TableCell className="text-black">{result.position}</TableCell>
                  <TableCell className="text-black">
                    <div className="flex items-center gap-2">
                      {result.image_url && (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={result.image_url}
                            alt={result.candidate_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      {result.candidate_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-black">{result.partylist}</TableCell>
                  <TableCell className="text-black">{result.vote_count}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      result.is_winner 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {result.is_winner ? 'Winner' : 'Runner-up'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : selectedElectionId ? (
        <div className="text-center py-8 text-gray-500">
          No results available for this election
        </div>
      ) : null}

      {/* Pagination */}
      {selectedElectionId && data.positions.length > 0 && (
        <div className="flex justify-between items-center mt-4 bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-black">
            Showing {getPaginatedResults().length} of {data.positions.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#01579B] text-white hover:bg-[#01416E]'
              }`}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-black">
              Page {currentPage} of {data.pagination.total_pages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === data.pagination.total_pages}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === data.pagination.total_pages
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
};

export default ElectionResultReport; 