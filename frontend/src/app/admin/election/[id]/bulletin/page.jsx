"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Users, User, List, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth(url) {
  const token = Cookies.get('token');
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied: You do not have permission to view this election');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `Request failed with status ${response.status}`);
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      const text = await response.text();
      console.warn('Expected JSON response but got text:', text);
      return { success: true, message: text };
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

export default function ElectionBulletinPage() {
  const router = useRouter();
  const params = useParams();
  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('all-voters');
  const [voterCodes, setVoterCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateVotes, setCandidateVotes] = useState([]);
  const [loadingCandidateVotes, setLoadingCandidateVotes] = useState(false);
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  
  // Pagination states for voters
  const [currentVoterPage, setCurrentVoterPage] = useState(1);
  const [votersPerPage] = useState(50);
  
  // Pagination states for candidates
  const [currentCandidatePage, setCurrentCandidatePage] = useState(1);
  const [candidatesPerPage] = useState(50);

  const loadVoterCodes = async () => {
    try {
      setLoadingCodes(true);
      const data = await fetchWithAuth(`/elections/${params.id}/voter-codes`);
      setVoterCodes(data.data.voterCodes || []);
    } catch (err) {
      console.error('Error loading voter codes:', err);
      toast.error(`Error loading voter codes: ${err.message}`);
    } finally {
      setLoadingCodes(false);
    }
  };

  const loadCandidateVotes = async () => {
    try {
      setLoadingCandidateVotes(true);
      const data = await fetchWithAuth(`/elections/${params.id}/votes-per-candidate`);
      setCandidateVotes(data.data.positions || []);
    } catch (err) {
      console.error('Error loading candidate votes:', err);
      toast.error(`Error loading candidate votes: ${err.message}`);
    } finally {
      setLoadingCandidateVotes(false);
    }
  };

  useEffect(() => {
    const loadElectionDetails = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWithAuth(`/elections/${params.id}/details`);
        setElection(data.election);
      } catch (err) {
        console.error('Error loading election details:', err);
        setError(err.message);
        toast.error(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      loadElectionDetails();
    }
  }, [params.id]);

  useEffect(() => {
    if (activeSubTab === 'all-voters' && params.id) {
      setCurrentVoterPage(1); // Reset to first page when switching tabs
      loadVoterCodes();
    } else if (activeSubTab === 'per-candidate' && params.id) {
      setCurrentCandidatePage(1); // Reset to first page when switching tabs
      loadCandidateVotes();
    }
  }, [activeSubTab, params.id]);

  // Reset pagination when search terms change
  useEffect(() => {
    setCurrentVoterPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentCandidatePage(1);
  }, [candidateSearchTerm]);

  // Pagination logic for voters
  const filteredVoters = voterCodes.filter(voter => 
    voter.verificationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalVoterPages = Math.ceil(filteredVoters.length / votersPerPage);
  const startVoterIndex = (currentVoterPage - 1) * votersPerPage;
  const endVoterIndex = startVoterIndex + votersPerPage;
  const currentVoters = filteredVoters.slice(startVoterIndex, endVoterIndex);

  // Pagination logic for candidates
  const allCandidates = candidateVotes.flatMap(position => 
    position.candidates.map(candidate => ({
      ...candidate,
      positionTitle: position.title,
      positionId: position.id,
      voters: candidate.voters.filter(voter => 
        voter.verificationCode.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(candidateSearchTerm.toLowerCase())
      )
    }))
  );
  
  const totalCandidatePages = Math.ceil(allCandidates.length / candidatesPerPage);
  const startCandidateIndex = (currentCandidatePage - 1) * candidatesPerPage;
  const endCandidateIndex = startCandidateIndex + candidatesPerPage;
  const currentCandidates = allCandidates.slice(startCandidateIndex, endCandidateIndex);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-black">
          Election not found
        </div>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            href={`/admin/election/${params.id}`}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Election
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
            election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {election.status.toUpperCase()}
          </span>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-black">Election Bulletin</h1>
      <p className="text-gray-600 mb-6 text-black">Election: {election.title}</p>

      {/* Sub-tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab('all-voters')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'all-voters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            All Voters
          </button>
          <button
            onClick={() => setActiveSubTab('per-candidate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'per-candidate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Per Candidate
          </button>
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'all-voters' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black flex items-center">
              <List className="w-5 h-5 mr-2" />
              Voter Verification Codes
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadVoterCodes}
                disabled={loadingCodes}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCodes ? 'Refreshing...' : 'Refresh'}
              </button>
              <div className="text-sm text-gray-500">
                Total Voters: {filteredVoters.length} (Page {currentVoterPage} of {totalVoterPages})
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by verification code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
            />
          </div>

          {loadingCodes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredVoters.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Voters Yet</h3>
              <p className="text-gray-500">
                No students have voted in this election yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vote Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentVoters.map((voter, index) => (
                    <tr key={voter.voteToken} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 font-mono">
                          {voter.verificationCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(voter.voteDate).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Voters */}
          {filteredVoters.length > votersPerPage && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center text-sm text-black">
                Showing {startVoterIndex + 1} to {Math.min(endVoterIndex, filteredVoters.length)} of {filteredVoters.length} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentVoterPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentVoterPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black disabled:text-black"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-black">
                  Page {currentVoterPage} of {totalVoterPages}
                </span>
                <button
                  onClick={() => setCurrentVoterPage(prev => Math.min(prev + 1, totalVoterPages))}
                  disabled={currentVoterPage === totalVoterPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black disabled:text-black"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black flex items-center">
              <User className="w-5 h-5 mr-2" />
              Votes Per Candidate
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadCandidateVotes}
                disabled={loadingCandidateVotes}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCandidateVotes ? 'Refreshing...' : 'Refresh'}
              </button>
              <div className="text-sm text-gray-500">
                {allCandidates.length} Candidates (Page {currentCandidatePage} of {totalCandidatePages})
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search"
              value={candidateSearchTerm}
              onChange={(e) => setCandidateSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
            />
          </div>

          {loadingCandidateVotes ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : allCandidates.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Positions Found</h3>
              <p className="text-gray-500">
                No positions or candidates found for this election.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentCandidates.map((candidate, index) => (
                <div key={`${candidate.positionId}-${candidate.id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {candidate.firstName} {candidate.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Position: {candidate.positionTitle}
                      </p>
                      {candidate.partylistName && (
                        <p className="text-sm text-gray-500">
                          Party: {candidate.partylistName}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                      {candidate.voteCount} votes
                    </span>
                  </div>

                  {candidate.voters.length === 0 ? (
                    <p className="text-gray-500 text-sm">No votes yet</p>
                  ) : (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Voter Verification Codes ({candidate.voters.length})
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {candidate.voters.map((voter, voterIndex) => (
                          <div key={voterIndex} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                            <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {voter.verificationCode}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(voter.voteDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination for Candidates */}
          {allCandidates.length > candidatesPerPage && (
            <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center text-sm text-black">
                Showing {startCandidateIndex + 1} to {Math.min(endCandidateIndex, allCandidates.length)} of {allCandidates.length} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentCandidatePage(prev => Math.max(prev - 1, 1))}
                  disabled={currentCandidatePage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black disabled:text-black"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-black">
                  Page {currentCandidatePage} of {totalCandidatePages}
                </span>
                <button
                  onClick={() => setCurrentCandidatePage(prev => Math.min(prev + 1, totalCandidatePages))}
                  disabled={currentCandidatePage === totalCandidatePages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black disabled:text-black"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
