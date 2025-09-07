"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, User, Eye, Edit, Lock, Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { use } from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '/default-candidate.png';
  
  // If it's already a full URL, use it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // If it's a relative path starting with /uploads, make it absolute
  if (imageUrl.startsWith('/uploads')) {
    return `${BASE_URL}${imageUrl}`;
  }

  // If it's just a filename, construct the full path
  if (!imageUrl.startsWith('/')) {
    return `${BASE_URL}/uploads/candidates/${imageUrl}`;
  }

  // For any other relative path, prepend base URL
  return `${BASE_URL}${imageUrl}`;
};

export default function VotePage({ params }) {
  const resolvedParams = use(params);
  const { id: electionId } = resolvedParams;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [imageCache, setImageCache] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [encryptionStatus, setEncryptionStatus] = useState('idle'); 

  useEffect(() => {
    const fetchBallot = async () => {
      try {
        setLoading(true);
        const token = Cookies.get('token');
        
        if (!token) {
          setError('Authentication required. Please log in again.');
          return;
        }
        
        const response = await axios.get(`${API_BASE}/elections/${electionId}/student-ballot`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        
        setElection(response.data.election);
        setPositions(response.data.positions);

        const initialSelections = {};
        response.data.positions.forEach(position => {
          initialSelections[position.position_id] = [];
        });
        setSelectedCandidates(initialSelections);

        const newImageCache = {};
        
        response.data.positions.forEach(position => {
          position.candidates.forEach(candidate => {
            if (candidate.image_url) {
              // Add cache busting to prevent stale images
              const processedUrl = getImageUrl(candidate.image_url);
              const urlWithTimestamp = `${processedUrl}?timestamp=${new Date().getTime()}`;
              newImageCache[candidate.id] = urlWithTimestamp;
            }
          });
        });
        
        setImageCache(newImageCache);
        
      } catch (err) {
        console.error('Error fetching ballot:', err);
        setError(err.response?.data?.message || 'Failed to load ballot. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBallot();
  }, [electionId]);

  const handleCandidateSelect = (positionId, candidateId, maxChoices) => {
    setSelectedCandidates(prev => {
      const currentSelections = [...prev[positionId]];

      const index = currentSelections.indexOf(candidateId);
      
      if (index === -1) {

        if (currentSelections.length < maxChoices) {
          return {
            ...prev,
            [positionId]: [...currentSelections, candidateId]
          };
        }
      } else {

        currentSelections.splice(index, 1);
        return {
          ...prev,
          [positionId]: currentSelections
        };
      }
      
      return prev;
    });

    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[positionId];
      return newErrors;
    });
  };

  const validateVotes = () => {
    const errors = {};
    let isValid = true;
    
    positions.forEach(position => {
      const selectedCount = selectedCandidates[position.position_id]?.length || 0;
      
      if (selectedCount === 0) {
        errors[position.position_id] = `Please select at least one candidate for ${position.position_name}`;
        isValid = false;
      } else if (selectedCount > position.max_choices) {
        errors[position.position_id] = `You can only select up to ${position.max_choices} candidates for ${position.position_name}`;
        isValid = false;
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  const handlePreviewVotes = () => {
    if (!validateVotes()) {
      return;
    }
    setShowPreview(true);
  };

  const handleEditVotes = () => {
    setShowPreview(false);
  };

  const handleSubmitVote = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const token = Cookies.get('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const missingPositions = positions.filter(position => 
        !selectedCandidates[position.position_id] || selectedCandidates[position.position_id].length === 0
      );
      
      if (missingPositions.length > 0) {
        const positionNames = missingPositions.map(p => p.position_name).join(', ');
        throw new Error(`Please select candidates for: ${positionNames}`);
      }

      const votes = positions.map(position => {
        const candidateIds = selectedCandidates[position.position_id] || [];
        return {
          positionId: parseInt(position.position_id),
          candidateIds: candidateIds.map(id => parseInt(id))
        };
      }).filter(vote => vote.candidateIds.length > 0);

      setEncryptionStatus('encrypting');

      await new Promise(resolve => setTimeout(resolve, 1500));

      setEncryptionStatus('encrypted');

      console.log('Submitting votes:', JSON.stringify(votes, null, 2));
      console.log('Election ID:', electionId);

      const response = await axios.post(`${API_BASE}/elections/${electionId}/vote`, 
        { votes }, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      console.log('Vote submission response:', response.data);

      if (response.data.success) {

        if (response.data.voteToken) {
          console.log('Saving vote token to localStorage:', response.data.voteToken);
          localStorage.setItem(`vote_token_${electionId}`, response.data.voteToken);
        }

        toast.success('Vote submitted successfully! Redirecting to receipt...');

        router.push(`/student/elections/${electionId}/receipt`);
      } else {
        setEncryptionStatus('error');
        throw new Error(response.data.message || "Failed to submit vote");
      }
    } catch (error) {
      setEncryptionStatus('error');
      console.error('Error submitting vote:', error);

      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);

        if (error.response.data && error.response.data.alreadyVoted) {
          toast.info('You have already voted in this election. Redirecting to your receipt...');

          if (error.response.data && error.response.data.voteToken) {
            console.log('Saving vote token from error response:', error.response.data.voteToken);
            localStorage.setItem(`vote_token_${electionId}`, error.response.data.voteToken);
          } else {

            fetchExistingVoteToken(electionId, token);
          }

          router.push(`/student/elections/${electionId}/receipt`);
          return;
        }

        if (error.response.data && error.response.data.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error(`Failed to submit vote. Server returned status ${error.response.status}`);
        }
      } else if (error.request) {
        console.error('Error request:', error.request);
        toast.error('Failed to receive response from server. Please check your network connection.');
      } else {
        console.error('Error message:', error.message);
        toast.error(error.message || 'Failed to submit vote. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchExistingVoteToken = async (electionId, token) => {
    try {

      const response = await axios.get(`${API_BASE}/elections/${electionId}/vote-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data && response.data.voteToken) {
        console.log('Fetched existing vote token:', response.data.voteToken);
        localStorage.setItem(`vote_token_${electionId}`, response.data.voteToken);
      }
    } catch (error) {
      console.error('Error fetching existing vote token:', error);
    }
  };

  const handleImageError = (candidateId, event) => {
    console.log("Error loading candidate image:", event.target.src);
    
    // Try fallback URL if not already tried
    if (!imageErrors[candidateId]) {
      const candidate = getCandidateById(candidateId);
      if (candidate && candidate.image_url) {
        // Try alternative URL paths
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const fallbackUrl = `${baseUrl}/api/uploads/candidates/${candidate.image_url}`;
        
        // Update the image source to try the fallback
        event.target.src = fallbackUrl;
        
        // Mark as error only if this was the fallback attempt
        if (event.target.src.includes('/api/uploads/')) {
          setImageErrors(prev => ({
            ...prev,
            [candidateId]: true
          }));
        }
      } else {
        setImageErrors(prev => ({
          ...prev,
          [candidateId]: true
        }));
      }
    }
  };

  const getCandidateById = (candidateId) => {
    for (const position of positions) {
      const candidate = position.candidates.find(c => c.id === candidateId);
      if (candidate) return candidate;
    }
    return null;
  };

  const calculateVotingProgress = () => {
    if (!positions || positions.length === 0) return 0;
    
    const totalPositions = positions.length;
    const filledPositions = Object.keys(selectedCandidates).filter(
      posId => selectedCandidates[posId].length > 0
    ).length;
    
    return Math.round((filledPositions / totalPositions) * 100);
  };

  const getNextIncompletePosition = () => {
    if (!positions) return null;
    
    return positions.find(position => 
      !selectedCandidates[position.position_id] || 
      selectedCandidates[position.position_id].length === 0
    );
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `VOTE-${year}${month}${day}-${random}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => router.push('/student')} 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => router.push('/student')} 
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Dashboard
      </button>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{election?.title}</h1>
        <p className="text-gray-600 mb-4">{election?.description}</p>

        {!showPreview && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-black">Voting Progress</span>
              <span className="text-sm font-medium text-black">{calculateVotingProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${calculateVotingProgress()}%` }}
              ></div>
            </div>
            {calculateVotingProgress() < 100 && (
              <p className="text-sm text-black mt-2">
                {getNextIncompletePosition() 
                  ? `Next: Select candidates for ${getNextIncompletePosition().position_name}`
                  : 'Complete all positions to proceed'}
              </p>
            )}
          </div>
        )}
        
        
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Select or Vote Candidates per position
              </p>
            </div>
          </div>
        </div>

        {!showPreview ? (
          <>
            {positions.map((position) => (
              <div key={position.position_id} className="mb-8 border rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {position.position_name}
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (Select up to {position.max_choices} {position.max_choices === 1 ? 'candidate' : 'candidates'})
                  </span>
                </h2>
                
                {validationErrors[position.position_id] && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
                    {validationErrors[position.position_id]}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {position.candidates.map((candidate) => (
                    <div 
                      key={candidate.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedCandidates[position.position_id]?.includes(candidate.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => handleCandidateSelect(position.position_id, candidate.id, position.max_choices)}
                    >
                      <div className="flex flex-col">
                        {/* Candidate Image */}
                        <div className="mb-3 w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mx-auto">
                          {candidate.image_url && !imageErrors[candidate.id] ? (
                            <img 
                              src={imageCache[candidate.id] || getImageUrl(candidate.image_url)}
                              alt={`${formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}`}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(candidate.id, e)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Selection Indicator */}
                        <div className="flex items-center mb-2">
                          <div className="flex-shrink-0 mr-2">
                            {selectedCandidates[position.position_id]?.includes(candidate.id) ? (
                              <CheckCircle className="h-5 w-5 text-blue-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                            )}
                          </div>
                          <span className="text-sm text-black">
                            {selectedCandidates[position.position_id]?.includes(candidate.id) ? 'Selected' : 'Click to select'}
                          </span>
                        </div>
                        
                        {/* Candidate Details */}
                        <div>
                          <h3 className="font-medium text-gray-800 text-lg">Full Name: {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}</h3>
                          {candidate.party && (
                            <div className="mt-1">
                              <span className="text-md font-medium text-black ">Partylist:</span>
                              <p className="text-sm text-black">{candidate.party}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handlePreviewVotes}
                className="px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 flex items-center"
              >
                <Eye className="w-5 h-5 mr-2" />
                Preview Votes
              </button>
            </div>
          </>
        ) : (
          <div className="vote-preview">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-green-800">Review Your Votes</h3>
                  <p className="text-sm text-green-700">
                    Please review your selections carefully before submitting.
                  </p>
                </div>
              </div>
            </div>

            {/* Add summary section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Vote Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Positions: <span className="font-medium text-black">{positions.length}</span></p>
                  <p className="text-sm text-gray-600">Positions Filled: <span className="font-medium text-black">{Object.keys(selectedCandidates).filter(posId => selectedCandidates[posId].length > 0).length}</span></p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Selections: <span className="font-medium text-black">{Object.values(selectedCandidates).reduce((sum, arr) => sum + arr.length, 0)}</span></p>
                  <p className="text-sm text-gray-600">Election: <span className="font-medium text-black">{election?.title || 'Student Election'}</span></p>
                </div>
              </div>
            </div>

            {positions.map((position) => (
              <div key={position.position_id} className="mb-8 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {position.position_name}
                  </h2>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 mr-2">
                      {selectedCandidates[position.position_id]?.length || 0} of {position.max_choices} selected
                    </span>
                    <div className={`w-3 h-3 rounded-full ${selectedCandidates[position.position_id]?.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                </div>
                
                {selectedCandidates[position.position_id]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCandidates[position.position_id].map(candidateId => {
                      const candidate = getCandidateById(candidateId);
                      if (!candidate) return null;
                      
                      return (
                        <div key={candidate.id} className="border border-green-300 rounded-lg p-4 bg-green-50 hover:shadow-md transition-shadow">
                          <div className="flex flex-col">
                            {/* Candidate Image */}
                            <div className="mb-3 w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mx-auto">
                              {candidate.image_url && !imageErrors[candidate.id] ? (
                                <img 
                                  src={imageCache[candidate.id] || getImageUrl(candidate.image_url)}
                                  alt={`${formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => handleImageError(candidate.id, e)}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Candidate Details */}
                            <div>
                              <h3 className="font-medium text-gray-800 text-lg">{formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}</h3>
                              {candidate.party && (
                                <div className="mt-1">
                                  <span className="text-xs font-medium text-gray-500">Party:</span>
                                  <p className="text-sm text-gray-600">{candidate.party}</p>
                                </div>
                              )}
                              {candidate.slogan && (
                                <div className="mt-1">
                                  <span className="text-xs font-medium text-gray-500">Slogan:</span>
                                  <p className="text-sm text-gray-600 italic">"{candidate.slogan}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-700">No candidates selected for this position</p>
                    <button 
                      onClick={handleEditVotes}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Go back and make a selection
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-6 flex justify-between">
              <button
                onClick={handleEditVotes}
                className="px-4 py-2 rounded-md text-white font-medium bg-gray-600 hover:bg-gray-700 flex items-center"
              >
                <Edit className="w-5 h-5 mr-2" />
                Edit Votes
              </button>
              
              <div className="flex items-center space-x-4">
                {!submissionConfirmed ? (
                  <button
                    onClick={() => setSubmissionConfirmed(true)}
                    className="px-4 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
                  >
                    Confirm and Submit
                  </button>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Final Confirmation</h3>
                    <p className="text-yellow-700 mb-4">
                      Are you sure you want to submit your votes? This action cannot be undone.
                    </p>
                    
                    {/* Add encryption status indicator */}
                    {encryptionStatus !== 'idle' && (
                      <div className={`mb-4 p-3 rounded-md flex items-center
                        ${encryptionStatus === 'encrypting' ? 'bg-blue-100 text-blue-800' : 
                          encryptionStatus === 'encrypted' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        <Lock className="h-5 w-5 mr-2" />
                        <span>
                          {encryptionStatus === 'encrypting' ? 'Encrypting your vote...' :
                           encryptionStatus === 'encrypted' ? 'Vote encrypted successfully!' :
                           'Encryption error. Please try again.'}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setSubmissionConfirmed(false)}
                        className="px-4 py-2 rounded-md text-white font-medium bg-gray-600 hover:bg-gray-700"
                        disabled={submitting || encryptionStatus === 'encrypting'}
                      >
                        No, Go Back
                      </button>
                      <button
                        onClick={handleSubmitVote}
                        disabled={submitting || encryptionStatus === 'encrypting'}
                        className={`px-4 py-2 rounded-md text-white font-medium flex items-center ${
                          submitting || encryptionStatus === 'encrypting'
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {(submitting || encryptionStatus === 'encrypting') ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {encryptionStatus === 'encrypting' ? 'Encrypting...' : 'Submitting...'}
                          </>
                        ) : (
                          <>
                            <Lock className="h-5 w-5 mr-2" />
                            Yes, Submit My Votes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add an encryption explanation section at the bottom 
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Lock className="h-5 w-5 mr-2 text-blue-600" />
          How Your Vote Is Protected
        </h2>
        
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-800 mb-2">End-to-End Encryption</h3>
            <p className="text-gray-600 text-sm">
              Your vote is encrypted on this device before being sent to our servers. This means
              that your voting choices are never transmitted over the internet in plain text.
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-800 mb-2">Anonymous Storage</h3>
            <p className="text-gray-600 text-sm">
              When stored in our database, your vote is separated from your identity using advanced
              cryptographic techniques. Even system administrators cannot determine who you voted for.
            </p>
          </div>
          
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-800 mb-2">Verifiable Receipts</h3>
            <p className="text-gray-600 text-sm">
              After voting, you'll receive a unique receipt token. This allows you to verify that your
              vote was counted correctly without revealing your specific choices to others.
            </p>
          </div>
        </div>
      </div>
      */}
    </div>
  );
}