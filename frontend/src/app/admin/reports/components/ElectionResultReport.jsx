import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Cookies from 'js-cookie';
import Image from 'next/image';
import { Download, Award, User, Trophy, Medal } from 'lucide-react';
import { generatePdfReport } from '@/utils/pdfGenerator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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

const formatNameSimple = (lastName, firstName, positionName) => {
  if (!lastName || !firstName) return 'Unknown Candidate';
  
  // For positions like "President", "Vice President", etc., use "Last, First" format
  if (positionName && (positionName.toLowerCase().includes('president') || 
      positionName.toLowerCase().includes('vice') || 
      positionName.toLowerCase().includes('secretary') ||
      positionName.toLowerCase().includes('treasurer'))) {
    return `${lastName}, ${firstName}`;
  }
  
  // For other positions, use "First Last" format
  return `${firstName} ${lastName}`;
};

const ElectionResultReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    elections: [],
    selectedElection: null,
    positions: [],
    groupedPositions: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      total_pages: 0
    }
  });
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [electionsLoading, setElectionsLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Fetch completed elections - optimized
  const fetchElections = useCallback(async () => {
    try {
      setElectionsLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(`${API_BASE}/elections/status/completed`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      });

      if (response.data) {
        setData(prev => ({
          ...prev,
          elections: response.data
        }));
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching elections:', err);
      setError(err.response?.data?.message || 'Failed to fetch elections');
    } finally {
      setElectionsLoading(false);
    }
  }, []);

  // Fetch election results - optimized
  const fetchResults = useCallback(async (electionId) => {
    try {
      setResultsLoading(true);
      setError(null);
      const token = Cookies.get('token');
      
      const response = await axios.get(`${API_BASE}/elections/completed/${electionId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 // Reduced to 15 second timeout
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch election results');
      }

      const { election, positions } = response.data.data;
      
      // Optimize data processing
      const groupedPositions = positions.map(position => {
        const sortedCandidates = [...position.candidates].sort((a, b) => b.vote_count - a.vote_count);
        return {
          ...position,
          sortedCandidates,
          winner: sortedCandidates[0] || null
        };
      });

      // Simplified results for pagination (only if needed)
      const results = positions.flatMap(position => 
        position.candidates.map(candidate => ({
          position: position.position_name,
          candidate_id: candidate.id,
          candidate_name: `${candidate.first_name} ${candidate.last_name}`,
          image_url: candidate.image_url,
          partylist: candidate.partylist_name || '-',
          vote_count: candidate.vote_count,
          vote_percentage: candidate.vote_percentage || 0,
          is_winner: candidate.is_winner
        }))
      );

      setData(prev => ({
        ...prev,
        selectedElection: election,
        positions: results,
        groupedPositions: groupedPositions,
        pagination: {
          ...prev.pagination,
          total: results.length,
          total_pages: Math.ceil(results.length / prev.pagination.limit)
        }
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching election results:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch election results');
      }
    } finally {
      setResultsLoading(false);
    }
  }, []);

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
    if (!selectedElectionId || !data.selectedElection) return;

    try {
      // Prepare data for PDF generation using the grouped positions structure
      const reportData = {
        title: "Election Result Report",
        description: "Comprehensive election results including candidates, vote counts, and winners",
        election_details: {
          title: data.selectedElection.title,
          type: data.selectedElection.election_type || 'General Election',
          status: data.selectedElection.status,
          total_votes: data.selectedElection.total_votes || 0,
          total_eligible_voters: data.selectedElection.total_eligible_voters || 0,
          voter_turnout_percentage: data.selectedElection.voter_turnout_percentage || 0,
          date: new Date(data.selectedElection.date_to).toLocaleDateString(),
          date_from: new Date(data.selectedElection.date_from).toLocaleDateString(),
          date_to: new Date(data.selectedElection.date_to).toLocaleDateString()
        },
        positions: data.groupedPositions.map(position => ({
          position_name: position.position_name,
          max_choices: position.max_choices || 1,
          total_votes: position.total_votes || 0,
          candidates: position.sortedCandidates.map((candidate, index) => ({
            rank: index + 1,
            name: formatNameSimple(candidate.last_name, candidate.first_name, position.position_name),
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            party: candidate.partylist_name || 'Independent',
            vote_count: candidate.vote_count || 0,
            vote_percentage: candidate.vote_percentage || 0,
            status: index === 0 ? 'Winner' : index === 1 ? '2nd Place' : index === 2 ? '3rd Place' : `${index + 1}th Place`,
            is_winner: index === 0
          }))
        })),
        summary: {
          total_positions: data.groupedPositions.length,
          total_candidates: data.groupedPositions.reduce((total, pos) => total + pos.sortedCandidates.length, 0),
          total_votes_cast: data.selectedElection.total_votes || 0,
          voter_turnout: data.selectedElection.voter_turnout_percentage || 0
        }
      };

      console.log('Generating PDF with data:', reportData);
      await generatePdfReport(13, reportData); // 13 is the report ID for Election Result Report
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to generate PDF report. Please try again.');
    }
  };

  // Calculate paginated results
  const getPaginatedResults = () => {
    const startIndex = (currentPage - 1) * data.pagination.limit;
    const endIndex = startIndex + data.pagination.limit;
    return data.positions.slice(startIndex, endIndex);
  };

  if (electionsLoading && !data.elections.length) return (
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

      {selectedElectionId && resultsLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01579B]"></div>
        </div>
      ) : selectedElectionId && error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      ) : selectedElectionId && data.groupedPositions.length > 0 ? (
        <div className="space-y-8">
          {data.groupedPositions.map((position, positionIndex) => (
            <div key={position.position_id} className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-black mb-6 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-[#01579B]" />
                {position.position_name}
              </h3>
              
              {/* Winner Banner */}
              {position.winner && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-blue-600" />
                    Winner for {position.position_name}
                  </h4>
                  <div className="flex items-center">
                    <div className="relative w-20 h-24 mr-6">
                      {position.winner.image_url ? (
                        <Image
                          src={getImageUrl(position.winner.image_url)}
                          alt={`${position.winner.first_name} ${position.winner.last_name}`}
                          fill
                          sizes="80px"
                          className="object-cover rounded-lg border-2 border-blue-500"
                          onError={(e) => {
                            e.target.src = '/images/default-avatar.png';
                          }}
                        />
                      ) : (
                        <div className="w-20 h-24 rounded-lg bg-blue-200 flex items-center justify-center border-2 border-blue-500">
                          <User className="w-10 h-10 text-blue-600" />
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-black text-xl mb-2">
                        {formatNameSimple(position.winner.last_name, position.winner.first_name, position.position_name)}
                      </h4>
                      {position.winner.partylist_name && position.winner.partylist_name !== '-' && (
                        <div className="mb-3">
                          <span className="font-medium text-sm text-black">Partylist:</span>
                          <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                            {position.winner.partylist_name}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-sm text-black">Votes:</span>
                          <span className="ml-2 text-black font-bold text-lg">
                            {Number(position.winner.vote_count || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-sm text-black">Percentage:</span>
                          <span className="ml-2 text-blue-600 font-bold text-lg">
                            {position.winner.vote_percentage?.toFixed(2) || '0.00'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* All Candidates Results */}
              <div className="space-y-3">
                <h5 className="text-lg font-medium text-black mb-4">All Candidates Results</h5>
                {position.sortedCandidates.map((candidate, candidateIndex) => (
                  <div 
                    key={candidate.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      candidateIndex === 0 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#01579B] text-white font-bold text-sm mr-4">
                        {candidateIndex + 1}
                      </div>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                        <Image
                          src={getImageUrl(candidate.image_url)}
                          alt={`${candidate.first_name} ${candidate.last_name}`}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            e.target.src = '/images/default-avatar.png';
                          }}
                        />
                      </div>
                      <div>
                        <h6 className="font-semibold text-black">
                          {formatNameSimple(candidate.last_name, candidate.first_name, position.position_name)}
                        </h6>
                        {candidate.partylist_name && candidate.partylist_name !== '-' && (
                          <p className="text-sm text-gray-600">{candidate.partylist_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Votes</p>
                        <p className="font-bold text-lg text-black">
                          {Number(candidate.vote_count || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Percentage</p>
                        <p className="font-bold text-lg text-[#01579B]">
                          {candidate.vote_percentage?.toFixed(2) || '0.00'}%
                        </p>
                      </div>
                      <div className="flex items-center">
                        {candidateIndex === 0 ? (
                          <span className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <Trophy className="w-4 h-4 mr-1" />
                            Winner
                          </span>
                        ) : candidateIndex === 1 ? (
                          <span className="flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                            <Medal className="w-4 h-4 mr-1" />
                            2nd Place
                          </span>
                        ) : candidateIndex === 2 ? (
                          <span className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            <Medal className="w-4 h-4 mr-1" />
                            3rd Place
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            {candidateIndex + 1}th Place
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : selectedElectionId ? (
        <div className="text-center py-8 text-gray-500">
          No results available for this election
        </div>
      ) : null}

      {/* Summary Stats */}
      {selectedElectionId && data.groupedPositions.length > 0 && (
        <div className="mt-8 bg-white/50 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4">Election Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#01579B]">{data.groupedPositions.length}</div>
              <div className="text-sm text-gray-600">Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#01579B]">
                {data.groupedPositions.reduce((total, pos) => total + pos.sortedCandidates.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Candidates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#01579B]">
                {data.selectedElection?.total_votes || 0}
              </div>
              <div className="text-sm text-gray-600">Total Votes Cast</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectionResultReport; 