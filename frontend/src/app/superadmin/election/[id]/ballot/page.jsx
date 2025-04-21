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

// Import components
import CandidateFormModal from './components/CandidateFormModal';
import PositionItem from './components/PositionItem';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = Cookies.get('token');
  const apiUrl = BASE_URL || 'http://localhost:5000';
  
  // Ensure endpoint starts with /api
  const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
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

    // Clone the response for error handling
    const responseClone = response.clone();

    // Check if response is ok (status in the range 200-299)
    if (!response.ok) {
      // Try to parse error as JSON first
      try {
        const errorData = await response.json();
        
        // Special handling for "No ballot found" error - don't treat as fatal error
        if (errorData.message && errorData.message.includes('No ballot found')) {
          return null;
        }
        
        throw new Error(errorData.message || 'Request failed');
      } catch (e) {
        // If JSON parsing fails, check if it's HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          if (response.status === 404) {
            // Return null instead of throwing for 404 errors to allow fallback logic
            return null;
          }
          throw new Error('Server returned an HTML error page. Please try again later.');
        }
        
        // If not HTML, try to get text content
        const errorText = await responseClone.text();
        if (errorText) {
          // Check if the text might be unparseable JSON
          if (errorText.includes('{') && errorText.includes('}')) {
            // Try to extract message with regex
            const messageMatch = errorText.match(/"message"\s*:\s*"([^"]+)"/);
            if (messageMatch && messageMatch[1]) {
              // Special handling for "No ballot found" error - don't treat as fatal error
              if (messageMatch[1].includes('No ballot found')) {
                return null;
              }
              throw new Error(messageMatch[1]);
            }
          }
          
          throw new Error(errorText);
        }
        
        // If all else fails, throw a generic error with status
        throw new Error(`Request failed with status ${response.status}`);
      }
    }

    // Try to parse the response as JSON
    try {
      const jsonData = await response.json();
      return jsonData;
    } catch (e) {
      // If JSON parsing fails, check content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of JSON. Please try again later.');
      }
      
      // Try to get text content as a fallback
      try {
        const textData = await responseClone.text();
        
        // Check if the text might be JSON
        if (textData.includes('{') && textData.includes('}')) {
          try {
            // Try to parse it as JSON
            return JSON.parse(textData);
          } catch (parseError) {
            console.error('Failed to parse text as JSON:', parseError);
          }
        }
        
        // If it's not JSON, return the text
        return textData;
      } catch (textError) {
        throw new Error('Invalid response from server');
      }
    }
  } catch (error) {
    // Add more context to the error message
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    throw error;
  }
};

