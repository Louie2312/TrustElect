"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BASE_URL } from '@/config';
import Cookies from 'js-cookie';
import { 
  Save, AlertCircle, CheckCircle, Plus, Edit, Trash2, ArrowLeft,
  User, X, Upload, ImageIcon, UserIcon, XCircle
} from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import CandidateFormModal from './components/CandidateFormModal';
import PositionItem from './components/PositionItem';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = Cookies.get('token');
  const apiUrl = BASE_URL || 'http://localhost:5000';

  const normalizedEndpoint = endpoint.startsWith('/api') 
    ? endpoint 
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  console.log(`Making API request to: ${apiUrl}${normalizedEndpoint}`);
  
  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(`${apiUrl}${normalizedEndpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    const responseClone = response.clone();

    if (!response.ok) {
   
      try {
        const errorData = await response.json();

        if (errorData.message && errorData.message.includes('No ballot found')) {
          return null;
        }
        
        throw new Error(errorData.message || 'Request failed');
      } catch (e) {

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          if (response.status === 404) {

            return null;
          }
          throw new Error('Server returned an HTML error page. Please try again later.');
        }

        const errorText = await responseClone.text();
        if (errorText) {

          if (errorText.includes('{') && errorText.includes('}')) {

            const messageMatch = errorText.match(/"message"\s*:\s*"([^"]+)"/);
            if (messageMatch && messageMatch[1]) {

              if (messageMatch[1].includes('No ballot found')) {
                return null;
              }
              throw new Error(messageMatch[1]);
            }
          }
          
          throw new Error(errorText);
        }

        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    try {
      const jsonData = await response.json();
      console.log('API response:', jsonData);
      return jsonData;
    } catch (e) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of JSON. Please try again later.');
      }
      try {
        const textData = await responseClone.text();

        if (textData.includes('{') && textData.includes('}')) {
          try {
            return JSON.parse(textData);
          } catch (parseError) {
            console.error('Failed to parse text as JSON:', parseError);
          }
        }
        return textData;
      } catch (textError) {
        throw new Error('Invalid response from server');
      }
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

const fetchWithFormData = async (endpoint, formData, method = 'POST') => {
  const token = Cookies.get('token');
  const apiUrl = BASE_URL || 'http://localhost:5000';
  
  console.log(`Making form data API request to: ${apiUrl}${endpoint}`);
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
  
    const responseClone = response.clone();

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (jsonError) {

        try {
          const errorText = await responseClone.text();

          if (errorText.includes('{') && errorText.includes('}')) {
            const messageMatch = errorText.match(/"message"\s*:\s*"([^"]+)"/);
            if (messageMatch && messageMatch[1]) {
              errorMessage = messageMatch[1];
            } else {
              errorMessage = errorText;
            }
          } else if (errorText) {
            errorMessage = errorText;
          }
        } catch (textError) {
          console.error('Error extracting error details:', textError);
        }
      }
      
      throw new Error(errorMessage);
    }

    try {
      const jsonData = await response.json();
      console.log('FormData API response:', jsonData);
      return jsonData;
    } catch (jsonError) {
      const textResponse = await responseClone.text();
      console.error('Invalid JSON in FormData response:', textResponse);

      if (textResponse.includes('{') && textResponse.includes('}')) {
        try {
          return JSON.parse(textResponse);
        } catch (e) {
          throw new Error('Failed to parse response from server');
        }
      }
      
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('FormData API Error:', error);
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/uploads')) {
    return `${BASE_URL}${imagePath}`;
  }
  
  return `${BASE_URL}/uploads/${imagePath}`;
};

const extractBallotData = (response) => {
  console.log('Extracting ballot data from response:', response);
  
  if (!response) return null;

  if (response.positions && Array.isArray(response.positions)) {
    console.log('Found direct ballot with positions');
    return response;
  }

  if (response.ballot && typeof response.ballot === 'object') {
    console.log('Found ballot in response.ballot');
    return response.ballot;
  }

  if (response.data) {
    if (response.data.ballot && typeof response.data.ballot === 'object') {
      return response.data.ballot;
    }

    if (response.data.positions && Array.isArray(response.data.positions)) {
      return response.data;
    }

    if (response.data.id || (response.data.positions && Array.isArray(response.data.positions))) { 
      return response.data;
    }
  }
  if (response.election && response.election.ballot) {  
    return response.election.ballot;
  }
  

  if (Array.isArray(response) && response.length > 0) {
    return response[0];
  }
      return null;
};

const directGetBallotByElection = async (electionId) => {
 
  const endpoints = [
    `/api/elections/${electionId}/ballot`,
    `/api/ballots/election/${electionId}`,
    `/elections/${electionId}/ballot`,
    `/ballots/election/${electionId}`
  ];
  
  for (const endpoint of endpoints) {
    try { 
      const response = await fetchWithAuth(endpoint);    
      if (!response) continue;
      
      const ballotData = extractBallotData(response);
      if (ballotData) {
      
        return ballotData;
      }
  } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
  }
  }
  
  console.warn('All endpoints failed to return usable ballot data');
  return null;
};

const updateBallot = async (ballotId, data) => {
  const response = await fetchWithAuth(`/api/ballots/${ballotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update ballot');
  return response.json();
};

const createPosition = async (ballotId, data) => {
  const response = await fetchWithAuth(`/api/ballots/${ballotId}/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create position');
  return response.json();
};

const updatePosition = async (positionId, data) => {
  const response = await fetchWithAuth(`/api/ballots/positions/${positionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update position');
  return response.json();
};

const deletePosition = async (positionId) => {
  const response = await fetchWithAuth(`/api/ballots/positions/${positionId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete position');
  return response.json();
};

const createCandidate = async (positionId, data) => {
  let response;
  if (data instanceof FormData) {
    response = await fetchWithAuth(`/api/ballots/positions/${positionId}/candidates`, {
      method: 'POST',
      body: data
    });
  } else {
    response = await fetchWithAuth(`/api/ballots/positions/${positionId}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  if (!response.ok) throw new Error('Failed to create candidate');
  return response.json();
};

const updateCandidate = async (candidateId, data) => {
  let response;
  if (data instanceof FormData) {
    response = await fetchWithAuth(`/api/ballots/candidates/${candidateId}`, {
      method: 'PUT',
      body: data
    });
  } else {
    response = await fetchWithAuth(`/api/ballots/candidates/${candidateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  if (!response.ok) throw new Error('Failed to update candidate');
  return response.json();
};

const deleteCandidate = async (candidateId) => {
  const response = await fetchWithAuth(`/api/ballots/candidates/${candidateId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete candidate');
  return response.json();
};


const PreviewModal = ({ isOpen, onClose, ballot, onSave, election }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-black">Ballot Preview</h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-black">Election Details</h3>
          <p className="text-lg font-medium text-black">Title: {election.title}</p>
          <p className="text-black">
            {new Date(election.date_from).toLocaleDateString()} - {new Date(election.date_to).toLocaleDateString()}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-black">Ballot Description</h3>
          <p className="text-black">{ballot.description || "No description provided"}</p>
            </div>

        <div className="space-y-6">
          {ballot.positions.map(position => (
            <div key={position.id} className="border rounded-lg p-4">
              <h4 className="text-lg font-medium mb-3 text-black">
                {position.name} ({position.max_choices === 1 ? 'Single choice' : 'Multiple choice'})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {position.candidates.map(candidate => (
                  <div key={candidate.id} className="border rounded p-3 flex items-center">
                    <div className="w-32 h-32 rounded-lg overflow-hidden mr-4 bg-gray-100 flex-shrink-0">
                      {candidate.image_url ? (
                        <img
                          src={getImageUrl(candidate.image_url)}
                          alt={`${candidate.first_name} ${candidate.last_name}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Error loading image in preview: ${candidate.image_url}`);
                            e.target.src = '/default-candidate.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-black"><span className="text-black font-bold">Full Name:</span> {candidate.first_name} {candidate.last_name}</p>
                      {candidate.party && <p className="text-black"><span className="text-black font-bold">Partylist/Course:</span> {candidate.party}</p>}
                      {candidate.slogan && <p className="text-sm italic text-black"><span className="text-black font-bold">Slogan:</span> "{candidate.slogan}"</p>}
                      {candidate.platform && <p className="text-sm text-black"><span className="text-black font-bold">Description/Platform: </span> {candidate.platform}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
          >
            Back to Edit
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm & Save Ballot
          </button>
        </div>
      </div>
    </div>
  );
};

const processElectionDetailsData = (electionResponse) => {
  if (!electionResponse) return null;
  let ballotData = {
    id: electionResponse.ballot_id || (electionResponse.ballot ? electionResponse.ballot.id : null) || null,
    description: (electionResponse.ballot ? electionResponse.ballot.description : '') || '',
    positions: []
  };

  let positions = [];
  
  if (Array.isArray(electionResponse.positions)) {
    positions = electionResponse.positions;
  } else if (electionResponse.ballot && Array.isArray(electionResponse.ballot.positions)) {
    positions = electionResponse.ballot.positions;
  }

  if (positions.length > 0) {
    ballotData.positions = positions.map(position => {

      const processedPosition = {
        id: position.id || position.position_id,
        name: position.name || position.position_name || '',
        max_choices: parseInt(position.max_choices || 1, 10),
        candidates: []
      };

      if (position.candidates && Array.isArray(position.candidates)) {
        processedPosition.candidates = position.candidates.map(candidate => ({
          id: candidate.id,
          first_name: candidate.first_name || '',
          last_name: candidate.last_name || '',
          party: candidate.party || '',
          slogan: candidate.slogan || '',
          platform: candidate.platform || '',
          image_url: candidate.image_url || null
        }));
      }
      
      return processedPosition;
    });
  }

  if (!ballotData.id && ballotData.positions.length > 0) {
    ballotData.id = `temp_${Date.now()}`;
  }
  
  return ballotData;
};

const getEmptyPosition = () => ({
  id: `temp_${Date.now()}`,
  name: '',
  max_choices: 1,
  display_order: 0,
  candidates: []
});

const getEmptyCandidate = () => ({
  id: `temp_${Date.now()}`,
  first_name: '',
  last_name: '',
  party: '',
  slogan: '',
  platform: '',
  image_url: null
});

export default function BallotPage() {
  const router = useRouter();
  const params = useParams();
  const electionId = params.id;

  const [ballot, setBallot] = useState({
    id: null,
    election_id: electionId,
    description: "",
    positions: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [election, setElection] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    type: "",
    id: null,
    show: false
  });
  const [previewBallot, setPreviewBallot] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setApiError(null);
      
        let electionDetails = null;
        
        try {
          const electionResponse = await fetchWithAuth(`/elections/${electionId}/details`);
        
          if (electionResponse && electionResponse.election) {
            electionDetails = electionResponse.election;

          }
        } catch (error) {
          console.error('Error fetching from primary endpoint:', error);
        }

        if (!electionDetails) {
          try {
          
            const altElectionResponse = await fetchWithAuth(`/elections/${electionId}`);     
            if (altElectionResponse && altElectionResponse.election) {
              electionDetails = altElectionResponse.election;
            } else if (altElectionResponse) {
              electionDetails = altElectionResponse;
            }
          } catch (error) {
            console.error('Error fetching from alternate endpoint:', error);
          throw new Error('Failed to fetch election details');
          }
        }
        
        if (!electionDetails) {
          throw new Error('Failed to load election details');
        }
        
        setElection(electionDetails);
   
        if (electionDetails.ballot) {
          
        }
        
        if (electionDetails.status !== 'upcoming' && !electionDetails.needs_approval) {
          setApiError("Only upcoming or pending elections can be edited");
          setIsLoading(false);
          return;
        }

        const ballotData = await directGetBallotByElection(electionId);

        if (ballotData) {
       
          let positions = [];
          
          if (Array.isArray(ballotData.positions)) {
            positions = ballotData.positions;
          
          } else if (ballotData.ballot && Array.isArray(ballotData.ballot.positions)) {
            positions = ballotData.ballot.positions;
         
          } else if (electionDetails.ballot && Array.isArray(electionDetails.ballot.positions)) {
            positions = electionDetails.ballot.positions;
         
          } else if (electionDetails.positions && Array.isArray(electionDetails.positions)) {
            positions = electionDetails.positions;
          
          }
    
          if (positions.length === 0) {
            console.warn('No positions found in ballot data, checking for alternate formats');
          
            if (ballotData.id && !ballotData.positions && ballotData.ballot_id) {
             
              try {
                const positionsResponse = await fetchWithAuth(`/api/ballots/${ballotData.id}/positions`);
                if (positionsResponse && Array.isArray(positionsResponse)) {
                  positions = positionsResponse;
                }
              } catch (error) {
                console.error('Error fetching positions separately:', error);
              }
            }
          }

          const formattedPositions = positions.map(position => {
            
            let candidates = [];
            if (Array.isArray(position.candidates)) {
              candidates = position.candidates;
              console.log(`Found ${candidates.length} candidates in position`);
            } else if (position.position_id) {
            
              try {
                if (typeof position.candidates === 'string' && position.candidates.startsWith('[')) {
                  candidates = JSON.parse(position.candidates);
              
                }
              } catch (error) {
                console.error('Error parsing candidates JSON:', error);
              }
            } 
            
            const formattedCandidates = candidates.map(candidate => {
          
              let firstName = candidate.first_name || '';
              let lastName = candidate.last_name || '';
              
              if (!firstName && !lastName && candidate.name) {
              
                const nameParts = candidate.name.split(' ');
                if (nameParts.length > 1) {
                  firstName = nameParts[0];
                  lastName = nameParts.slice(1).join(' ');
                } else {
                  firstName = candidate.name;
                }
              }
              
                      let imageUrl = null;
                      if (candidate.image_url || candidate.photo) {
                        const imagePath = candidate.image_url || candidate.photo;
                imageUrl = getImageUrl(imagePath);
            
                if (imageUrl) {
                        setImagePreviews(prev => ({
                          ...prev,
                          [candidate.id]: imageUrl
                        }));
                }
                      }
                      
                      return {
                id: candidate.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                first_name: firstName,
                last_name: lastName,
                        party: candidate.party || '',
                        slogan: candidate.slogan || candidate.description || '',
                        platform: candidate.platform || '',
                        image_url: candidate.image_url || candidate.photo || null
                      };
            });

            const positionId = position.id || position.position_id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const positionName = position.name || position.position_name || '';
            const maxChoices = parseInt(position.max_choices || position.max_selection || 1, 10);
            
            const formattedPosition = {
              id: positionId,
              name: positionName,
              max_choices: maxChoices,
              candidates: formattedCandidates.length > 0 ? formattedCandidates : [
                {
                  id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  first_name: '',
                  last_name: '',
                  party: '',
                  slogan: '',
                  platform: '',
                  image_url: null
                }
              ]
            };

            return formattedPosition;
          });

          const newBallotState = {
            id: ballotData.id || ballotData.ballot_id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            election_id: electionId,
            description: ballotData.description || '',
            positions: formattedPositions.length > 0 ? formattedPositions : [
              {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: '',
                max_choices: 1,
                candidates: [
                  {
                    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    first_name: '',
                    last_name: '',
                    party: '',
                    slogan: '',
                    platform: '',
                    image_url: null
                  }
                ]
              }
            ]
          };
           
          setBallot(newBallotState);

        } else {

          setBallot({
            id: null,
            election_id: electionId,
            description: '',
            positions: [
              {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: '',
                max_choices: 1,
                candidates: [
                  {
                    id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    first_name: '',
                    last_name: '',
                    party: '',
                    slogan: '',
                    platform: '',
                    image_url: null
                  }
                ]
              }
            ]
          });
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setApiError(err.message || 'Failed to load election details');
      } finally {
        setIsLoading(false);
      }
    };

    if (electionId) {
      loadData();
    }
  }, [electionId]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {

      const hasPendingChanges = ballot.positions.some(position => 
        position.candidates.some(candidate => candidate._pendingImage)
      );
      
      if (hasPendingChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ballot]);

  if (isLoading || !election) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ballot details...</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-10">
        <div className="bg-red-50 border border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push(`/superadmin/election/${electionId}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Election
        </button>
      </div>
    );
  }
  const handlePositionChange = (positionId, field, value) => {
  
    setBallot(prev => ({
      ...prev,
      positions: prev.positions.map(pos => 
        pos.id === positionId ? { ...pos, [field]: value } : pos
      )
    }));
  };

  const handleCandidateChange = (positionId, candidateId, field, value) => {
    
    setBallot(prev => ({
      ...prev,
      positions: prev.positions.map(pos => ({
        ...pos,
        candidates: pos.id === positionId 
          ? pos.candidates.map(cand => 
              cand.id === candidateId ? { ...cand, [field]: value } : cand
            )
          : pos.candidates
      }))
    }));
  };

  const handleBallotChange = (e) => {
    const { name, value } = e.target;
   
    setBallot(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPosition = () => {
  
    const newPosition = {
      id: `temp_${Date.now()}`,
      name: '',
      max_choices: 1,
      display_order: ballot.positions.length + 1,
      candidates: [getEmptyCandidate()]
    };

    
    setBallot(prev => ({
      ...prev,
      positions: [...prev.positions, newPosition]
    }));
  };

 
  const handleDeletePosition = async (positionId) => {
    if (window.confirm('Are you sure you want to delete this position? This will also delete all candidates under this position.')) {
      setIsLoading(prev => ({
        ...prev,
        positions: { ...prev.positions, [positionId]: true }
      }));
      
      try {
        const isTemporary = positionId.toString().startsWith('temp_');

        setBallot(prev => ({
          ...prev,
          positions: prev.positions.filter(pos => pos.id !== positionId)
        }));

        setBallot(prev => {
          if (prev.positions.length === 0) {
            return {
              ...prev,
              positions: [getEmptyPosition()]
            };
          }
          return prev;
        });
        
        setSuccess(isTemporary ? 'Position removed' : 'Position deleted');

        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error) {
        setApiError(`Error deleting position: ${error.message}`);

        setTimeout(() => {
          setApiError(null);
        }, 3000);
      } finally {
        setIsLoading(prev => ({
          ...prev,
          positions: { ...prev.positions, [positionId]: false }
        }));
      }
    }
  };

  const handleAddCandidate = (positionId) => {
    try {
      setIsLoading(true);
      
      const newCandidate = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        first_name: "",
        last_name: "",
        party: "",
        slogan: "",
        platform: "",
        image_url: null
      };
  
    setBallot(prev => {
        const updatedPositions = prev.positions.map(pos => 
          pos.id === positionId 
            ? { ...pos, candidates: [...pos.candidates, newCandidate] } 
            : pos
        );
        
        const updatedBallot = {
          ...prev,
          positions: updatedPositions
        };
        
      return updatedBallot;
    });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct image upload for a candidate
  const handleImageUpload = async (posId, candId, file) => {
    try {

      if (!file || !file.type.match('image.*')) {
        setErrors(prev => ({
          ...prev,
          [`candidate_${candId}_image`]: 'Please select a valid image file'
        }));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          [`candidate_${candId}_image`]: 'Image must be less than 2MB'
        }));
        return;
      }

      const previewUrl = URL.createObjectURL(file);
        setImagePreviews(prev => ({
          ...prev,
        [candId]: previewUrl
        }));

      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const imageResponse = await fetchWithFormData('/api/ballots/candidates/upload-image', formData);
      
        if (!imageResponse || (!imageResponse.success && !imageResponse.filePath && !imageResponse.image_url)) {
          throw new Error('Failed to upload image');
        }

        const filePath = imageResponse.filePath || imageResponse.image_url || 
                        (imageResponse.data ? imageResponse.data.filePath || imageResponse.data.image_url : null);
        
        if (!filePath) {
          throw new Error('No file path returned from server');
        }


        setBallot(prev => ({
        ...prev,
          positions: prev.positions.map(pos => 
            pos.id === posId ? {
              ...pos,
              candidates: pos.candidates.map(cand =>
                cand.id === candId ? {
                  ...cand,
                  image_url: filePath,
                  _pendingImage: null 
                } : cand
              )
            } : pos
          )
        }));

        setSuccess('Image uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);

        setBallot(prev => ({
          ...prev,
          positions: prev.positions.map(pos => 
            pos.id === posId ? {
              ...pos,
              candidates: pos.candidates.map(cand =>
                cand.id === candId ? {
                  ...cand,
                  _pendingImage: file
                } : cand
              )
            } : pos
          )
        }));

        setErrors(prev => ({
          ...prev,
          [`candidate_${candId}_image`]: uploadError.message || 'Failed to upload image'
        }));
      }

      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`candidate_${candId}_image`];
        return newErrors;
      });
    } catch (error) {
      console.error('Error handling image:', error);
      setErrors(prev => ({
        ...prev,
        [`candidate_${candId}_image`]: error.message || 'Failed to process image'
      }));
    }
  };

  const handleDeleteCandidate = async (positionId, candidateId) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      setIsLoading(prev => ({
        ...prev,
        candidates: { ...prev.candidates, [candidateId]: true }
      }));
      
      try {
        const isTemporary = candidateId.toString().startsWith('temp_');

        setBallot(prev => ({
          ...prev,
          positions: prev.positions.map(pos => {
            if (pos.id === positionId) {
              return {
                ...pos,
                candidates: pos.candidates.filter(c => c.id !== candidateId)
              };
            }
            return pos;
          })
        }));
        setBallot(prev => {
          const updatedPositions = prev.positions.map(pos => {
            if (pos.id === positionId && pos.candidates.length === 0) {
              return {
                ...pos,
                candidates: [getEmptyCandidate()]
              };
            }
            return pos;
          });
          
          return {
            ...prev,
            positions: updatedPositions
          };
        });
        
        setSuccess(isTemporary ? 'Candidate removed' : 'Candidate deleted');

        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error) {
        console.error('Error deleting candidate:', error);
        setApiError(`Error deleting candidate: ${error.message}`);
        
        // Clear error after 3 seconds
        setTimeout(() => {
          setApiError(null);
        }, 3000);
      } finally {
        setIsLoading(prev => ({
          ...prev,
          candidates: { ...prev.candidates, [candidateId]: false }
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
  
    if (!ballot.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    ballot.positions.forEach((pos) => {
      if (!pos.name.trim()) {
        newErrors[`position-${pos.id}`] = "Position name is required";
      }  
      
      pos.candidates.forEach((cand) => {
        if (!cand.first_name.trim()) {
          newErrors[`candidate-fn-${cand.id}`] = "First name is required";
        }
        if (!cand.last_name.trim()) {
          newErrors[`candidate-ln-${cand.id}`] = "Last name is required";
        }
      });
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      window.scrollTo(0, 0);
      return;
    }
    setPreviewBallot(true);
  };

  const handleSaveFromPreview = async () => {
    setPreviewBallot(false);
    await handleSaveAllChanges();
  };

  const handleSaveAllChanges = async () => {
    try {
      setIsLoading(true);
      setApiError(null);

      const positionErrors = {};
      ballot.positions.forEach(position => {
        if (!position.name || position.name.trim() === '') {
          positionErrors[`position_${position.id}`] = 'Position name is required';
        }
        
        position.candidates.forEach(candidate => {
          if (!candidate.first_name || candidate.first_name.trim() === '') {
            positionErrors[`candidate_${candidate.id}_first_name`] = 'First name is required';
          }
        });
      });
      
      if (Object.keys(positionErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...positionErrors }));
        throw new Error('Please fix the errors before saving');
      }

      let ballotId = ballot.id;
      const isUpdate = ballotId && !ballotId.toString().startsWith('temp_');

      const apiData = {
        election_id: ballot.election_id,
        description: ballot.description,
        positions: ballot.positions.map(pos => ({
          id: pos.id && !pos.id.startsWith('temp_') ? pos.id : undefined,
          name: pos.name,
          max_choices: pos.max_choices,
          candidates: pos.candidates.map(cand => ({
            id: cand.id && !cand.id.startsWith('temp_') ? cand.id : undefined,
            first_name: cand.first_name,
            last_name: cand.last_name,
            party: cand.party || '',
            slogan: cand.slogan || '',
            platform: cand.platform || '',
            image_url: cand.image_url
          }))
        }))
      };

      let response;
      try {
        if (ballot.id && !ballot.id.startsWith('temp_')) {

          response = await fetchWithAuth(`/ballots/${ballot.id}`, {
            method: 'PUT',
            body: JSON.stringify(apiData)
          });
      } else {
        // Create new ballot
          response = await fetchWithAuth('/ballots', {
            method: 'POST',
            body: JSON.stringify(apiData)
          });
        }
      
        console.log('Ballot save response:', response);
        
        setIsLoading(false);
        setPreviewBallot(false);

        router.push(`/superadmin/election/${electionId}`);
      } catch (apiError) {
        console.error('API error saving ballot:', apiError);
        
        if (apiError.message === "Ballot created successfully" || 
            apiError.message === "Ballot updated successfully") {
          setIsLoading(false);

          router.push(`/superadmin/election/${electionId}`);
          } else {
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      if (error.message === "Ballot created successfully" || 
          error.message === "Ballot updated successfully") {
        router.push(`/superadmin/election/${electionId}`);
      } else {
        setApiError(error.message || "An unexpected error occurred");
        window.scrollTo(0, 0);
      }
      setIsLoading(false);
    }
  };

  const confirmDelete = (type, id) => {
    setDeleteConfirm({ type, id, show: true });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ type: "", id: null, show: false });
  };

  const executeDelete = async () => {
    try {
      setIsLoading(true);
      
      if (deleteConfirm.type === "position") {
        if (ballot.positions.length <= 1) {
          alert("At least one position is required");
          return;
        }
        
          setBallot(prev => ({
            ...prev,
          positions: prev.positions.filter(pos => pos.id !== deleteConfirm.id)
        }));
      } else if (deleteConfirm.type === "candidate") {
        const position = ballot.positions.find(pos => 
          pos.candidates.some(c => c.id === deleteConfirm.id)
        );
        
        if (position && position.candidates.length <= 1) {
          alert("At least one candidate is required");
          return;
        }
        
        setBallot(prev => ({
          ...prev,
          positions: prev.positions.map(pos => ({
            ...pos,
            candidates: pos.candidates.filter(cand => cand.id !== deleteConfirm.id)
          }))
        }));
      }
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
      cancelDelete();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {previewBallot && (
        <PreviewModal
          ballot={ballot}
          election={election}
          onConfirm={handleSaveFromPreview}
          onCancel={() => setPreviewBallot(false)}
          onSave={handleSaveFromPreview}
          onClose={() => setPreviewBallot(false)}
        />
      )}

      <div className="flex items-center mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Ballot</h1>
          <p className="text-sm text-gray-600">For election: {election?.title || 'Loading...'}</p>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {apiError}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ballot Description
        </label>
        <textarea
          name="description"
          value={ballot.description}
          onChange={(e) => handleBallotChange(e)}
          className={`w-full p-2 border rounded text-black ${
            errors.description ? "border-red-500" : "border-gray-300"
          }`}
          rows={3}
          placeholder="Describe what this ballot is for"
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      {ballot.positions.map((position) => (
              <div key={position.id} className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                Position/Title Name 
                    </label>
                    <input
                      type="text"
                      value={position.name}
                      onChange={(e) => handlePositionChange(position.id, "name", e.target.value)}
                      className={`w-full p-2 border rounded text-black ${
                  errors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
                      }`}
                placeholder="Enter position name"
                    />
              {errors[`position-${position.id}`] && (
                <p className="text-red-500 text-sm mt-1">{errors[`position-${position.id}`]}</p>
                    )}
                  </div>

                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Voting Type
                    </label>
                    <select
                      value={position.max_choices}
                      onChange={(e) => handlePositionChange(position.id, "max_choices", parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded text-black"
                    >
                      <option value={1}>Single choice</option>
                      <option value={2}>Multiple choice (2)</option>
                    </select>
                  </div>

                  <button
              onClick={() => confirmDelete("position", position.id)}
                    className="ml-4 text-red-600 hover:text-red-800 p-2"
                    title="Delete position"
              disabled={ballot.positions.length <= 1}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

          <div className="space-y-4">
                  {position.candidates.map((candidate) => (
                    <div key={candidate.id} className="border rounded-lg p-4">
                      <div className="flex">
                        <div className="mr-4 relative">
                          <label className="block w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group">
                            {imagePreviews[candidate.id] ? (
                              <div className="w-full h-full relative">
                                <img 
                                  src={imagePreviews[candidate.id]} 
                                  alt="Candidate preview" 
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : candidate.image_url ? (
                              <div className="w-full h-full relative">
                                <img 
                            src={getImageUrl(candidate.image_url)}
                                  alt={`${candidate.first_name} ${candidate.last_name}`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error(`Error loading image: ${candidate.image_url}`);
                                    e.target.src = '/default-candidate.png';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="w-6 h-6 mb-2" />
                          <span className="text-xs">Upload Photo</span>
                              </div>
                            )}
                            <input
                              type="file"
                        accept="image/jpeg, image/png, image/webp"
                              className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(position.id, candidate.id, e.target.files[0]);
                          }
                        }}
                        disabled={isLoading}
                            />
                          </label>
                    {errors[`candidate_${candidate.id}_image`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`candidate_${candidate.id}_image`]}</p>
                    )}
                        </div>

                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                        <label className="block text-sm font-medium text-black mb-1">
                                First Name 
                              </label>
                              <input
                                type="text"
                                value={candidate.first_name}
                          onChange={(e) => handleCandidateChange(position.id, candidate.id, "first_name", e.target.value)}
                                className={`w-full p-2 border rounded text-black ${
                            errors[`candidate-fn-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                                }`}
                                placeholder="First name"
                              />
                        {errors[`candidate-fn-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-fn-${candidate.id}`]}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black mb-1">
                                Last Name 
                              </label>
                              <input
                                type="text"
                                value={candidate.last_name}
                          onChange={(e) => handleCandidateChange(position.id, candidate.id, "last_name", e.target.value)}
                                className={`w-full p-2 border rounded text-black ${
                            errors[`candidate-ln-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                                }`}
                                placeholder="Last name"
                              />
                        {errors[`candidate-ln-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-ln-${candidate.id}`]}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partylist/Course
                              </label>
                              <input
                                type="text"
                                value={candidate.party}
                          onChange={(e) => handleCandidateChange(position.id, candidate.id, "party", e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-black"
                                placeholder="Party"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black mb-1">
                                Slogan (Optional)
                              </label>
                              <input
                                type="text"
                                value={candidate.slogan}
                          onChange={(e) => handleCandidateChange(position.id, candidate.id, "slogan", e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-black"
                                placeholder="Campaign slogan"
                              />
                            </div>
                          </div>

                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Platform/Description
                            </label>
                            <textarea
                              value={candidate.platform}
                        onChange={(e) => handleCandidateChange(position.id, candidate.id, "platform", e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-black"
                        rows={2}
                        placeholder="Candidate platform or bio"
                            />
                          </div>
                  </div>
                            <button
                    onClick={() => confirmDelete("candidate", candidate.id)}
                    className="ml-4 text-red-600 hover:text-red-800 p-2"
                              title="Delete candidate"
                    disabled={position.candidates.length <= 1}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleAddCandidate(position.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 mt-2"
              disabled={isLoading}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Candidate
                  </button>
                </div>
              </div>
            ))}

      <div className="flex justify-between mt-6">
        <button
          onClick={handleAddPosition}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={isLoading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Position
        </button>

        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-400"
        >
          {isLoading ? 'Saving...' : 'Preview & Save Ballot'}
        </button>
      </div>
      
      {deleteConfirm.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4 text-black">
              Confirm Delete {deleteConfirm.type}
            </h3>
            <p className="mb-6 text-black">
              Are you sure you want to delete this {deleteConfirm.type}? 
            </p>
            <div className="flex justify-end space-x-3">
        <button
                onClick={cancelDelete}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
        >
          Cancel
        </button>
        <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Processing your ballot...</p>
          </div>
        </div>
      )}
    </div>
  );
}