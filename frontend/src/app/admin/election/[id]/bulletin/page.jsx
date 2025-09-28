"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Users, User, List, ArrowLeft, Award, Trophy, Medal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '/default-candidate.png';
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  if (imageUrl.startsWith('/uploads')) {
    return `${BASE_URL}${imageUrl}`;
  }

  if (!imageUrl.startsWith('/')) {
    return `${BASE_URL}/uploads/candidates/${imageUrl}`;
  }

  return `${BASE_URL}${imageUrl}`;
};

function formatNameSimple(lastName, firstName, fallback) {
  const cap = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
  if ((!lastName && !firstName) && fallback) {
    const words = fallback.trim().split(/\s+/);
    if (words.length === 1) {
      return cap(words[0]);
    } else {
      const last = cap(words[words.length - 1]);
      const first = words.slice(0, -1).map(cap).join(' ');
      return `${last}, ${first}`;
    }
  }
  if (!lastName && !firstName) return 'No Name';
  return `${cap(lastName)}, ${cap(firstName)}`;
}

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
  const [candidateImages, setCandidateImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  
  // Pagination states for voters
  const [currentVoterPage, setCurrentVoterPage] = useState(1);
  const [votersPerPage] = useState(40);
  
  // Pagination states for candidates
  const [currentCandidatePage, setCurrentCandidatePage] = useState(1);
  const [candidatesPerPage] = useState(40);

  const handleImageError = (candidateId) => {
    if (!imageErrors[candidateId]) {
      setImageErrors(prev => ({
        ...prev,
        [candidateId]: true
      }));
    }
  };

  const getTop3Winners = (candidates) => {
    if (!candidates || candidates.length === 0) return [];
    
    const sortedCandidates = [...candidates].sort((a, b) => 
      (b.vote_count || 0) - (a.vote_count || 0)
    );
    
    return sortedCandidates.slice(0, 3);
  };

  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Award className="w-6 h-6 text-orange-500" />;
      default: return null;
    }
  };

  const getRankLabel = (index) => {
    switch(index) {
      case 0: return '1st Place';
      case 1: return '2nd Place';
      case 2: return '3rd Place';
      default: return '';
    }
  };

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
      
      // Load candidate images
      const imageCache = {};
      if (data.election?.positions) {
        data.election.positions.forEach(position => {
          position.candidates?.forEach(candidate => {
            if (candidate.image_url) {
              const processedUrl = getImageUrl(candidate.image_url);
              imageCache[candidate.id] = processedUrl;
            }
          });
        });
      }
      setCandidateImages(imageCache);
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
      voters: (candidate.voters || []).filter(voter => 
        voter.verificationCode.toLowerCase().includes(candidateSearchTerm.toLowerCase()) ||
        `${candidate.firstName || candidate.first_name} ${candidate.lastName || candidate.last_name}`.toLowerCase().includes(candidateSearchTerm.toLowerCase())
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

      <h1 className="text-2xl font-bold mb-2 text-black">Public Bulletin</h1>
      <p className="text-gray-600 mb-6 text-black">Election: {election.title}</p>

      {/* Sub-tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab('winners')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSubTab === 'winners'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Top 3 Winners
          </button>
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
      {activeSubTab === 'winners' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-black mb-2">{election.title}</h2>
            <p className="text-lg text-gray-600 mb-4">{election.description}</p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>Status: <span className={`font-medium ${election.status === 'completed' ? 'text-green-600' : election.status === 'ongoing' ? 'text-blue-600' : 'text-yellow-600'}`}>{election.status.toUpperCase()}</span></span>
              <span>•</span>
              <span>Total Voters: {election.voter_count || 0}</span>
              <span>•</span>
              <span>Votes Cast: {election.vote_count || 0}</span>
            </div>
          </div>

          {election.positions && election.positions.length > 0 ? (
            <div className="space-y-8">
              {election.positions.map((position) => {
                const top3Winners = getTop3Winners(position.candidates || []);
                
                return (
                  <div key={position.id} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-2xl font-bold text-black mb-6 text-center">{position.name}</h3>
                    
                    {top3Winners.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {top3Winners.map((winner, index) => (
                            <div 
                              key={winner.id} 
                              className={`relative bg-white rounded-xl p-6 shadow-lg border-2 ${
                                index === 0 ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-yellow-100' :
                                index === 1 ? 'border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100' :
                                'border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100'
                              }`}
                            >
                              {/* Rank Badge */}
                              <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-500' :
                                'bg-orange-500'
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Winner Image */}
                              <div className="flex justify-center mb-4">
                                <div className="relative w-40 h-48">
                                  {winner.image_url && !imageErrors[winner.id] ? (
                                    <Image
                                      src={candidateImages[winner.id] || getImageUrl(winner.image_url)}
                                      alt={`${winner.first_name} ${winner.last_name}`}
                                      fill
                                      sizes="160px"
                                      className="object-cover rounded-lg shadow-md"
                                      onError={() => handleImageError(winner.id)}
                                    />
                                  ) : (
                                    <div className="w-40 h-48 rounded-lg bg-gray-200 flex items-center justify-center shadow-md">
                                      <User className="w-20 h-20 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Winner Details */}
                              <div className="text-center">
                                <h4 className="text-xl font-bold text-black mb-2">
                                  {formatNameSimple(winner.last_name, winner.first_name, winner.name)}
                                </h4>
                                
                                {winner.party && (
                                  <div className="mb-3">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                      {winner.party}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="mb-3">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {Number(winner.vote_count || 0).toLocaleString()} votes
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {election.voter_count ? ((winner.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}% of total votes
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
                                  {getRankIcon(index)}
                                  <span>{getRankLabel(index)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Other Candidates */}
                        {position.candidates && position.candidates.length > 3 && (
                          <div className="mt-8">
                            <h4 className="text-xl font-bold text-black mb-6 text-center">Other Candidates</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {position.candidates.slice(3).map((candidate) => (
                                <div 
                                  key={candidate.id} 
                                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                                >
                                  <div className="relative w-24 h-32 mb-3">
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes="96px"
                                        className="object-cover rounded-lg"
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className="w-24 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <User className="w-12 h-12 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-center w-full">
                                    <h4 className="font-medium text-black text-sm mb-1 line-clamp-2">
                                      {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                    </h4>
                                    {candidate.party && (
                                      <div className="text-xs text-black mb-1 px-2 py-1 bg-white rounded-full">
                                        {candidate.party}
                                      </div>
                                    )}
                                    <div className="text-sm text-black font-semibold">
                                      {Number(candidate.vote_count || 0).toLocaleString()} votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No votes cast for this position yet</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-20 h-20 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Positions Available</h3>
              <p className="text-gray-500">This election doesn't have any positions yet.</p>
            </div>
          )}
        </div>
      ) : activeSubTab === 'all-voters' ? (
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {currentVoters.map((voter, index) => (
                <div key={voter.voteToken} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-blue-100 text-blue-800 font-mono">
                        {voter.verificationCode}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(voter.voteDate).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
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
                        {candidate.firstName || candidate.first_name} {candidate.lastName || candidate.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Position: {candidate.positionTitle}
                      </p>
                      {(candidate.partylistName || candidate.party) && (
                        <p className="text-sm text-gray-500">
                          Party: {candidate.partylistName || candidate.party}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                      {candidate.voteCount || candidate.vote_count || 0} votes
                    </span>
                  </div>

                  {(!candidate.voters || candidate.voters.length === 0) ? (
                    <p className="text-gray-500 text-sm">No votes yet</p>
                  ) : (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Voter Verification Codes ({candidate.voters.length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {candidate.voters.map((voter, voterIndex) => (
                          <div key={voterIndex} className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                            <div className="flex flex-col space-y-1">
                              <span className="font-mono text-lg bg-blue-100 text-blue-800 px-4 py-2 rounded text-center">
                                {voter.verificationCode}
                              </span>
                              <span className="text-sm text-gray-500 text-center">
                                {new Date(voter.voteDate || voter.vote_date).toLocaleDateString()}
                              </span>
                            </div>
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