const fetchWithFormData = async (endpoint, formData, method = 'POST') => {
  const token = Cookies.get('token');
  const apiUrl = BASE_URL || 'http://localhost:5000'; // Add fallback for BASE_URL
  
  console.log(`Making form data API request to: ${apiUrl}${endpoint}`);
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    console.log(`FormData response status: ${response.status} ${response.statusText}`);
    
    // Clone response for error handling
    const responseClone = response.clone();

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      
      try {
        // Try to parse as JSON first
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (jsonError) {
        // If not JSON, try to get the text
        try {
          const errorText = await responseClone.text();
          // Check if the text might be JSON (but not parsed correctly)
          if (errorText.includes('{') && errorText.includes('}')) {
            // Try to extract message with regex as a fallback
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
          // If both approaches fail, use the default error message
          console.error('Error extracting error details:', textError);
        }
      }
      
      throw new Error(errorMessage);
    }

    // Try to parse the response
    try {
      const jsonData = await response.json();
      console.log('FormData API response:', jsonData);
      return jsonData;
    } catch (jsonError) {
      // If JSON parsing fails, try text
      const textResponse = await responseClone.text();
      console.error('Invalid JSON in FormData response:', textResponse);
      
      // Try to parse the text as JSON manually
      if (textResponse.includes('{') && textResponse.includes('}')) {
        try {
          // Last attempt with manual JSON parsing
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
  if (!imagePath) return '/default-candidate.png';
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_URL}${imagePath}`;
};

// API functions
const getBallotByElection = async (electionId) => {
  try {
    console.log(`Fetching ballot for election ID: ${electionId}`);
    
    // Try multiple API endpoints to find the ballot
    let response = null;
    
    // Try primary endpoint first - this should be the most likely to work
    try {
      console.log('Trying primary endpoint: /api/elections/${electionId}/ballot');
      response = await fetchWithAuth(`/api/elections/${electionId}/ballot`);
      console.log('Primary endpoint response received:', response);
    } catch (err) {
      console.warn('Primary endpoint failed:', err);
      
      // Try alternate endpoint
      try {
        console.log('Trying alternate endpoint: /api/ballots/election/${electionId}');
        response = await fetchWithAuth(`/api/ballots/election/${electionId}`);
        console.log('Alternate endpoint response received:', response);
      } catch (altErr) {
        console.warn('Alternate endpoint also failed:', altErr);
        
        // Try third endpoint option - no /api prefix
        try {
          console.log('Trying third endpoint: /elections/${electionId}/ballot');
          response = await fetchWithAuth(`/elections/${electionId}/ballot`);
          console.log('Third endpoint response received:', response);
        } catch (thirdErr) {
          console.warn('Third endpoint also failed, trying fourth option');
          
          // Try fourth endpoint option
          try {
            console.log('Trying fourth endpoint: /api/ballots?election_id=${electionId}');
            const ballotsList = await fetchWithAuth(`/api/ballots?election_id=${electionId}`);
            console.log('Ballots list response:', ballotsList);
            
            // If we get an array of ballots, use the first one
            if (Array.isArray(ballotsList) && ballotsList.length > 0) {
              response = ballotsList[0];
              console.log('Using first ballot from list:', response);
            } else if (ballotsList && ballotsList.data && Array.isArray(ballotsList.data) && ballotsList.data.length > 0) {
              response = ballotsList.data[0];
              console.log('Using first ballot from nested data array:', response);
            }
          } catch (fourthErr) {
            console.warn('All endpoints failed');
            throw fourthErr; // Re-throw the last error
          }
        }
      }
    }
    
    if (!response) {
      console.log('No ballot found for election');
      return null;
    }
    
    // Handle different response structures
    let ballotData = null;
    
    console.log('Response type:', typeof response);
    
    if (typeof response === 'object') {
      // Handle possible response structures
      if (response.ballot) {
        console.log('Found ballot in response.ballot');
        ballotData = response.ballot;
      } else if (response.data && response.data.ballot) {
        console.log('Found ballot in response.data.ballot');
        ballotData = response.data.ballot;
      } else if (response.positions || (response.data && response.data.positions)) {
        console.log('Found positions directly in response');
        ballotData = response.data || response;
      } else {
        console.log('Using full response as ballot data');
        ballotData = response;
      }
    } else {
      console.warn('Response is not an object:', response);
      return null;
    }
    
    console.log('Raw ballot data:', ballotData);
    
    // Ensure the ballot data has the correct structure
    if (!ballotData) {
      console.log('No valid ballot data found');
      return null;
    }
    
    // Process and validate the ballot data
    const processedBallot = {
      id: ballotData.id || null,
      description: ballotData.description || '',
      positions: Array.isArray(ballotData.positions) ? ballotData.positions.map(position => {
        console.log('Processing position:', position);
        return {
          id: position.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: position.name || '',
          max_choices: parseInt(position.max_choices || 1),
          candidates: Array.isArray(position.candidates) ? position.candidates.map(candidate => {
            console.log('Processing candidate:', candidate);
            return {
              id: candidate.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              first_name: candidate.first_name || '',
              last_name: candidate.last_name || '',
              party: candidate.party || '',
              slogan: candidate.slogan || '',
              platform: candidate.platform || '',
              image_url: candidate.image_url || null
            };
          }) : []
        };
      }) : []
    };
    
    console.log('Processed ballot data:', processedBallot);
    return processedBallot;
  } catch (error) {
    console.error('Error fetching ballot:', error);
    throw error;
  }
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

// Preview Modal Component
const PreviewModal = ({ isOpen, onClose, ballot, onSave }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Ballot Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {ballot.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{ballot.description}</p>
            </div>
          )}

          {ballot.positions.map((position) => (
            <div key={position.id} className="border rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-4">{position.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {position.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border rounded-lg p-4 flex flex-col"
                  >
                    <div className="aspect-square mb-4 relative">
                      {candidate.image_url ? (
                        <img
                          src={getImageUrl(candidate.image_url)}
                          alt={`${candidate.first_name} ${candidate.last_name}`}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            console.error('Image load error:', e);
                            e.target.src = '/placeholder-candidate.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                          <UserIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-lg">
                      {candidate.first_name} {candidate.last_name}
                    </h4>
                    {candidate.party && (
                      <p className="text-gray-600">{candidate.party}</p>
                    )}
                    {candidate.slogan && (
                      <p className="text-gray-700 italic mt-2">
                        "{candidate.slogan}"
                      </p>
                    )}
                    {candidate.platform && (
                      <p className="text-gray-600 mt-2">{candidate.platform}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back to Edit
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to inspect and extract ballot data from any response format
const extractBallotData = (data) => {
  console.log('Extracting ballot data from:', data);
  
  if (!data) {
    console.log('No data provided to extract');
    return null;
  }
  
  // Check various possible response formats
  let ballotData = null;
  
  // Handle case: { ballot: { ... } }
  if (data.ballot && typeof data.ballot === 'object') {
    console.log('Found ballot in data.ballot');
    ballotData = data.ballot;
  }
  // Handle case: { data: { ballot: { ... } } }
  else if (data.data && data.data.ballot && typeof data.data.ballot === 'object') {
    console.log('Found ballot in data.data.ballot');
    ballotData = data.data.ballot;
  }
  // Handle case where data is directly the ballot
  else if (data.id || data.positions) {
    console.log('Data appears to be the ballot itself');
    ballotData = data;
  }
  // Handle case: { data: { ... ballot data ... } }
  else if (data.data && (data.data.id || data.data.positions)) {
    console.log('Found ballot data in data.data');
    ballotData = data.data;
  }
  // Handle case with nested election and ballot
  else if (data.election && data.election.ballot) {
    console.log('Found ballot in data.election.ballot');
    ballotData = data.election.ballot;
  }
  
  if (!ballotData) {
    console.log('Could not extract ballot data from response');
    return null;
  }
  
  // Extract required fields with fallbacks
  return {
    id: ballotData.id || null,
    description: ballotData.description || '',
    positions: processBallotPositions(ballotData)
  };
};

// Process positions array with safety checks
const processBallotPositions = (ballotData) => {
  if (!ballotData.positions) {
    console.log('No positions found in ballot data');
    return [];
  }
  
  if (!Array.isArray(ballotData.positions)) {
    console.log('Positions is not an array:', typeof ballotData.positions);
    return [];
  }
  
  return ballotData.positions.map(position => {
    // Ensure each position has valid data
    const processedPosition = {
      id: position.id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: position.name || '',
      max_choices: position.max_choices || 1,
      candidates: []
    };
    
    // Process candidates with safety checks
    if (position.candidates && Array.isArray(position.candidates)) {
      processedPosition.candidates = position.candidates.map(candidate => ({
        id: candidate.id || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
};

// Clean up the processor function
const processElectionDetailsData = (electionResponse) => {
  if (!electionResponse) return null;
  
  // Extract ballot data either from ballot property or positions directly
  let ballotData = {
    id: electionResponse.ballot_id || (electionResponse.ballot ? electionResponse.ballot.id : null) || null,
    description: (electionResponse.ballot ? electionResponse.ballot.description : '') || '',
    positions: []
  };
  
  // Get positions - check all possible structures where positions could be located
  let positions = [];
  
  if (Array.isArray(electionResponse.positions)) {
    positions = electionResponse.positions;
  } else if (electionResponse.ballot && Array.isArray(electionResponse.ballot.positions)) {
    positions = electionResponse.ballot.positions;
  }
  
  // If we have positions, process them
  if (positions.length > 0) {
    ballotData.positions = positions.map(position => {
      // Handle both naming conventions (snake_case from API, camelCase from frontend)
      const processedPosition = {
        id: position.id || position.position_id,
        name: position.name || position.position_name || '',
        max_choices: parseInt(position.max_choices || 1, 10),
        candidates: []
      };
      
      // Process candidates
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
  
  // Important: If we have positions but no ballot ID, create a temporary ID
  if (!ballotData.id && ballotData.positions.length > 0) {
    ballotData.id = `temp_${Date.now()}`;
  }
  
  return ballotData;
};

// Helper functions to create default empty position and candidate objects
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

export default function BallotEditPage() {
  const router = useRouter();
  const params = useParams();
  const electionId = params.id;
  
  // States
  const [loading, setLoading] = useState({
    initial: true,
    saving: false,
    savingAll: false
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [election, setElection] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [ballot, setBallot] = useState({
    id: null,
    description: '',
    positions: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});
  const [previewBallot, setPreviewBallot] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ type: "", id: null, show: false });
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch election and ballot data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(prev => ({ ...prev, initial: true }));
        setError(null);
        
        // Step 1: Get election details
        const electionResponse = await fetchWithAuth(`/api/elections/${electionId}`);
        if (!electionResponse || !electionResponse.election) {
          throw new Error('Failed to fetch election details');
        }
        
        // Process election details
        const electionDetails = electionResponse.election;
        setElection(electionDetails);
        
        // Check if election is upcoming - only upcoming elections can be edited
        if (electionDetails.status !== 'upcoming' && electionDetails.status !== 'pending') {
          setError("Only upcoming or pending elections can be edited");
          setLoading(prev => ({ ...prev, initial: false }));
          return;
        }
        
        // Step 2: Try to get existing ballot
        let ballotData = null;
        
        try {
          // Try first endpoint
          console.log('Trying to fetch ballot data from /api/ballots/election/' + electionId);
          const ballotResponse = await fetchWithAuth(`/api/ballots/election/${electionId}`);
          
          if (ballotResponse && ballotResponse.ballot) {
            console.log('Ballot found:', ballotResponse.ballot);
            ballotData = ballotResponse.ballot;
          } else if (ballotResponse && ballotResponse.data) {
            console.log('Ballot found in data property:', ballotResponse.data);
            ballotData = ballotResponse.data;
          } else if (ballotResponse && (ballotResponse.id || ballotResponse.positions)) {
            console.log('Ballot found directly in response:', ballotResponse);
            ballotData = ballotResponse;
          }
        } catch (firstError) {
          console.error('Error fetching ballot from first endpoint:', firstError);
          
          // Try second endpoint
          try {
            console.log('Trying alternate endpoint: /api/elections/' + electionId + '/ballot');
            const altResponse = await fetchWithAuth(`/api/elections/${electionId}/ballot`);
            
            if (altResponse && altResponse.ballot) {
              console.log('Ballot found in alternate endpoint:', altResponse.ballot);
              ballotData = altResponse.ballot;
            } else if (altResponse && altResponse.data) {
              console.log('Ballot found in alternate endpoint data property:', altResponse.data);
              ballotData = altResponse.data;
            } else if (altResponse && (altResponse.id || altResponse.positions)) {
              console.log('Ballot found directly in alternate response:', altResponse);
              ballotData = altResponse;
            }
          } catch (secondError) {
            console.error('Error fetching ballot from second endpoint:', secondError);
          }
        }
        
        if (ballotData) {
          // Process existing ballot data
          console.log('Processing existing ballot data:', ballotData);
          
          // Map positions and candidates with proper structure for editing
          const positions = Array.isArray(ballotData.positions) 
            ? ballotData.positions.map(position => ({
                id: position.id || `temp_${Date.now()}`,
                name: position.name || '',
                max_choices: parseInt(position.max_selection || position.max_choices || 1, 10),
                display_order: position.display_order || 0,
                candidates: Array.isArray(position.candidates) 
                  ? position.candidates.map(candidate => {
                      // Prepare image preview URLs
                      let imageUrl = null;
                      if (candidate.image_url || candidate.photo) {
                        const imagePath = candidate.image_url || candidate.photo;
                        imageUrl = imagePath.startsWith('http') 
                          ? imagePath 
                          : `${BASE_URL}/uploads/${imagePath}`;
                          
                        // Also store in imagePreviews
                        setImagePreviews(prev => ({
                          ...prev,
                          [candidate.id]: imageUrl
                        }));
                      }
                      
                      return {
                        id: candidate.id || `temp_${Date.now()}`,
                        first_name: candidate.first_name || candidate.name || '',
                        last_name: candidate.last_name || '',
                        party: candidate.party || '',
                        slogan: candidate.slogan || candidate.description || '',
                        platform: candidate.platform || '',
                        image_url: candidate.image_url || candidate.photo || null
                      };
                    })
                  : []
              }))
            : [];
          
          // Update ballot state with existing data
          setBallot({
            id: ballotData.id || `temp_${Date.now()}`,
            election_id: electionId,
            description: ballotData.description || '',
            positions: positions.length > 0 ? positions : [getEmptyPosition()]
          });
          
          console.log('Ballot state initialized with existing data. Positions:', positions.length);
          setHasUnsavedChanges(false);
        } else {
          // Initialize empty ballot for a new creation
          console.log('No existing ballot found, initializing empty ballot');
          setBallot({
            id: null,
            election_id: electionId,
            description: '',
            positions: [getEmptyPosition()]
          });
        }
        
        setDataLoaded(true);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load election details');
      } finally {
        setLoading(prev => ({ ...prev, initial: false }));
      }
    };

    if (electionId) {
      loadData();
    }
  }, [electionId]);

  // Add a window beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Show loading state
  if (loading.initial) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ballot details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-10">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>

        {/* Ballot Summary */}
        {ballot.id && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ballot Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Positions</p>
                <p className="font-medium">{ballot.positions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Candidates</p>
                <p className="font-medium">
                  {ballot.positions.reduce((sum, pos) => sum + pos.candidates.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-green-600">Ready for Editing</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add helper function to track changes to positions or candidates
  const trackChanges = () => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  // Update handlePositionChange to track changes
  const handlePositionChange = (positionId, field, value) => {
    setBallot(prev => ({
      ...prev,
      positions: prev.positions.map(pos => 
        pos.id === positionId 
          ? { ...pos, [field]: value }
          : pos
      )
    }));
    trackChanges();
  };

  // Adding a new position
  const handleAddPosition = () => {
    // Create a new position with a temporary ID and one empty candidate
    const newPosition = {
      id: `temp_${Date.now()}`,
      name: '',
      max_choices: 1,
      display_order: ballot.positions.length + 1,
      candidates: [getEmptyCandidate()]
    };
    
    console.log("Adding new position:", newPosition);
    
    setBallot(prev => ({
      ...prev,
      positions: [...prev.positions, newPosition]
    }));
    
    trackChanges();
  };

  // Deleting a position
  const handleDeletePosition = async (positionId) => {
    if (window.confirm('Are you sure you want to delete this position? This will also delete all candidates under this position.')) {
      setLoading(prev => ({
        ...prev,
        positions: { ...prev.positions, [positionId]: true }
      }));
      
      try {
        // Check if it's a temporary position (not yet saved to database)
        const isTemporary = positionId.toString().startsWith('temp_');
        
        // Just remove it from the state
        setBallot(prev => ({
          ...prev,
          positions: prev.positions.filter(pos => pos.id !== positionId)
        }));
        
        // If it was empty, add an empty position
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
        setHasUnsavedChanges(true);
        
        // Clear any success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error) {
        setError(`Error deleting position: ${error.message}`);
        
        // Clear error after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
      } finally {
        setLoading(prev => ({
          ...prev,
          positions: { ...prev.positions, [positionId]: false }
        }));
      }
    }
  };

  // Update handleDescriptionChange to track changes
  const handleDescriptionChange = (e) => {
    setBallot(prev => ({
      ...prev,
      description: e.target.value
    }));
    trackChanges();
  };

  // Start adding a new candidate
  const handleAddCandidate = (positionId) => {
    // Create a new empty candidate with a temporary ID
    const newCandidate = getEmptyCandidate();
    
    // Add the new candidate to the position's candidates array
    setBallot(prev => {
      // Clone the ballot state
      const updatedBallot = { ...prev };
      
      // Find the position to add the candidate to
      const positionIndex = updatedBallot.positions.findIndex(pos => pos.id === positionId);
      if (positionIndex === -1) {
        console.error(`Position with ID ${positionId} not found`);
        return prev;
      }
      
      // Add the candidate to the position
      if (!updatedBallot.positions[positionIndex].candidates) {
        updatedBallot.positions[positionIndex].candidates = [];
      }
      
      updatedBallot.positions[positionIndex].candidates.push(newCandidate);
      
      console.log(`Added new candidate to position ${positionId}:`, newCandidate);
      return updatedBallot;
    });
    
    trackChanges();
  };

  // Update handleDirectCandidateChange to track changes
  const handleDirectCandidateChange = (positionId, candidateId, field, value) => {
    setBallot(prev => ({
      ...prev,
      positions: prev.positions.map(pos => 
        pos.id === positionId
          ? {
              ...pos,
              candidates: pos.candidates.map(cand => 
                cand.id === candidateId
                  ? { ...cand, [field]: value }
                  : cand
              )
            }
          : pos
      )
    }));
    trackChanges();
  };

  // Handle direct image upload for a candidate
  const handleEditCandidateImage = async (positionId, candidateId, file) => {
    try {
      // Basic validation
      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({
          ...prev,
          [`candidate_${candidateId}_image`]: 'Please select an image file'
        }));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormErrors(prev => ({
          ...prev,
          [`candidate_${candidateId}_image`]: 'Image must be less than 5MB'
        }));
        return;
      }
      
      // Create a preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => ({
          ...prev,
          [candidateId]: reader.result
        }));
      };
      reader.readAsDataURL(file);
      
      // Prepare FormData
      const formData = new FormData();
      formData.append('image', file);
      
      // Use the correct endpoint for image upload
      const response = await fetchWithFormData('/api/ballots/candidates/upload-image', formData);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to upload image');
      }
      
      console.log('Image upload successful:', response);
      
      // Update candidate with new image url
      handleDirectCandidateChange(positionId, candidateId, 'image_url', response.filePath);
      
      // Add timestamp to force browser to reload the image
      const timestamp = new Date().getTime();
      const imageUrl = getImageUrl(response.filePath);
      setImagePreviews(prev => ({
        ...prev,
        [candidateId]: `${imageUrl}?t=${timestamp}`
      }));
      
      // Clear any previous errors
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`candidate_${candidateId}_image`];
        return newErrors;
      });
      
      // Show success message
      setSuccess('Image uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setFormErrors(prev => ({
        ...prev,
        [`candidate_${candidateId}_image`]: error.message || 'Failed to upload image'
      }));
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (positionId, candidateId) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      setLoading(prev => ({
        ...prev,
        candidates: { ...prev.candidates, [candidateId]: true }
      }));
      
      try {
        // Check if it's a temporary candidate (not yet saved to database)
        const isTemporary = candidateId.toString().startsWith('temp_');
        
        // Remove from state
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
        
        // If this was the last candidate, add an empty one
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
        setHasUnsavedChanges(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error) {
        console.error('Error deleting candidate:', error);
        setError(`Error deleting candidate: ${error.message}`);
        
        // Clear error after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
      } finally {
        setLoading(prev => ({
          ...prev,
          candidates: { ...prev.candidates, [candidateId]: false }
        }));
      }
    }
  };

  // Validate form
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
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle preview
  const handlePreview = () => {
    if (!validateForm()) return;
    setPreviewBallot(true);
  };

  // Add handleSaveFromPreview function
  const handleSaveFromPreview = async () => {
    setPreviewBallot(false);
    await handleSaveAllChanges();
  };

  // Handle save all changes
  const handleSaveAllChanges = async () => {
    try {
      setLoading(prev => ({ ...prev, savingAll: true }));
      setError(null);
      
      // Validate positions before saving
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
        setFormErrors(prev => ({ ...prev, ...positionErrors }));
        throw new Error('Please fix the errors before saving');
      }
      
      console.log('Saving ballot changes... Current ballot state:', ballot);
      
      // Step 1: Determine if we're updating or creating
      let ballotId = ballot.id;
      const isUpdate = ballotId && !ballotId.toString().startsWith('temp_');
      
      console.log(`Operation type: ${isUpdate ? 'UPDATE' : 'CREATE'}, Ballot ID: ${ballotId}`);
      
      // Prepare ballot data - handle both update and create operations the same way
      const ballotData = {
        election_id: electionId,
        description: ballot.description || 'Election Ballot',
        positions: ballot.positions.map(pos => ({
          // For existing positions, include the ID; for new ones, omit it
          ...(pos.id && !pos.id.toString().startsWith('temp_') ? { id: pos.id } : {}),
          name: pos.name.trim(),
          max_choices: pos.max_choices || 1,
          display_order: pos.display_order || 0,
          candidates: pos.candidates.map(cand => ({
            // For existing candidates, include the ID; for new ones, omit it
            ...(cand.id && !cand.id.toString().startsWith('temp_') ? { id: cand.id } : {}),
            first_name: cand.first_name.trim(),
            last_name: cand.last_name?.trim() || '',
            party: cand.party?.trim() || '',
            slogan: cand.slogan?.trim() || '',
            platform: cand.platform?.trim() || '',
            image_url: cand.image_url || null
          }))
        }))
      };
      
      console.log('Prepared ballot data:', JSON.stringify(ballotData, null, 2));
      
      let savedBallotId;
      let savedSuccessfully = false;
      
      if (isUpdate) {
        // Update existing ballot
        console.log('Updating existing ballot with ID:', ballotId);
        
        try {
          const updateResponse = await fetchWithAuth(`/api/ballots/${ballotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ballotData)
          });
          
          console.log('Update ballot response:', updateResponse);
          savedSuccessfully = true;
          savedBallotId = ballotId;
        } catch (updateError) {
          console.error('Error updating ballot:', updateError);
          throw new Error(`Failed to update ballot: ${updateError.message}`);
        }
      } else {
        // Create new ballot
        console.log('Creating new ballot for election:', electionId);
        
        try {
          const createResponse = await fetchWithAuth(`/api/ballots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ballotData)
          });
          
          console.log('Create ballot response:', createResponse);
          
          // Extract the ballot ID from the response
          if (createResponse.ballot && createResponse.ballot.id) {
            savedBallotId = createResponse.ballot.id;
          } else if (createResponse.id) {
            savedBallotId = createResponse.id;
          } else if (createResponse.data && createResponse.data.id) {
            savedBallotId = createResponse.data.id;
          } else {
            console.error('Could not extract ballot ID from response:', createResponse);
            throw new Error('Failed to create ballot - could not determine the new ballot ID');
          }
          
          console.log('New ballot created with ID:', savedBallotId);
          savedSuccessfully = true;
        } catch (createError) {
          console.error('Error creating ballot:', createError);
          throw new Error(`Failed to create ballot: ${createError.message}`);
        }
      }
      
      if (savedSuccessfully) {
        // Update state with ballot ID if this was a create operation
        if (!isUpdate && savedBallotId) {
          setBallot(prev => ({
            ...prev,
            id: savedBallotId
          }));
        }
        
        // Success feedback and cleanup
        setSuccess('All changes saved successfully');
        setHasUnsavedChanges(false);
        
        // Navigate back to election details
        setTimeout(() => {
          router.push(`/superadmin/election/${electionId}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving ballot changes:', err);
      setError(`Failed to save changes: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, savingAll: false }));
    }
  };

  // Return the JSX for the ballot editing UI
  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      {/* Header section with breadcrumbs */}
      <div className="mb-6">
        <button 
          onClick={() => router.push(`/superadmin/election/${electionId}`)}
          className="flex items-center text-blue-900 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-6 h-6 mr-2" />
          <span className="font-semibold">Back to Election</span>
        </button>

        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold mb-4 text-black">
            {ballot.id ? 'Edit Existing Ballot' : 'Create New Ballot'}
          </h1>
          {ballot.id && (
            <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Ballot ID: {ballot.id}
            </div>
          )}
        </div>
      </div>

      {/* Success and error messages */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
            <p className="text-green-700">{typeof success === 'string' ? success : 'Changes saved successfully'}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ballot description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Ballot Description
        </label>
        <textarea
          id="description"
          value={ballot.description || ''}
          onChange={handleDescriptionChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          rows={3}
          placeholder="Enter ballot description..."
        />
      </div>

      {/* Positions section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black">Positions</h2>
          <button
            onClick={handleAddPosition}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Position
          </button>
        </div>

        {ballot.positions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Positions Added</h3>
            <p className="text-gray-500 mb-4">Add positions like President, Vice President, etc. to your ballot.</p>
            <button
              onClick={handleAddPosition}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Your First Position
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {ballot.positions.map(position => (
              <div key={position.id} className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1 mr-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position Name 
                    </label>
                    <input
                      type="text"
                      value={position.name}
                      onChange={(e) => handlePositionChange(position.id, "name", e.target.value)}
                      className={`w-full p-2 border rounded text-black ${
                        formErrors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors[`position-${position.id}`] && (
                      <p className="text-red-500 text-sm mt-1">{formErrors[`position-${position.id}`]}</p>
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
                    onClick={() => handleDeletePosition(position.id)}
                    className="ml-4 text-red-600 hover:text-red-800 p-2"
                    title="Delete position"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-black">
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
                                  src={candidate.image_url.startsWith('http') 
                                    ? candidate.image_url 
                                    : `${BASE_URL}/uploads/${candidate.image_url}`}
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
                              <div className="w-full h-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleEditCandidateImage(position.id, candidate.id, e.target.files[0])}
                            />
                          </label>
                        </div>

                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                First Name 
                              </label>
                              <input
                                type="text"
                                value={candidate.first_name}
                                onChange={(e) => handleDirectCandidateChange(position.id, candidate.id, "first_name", e.target.value)}
                                className={`w-full p-2 border rounded text-black ${
                                  formErrors[`candidate-fn-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                                }`}
                                placeholder="First name"
                              />
                              {formErrors[`candidate-fn-${candidate.id}`] && (
                                <p className="text-red-500 text-sm mt-1">{formErrors[`candidate-fn-${candidate.id}`]}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black mb-1">
                                Last Name 
                              </label>
                              <input
                                type="text"
                                value={candidate.last_name}
                                onChange={(e) => handleDirectCandidateChange(position.id, candidate.id, "last_name", e.target.value)}
                                className={`w-full p-2 border rounded text-black ${
                                  formErrors[`candidate-ln-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                                }`}
                                placeholder="Last name"
                              />
                              {formErrors[`candidate-ln-${candidate.id}`] && (
                                <p className="text-red-500 text-sm mt-1 text-black">{formErrors[`candidate-ln-${candidate.id}`]}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Party (Optional)
                              </label>
                              <input
                                type="text"
                                value={candidate.party}
                                onChange={(e) => handleDirectCandidateChange(position.id, candidate.id, "party", e.target.value)}
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
                                onChange={(e) => handleDirectCandidateChange(position.id, candidate.id, "slogan", e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-black"
                                placeholder="Campaign slogan"
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Platform (Optional)
                            </label>
                            <textarea
                              value={candidate.platform}
                              onChange={(e) => handleDirectCandidateChange(position.id, candidate.id, "platform", e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-black"
                              rows={3}
                              placeholder="Candidate's platform"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDeleteCandidate(position.id, candidate.id)}
                              className="text-red-600 hover:text-red-800 p-2"
                              title="Delete candidate"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleAddCandidate(position.id)}
                    className="flex items-center text-blue-600 hover:text-blue-800 mt-2"
                    disabled={loading.savingAll}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Save buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={() => router.push(`/superadmin/election/${electionId}`)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
        >
          Cancel
        </button>
        <button
          onClick={handlePreview}
          disabled={loading.savingAll}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
        >
          {loading.savingAll ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Preview & Save Changes
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Preview & Save Changes
            </>
          )}
        </button>
      </div>
      
      {previewBallot && (
        <PreviewModal
          isOpen={previewBallot}
          onClose={() => setPreviewBallot(false)}
          ballot={ballot}
          onSave={handleSaveFromPreview}
        />
      )}

      {loading.savingAll && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Processing your ballot...</p>
          </div>
        </div>
      )}
    </div>
  );
}