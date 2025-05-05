"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, AlertTriangle } from "lucide-react";
import Cookies from "js-cookie";

const API_BASE = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    } catch (e) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
  }

  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } 

  else if (contentType && (contentType.includes('image/') || contentType.includes('application/octet-stream'))) {
    return response.blob();
  }

  else if (contentType && contentType.includes('text/')) {
    return response.text();
  }

  else {
    try {
      return await response.json();
    } catch (e) {
      console.warn('Response was not JSON, returning text instead');
      return response.text();
    }
  }
}


const createBallot = async (ballotData) => {
  return fetchWithAuth('/ballots', {
    method: 'POST',
    body: JSON.stringify(ballotData)
  });
};

const getBallotByElection = async (electionId) => {
  return fetchWithAuth(`/elections/${electionId}/ballot`);
};

const updateBallotDescription = async (ballotId, description) => {
  return fetchWithAuth(`/ballots/${ballotId}/description`, {
    method: 'PUT',
    body: JSON.stringify({ description })
  });
};

const createPosition = async (ballotId, positionData) => {
  return fetchWithAuth(`/ballots/${ballotId}/positions`, {
    method: 'POST',
    body: JSON.stringify(positionData)
  });
};

const updatePosition = async (positionId, updates) => {
  return fetchWithAuth(`/ballots/positions/${positionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

const deletePosition = async (positionId) => {
  return fetchWithAuth(`/ballots/positions/${positionId}`, {
    method: 'DELETE'
  });
};

const createCandidate = async (positionId, formData) => {
  return fetchWithAuth(`/ballots/positions/${positionId}/candidates`, {
    method: 'POST',
    body: formData
  });
};

const updateCandidate = async (candidateId, updates) => {
  return fetchWithAuth(`/ballots/candidates/${candidateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

const deleteCandidate = async (candidateId) => {
  return fetchWithAuth(`/ballots/candidates/${candidateId}`, {
    method: 'DELETE'
  });
};

const PreviewModal = ({ ballot, election, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
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
                          src={`${BASE_URL}${candidate.image_url}`}
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
                      {candidate.platform && <p className="text-sm italic text-black"><span className="text-black font-bold">Description/Platform: </span> {candidate.platform}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
          >
            Back to Edit
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm & Save Ballot
          </button>
        </div>
      </div>
    </div>
  );
};

const BackConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 ">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center mb-4">
         
          <h2 className="text-xl font-semibold text-black">Confirm</h2>
        </div>
        <p className="mb-6 text-black">
          Are you sure you want to go back? Any unsaved changes will be lost.
        </p>
        <div className="flex justify-end space-x-3">
        <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Yes, Go Back
          </button>

          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
          >
            No, Stay Here
          </button>
          
        </div>
      </div>
    </div>
  );
};

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
  const [election, setElection] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    type: "",
    id: null,
    show: false
  });
  const [previewBallot, setPreviewBallot] = useState(false);
  const [imagePreviews, setImagePreviews] = useState({});
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const electionData = await fetchWithAuth(`/elections/${electionId}`);
        setElection(electionData);
        
        try {
          const ballotData = await getBallotByElection(electionId);
          setBallot({
            ...ballotData,
            positions: ballotData.positions || []
          });
        } catch (error) {
          setBallot(prev => ({
            ...prev,
            positions: [{
              id: Math.floor(Math.random() * 1000000).toString(),
              name: "",
              max_choices: 1,
              candidates: [{
                id: Math.floor(Math.random() * 1000000).toString(),
                first_name: "",
                last_name: "",
                party: "",
                slogan: "",
                platform: "",
                image_url: null
              }]
            }]
          }));
        }
      } catch (error) {
        setApiError("Failed to load data");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [electionId]);

  const validateField = (field, value) => {
    if (!value.trim()) return `${field} is required`;
    return "";
  };

  const validateImageFile = (file) => {
    if (!file) return "No file selected";
    if (!file.type.match('image.*')) return "Only image files are allowed";
    if (file.size > 2 * 1024 * 1024) return "Image must be less than 2MB";
    return null;
  };

  const handleBallotChange = async (e) => {
    const { name, value } = e.target;
    setBallot({ ...ballot, [name]: value });
    
    if (ballot.id && name === "description") {
      try {
        await updateBallotDescription(ballot.id, value);
      } catch (error) {
        setApiError("Failed to update description");
      }
    }
  };

  const handlePositionChange = async (posId, field, value) => {
    const updatedPositions = ballot.positions.map(pos => 
      pos.id === posId ? { ...pos, [field]: value } : pos
    );
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
    
    try {
      if (ballot.id) {
        await updatePosition(posId, { [field]: value });
      }
    } catch (error) {
      setApiError(`Failed to update position: ${error.message}`);
    }
  };

  const handleCandidateChange = async (posId, candId, field, value) => {
    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { ...cand, [field]: value } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
    
    try {
      if (ballot.id && field !== '_pendingImage') {
        await updateCandidate(candId, { [field]: value });
      }
    } catch (error) {
      setApiError(`Failed to update candidate: ${error.message}`);
    }
  };

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
      
 
      const imageResponse = await fetchWithAuth('/ballots/candidates/upload-image', {
        method: 'POST',
        body: formData,
        headers: {} 
      });
      
      if (!imageResponse.success || !imageResponse.filePath) {
        throw new Error('Failed to upload image');
      }

      setBallot(prev => ({
        ...prev,
        positions: prev.positions.map(pos => 
          pos.id === posId ? {
            ...pos,
            candidates: pos.candidates.map(cand =>
              cand.id === candId ? {
                ...cand,
                image_url: imageResponse.filePath
              } : cand
            )
          } : pos
        )
      }));

      URL.revokeObjectURL(previewUrl);

      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`candidate_${candId}_image`];
        return newErrors;
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors(prev => ({
        ...prev,
        [`candidate_${candId}_image`]: error.message || 'Failed to upload image'
      }));

      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[candId];
        return newPreviews;
      });
    }
  };

  const addPosition = async () => {
    try {
      setIsLoading(true);
      
      if (ballot.id) {
        const newPosition = await createPosition(ballot.id, {
          name: "",
          max_choices: 1
        });
        
        setBallot(prev => ({
          ...prev,
          positions: [
            ...prev.positions,
            {
              ...newPosition,
              candidates: []
            }
          ]
        }));
      } else {
        setBallot(prev => ({
          ...prev,
          positions: [
            ...prev.positions,
            {
              id: Math.floor(Math.random() * 1000000).toString(),
              name: "",
              max_choices: 1,
              candidates: []
            }
          ]
        }));
      }
    } catch (error) {
      setApiError(error.message);
    } finally {
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
        
        if (ballot.id) {
          await deletePosition(deleteConfirm.id);
        }
        
        setBallot(prev => ({
          ...prev,
          positions: prev.positions.filter(pos => pos.id !== deleteConfirm.id)
        }));
      } else {
        const position = ballot.positions.find(pos => 
          pos.candidates.some(c => c.id === deleteConfirm.id)
        );
        2
        if (position && position.candidates.length <= 2) {
          alert("Each position must have at least 2 candidates");
          return;
        }
        
        if (ballot.id) {
          await deleteCandidate(deleteConfirm.id);
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

  const addCandidate = async (posId) => {
    try {
      setIsLoading(true);
      
      const newCandidate = {
        id: Math.floor(Math.random() * 1000000).toString(),
        first_name: "",
        last_name: "",
        party: "",
        slogan: "",
        platform: "",
        image_url: null,
        _isNew: true
      };
  
      setBallot(prev => ({
        ...prev,
        positions: prev.positions.map(pos => 
          pos.id === posId 
            ? { ...pos, candidates: [...pos.candidates, newCandidate] } 
            : pos
        )
      }));
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCandidate = async (positionId, candidate) => {
    try {
      setIsLoading(true);
      setApiError(null);
  
      if (!candidate.first_name || !candidate.last_name) {
        throw new Error("First name and last name are required");
      }
  
      const formData = new FormData();
     
      formData.append('firstName', candidate.first_name);
      formData.append('lastName', candidate.last_name);
      formData.append('party', candidate.party || '');
      formData.append('slogan', candidate.slogan || '');
      formData.append('platform', candidate.platform || '');
      
      if (candidate._pendingImage) {
        formData.append('image', candidate._pendingImage);
        console.log('Adding image to formData:', candidate._pendingImage);
      }
  
      let response;
      if (candidate._isNew) {
        console.log('Creating new candidate with image');
        response = await fetchWithAuth(
          `/positions/${positionId}/candidates`,
          {
            method: 'POST',
            body: formData
          }
        );
      } else if (candidate._pendingImage) {
        console.log('Updating candidate with new image');
        response = await fetchWithAuth(
          `/candidates/${candidate.id}`,
          {
            method: 'PUT',
            body: formData
          }
        );
      } else {
        console.log('Updating candidate without image');
        response = await fetchWithAuth(
          `/candidates/${candidate.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              firstName: candidate.first_name,
              lastName: candidate.last_name,
              party: candidate.party,
              slogan: candidate.slogan,
              platform: candidate.platform
            })
          }
        );
      }
  
      console.log('Response from server:', response);
  
      setBallot(prev => ({
        ...prev,
        positions: prev.positions.map(pos => ({
          ...pos,
          candidates: pos.candidates.map(cand => 
            cand.id === candidate.id 
              ? { 
                  ...response.candidate, 
                  _isNew: false,
                  _pendingImage: null,
                  first_name: response.candidate.first_name || response.candidate.firstName,
                  last_name: response.candidate.last_name || response.candidate.lastName
                } 
              : cand
          )
        }))
      }));
  
 
      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[candidate.id];
        return newPreviews;
      });
  
    } catch (error) {
      setApiError(error.message);
      console.error("Candidate save error:", error);
    } finally {
      setIsLoading(false);
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
      
      // Check if position has at least 2 candidates
      if (pos.candidates.length < 2) {
        newErrors[`position-${pos.id}-candidates`] = "At least 2 candidates are required per position";
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
      // Check specifically for positions with insufficient candidates
      const positionsWithTooFewCandidates = ballot.positions.filter(pos => pos.candidates.length < 2);
      
      if (positionsWithTooFewCandidates.length > 0) {
        setApiError(`Each position must have at least 2 candidates. Please add more candidates to ${positionsWithTooFewCandidates.map(p => p.name || 'unnamed position').join(', ')}.`);
        window.scrollTo(0, 0);
      }
      return;
    }
    
    setApiError(null);
    setPreviewBallot(true);
  };

  const handleSubmit = async () => {
    try {
      setPreviewBallot(false);
      setIsLoading(true);
      setApiError(null);


      for (const position of ballot.positions) {
        for (const candidate of position.candidates) {
          if (candidate._isNew || candidate._pendingImage) {
            await saveCandidate(position.id, candidate);
          }
        }
      }

      const apiData = {
        election_id: ballot.election_id,
        description: ballot.description,
        positions: ballot.positions.map(pos => ({
          name: pos.name,
          max_choices: pos.max_choices,
          candidates: pos.candidates.map(cand => ({
            id: cand.id,
            first_name: cand.first_name,
            last_name: cand.last_name,
            party: cand.party,
            slogan: cand.slogan,
            platform: cand.platform,
            image_url: cand.image_url
          }))
        }))
      };
      
      let response;
      try {
        if (ballot.id) {
          response = await fetchWithAuth(`/ballots/${ballot.id}`, {
            method: 'PUT',
            body: JSON.stringify(apiData)
          });
        } else {
          response = await fetchWithAuth('/ballots', {
            method: 'POST',
            body: JSON.stringify(apiData)
          });
        }
      
        setIsLoading(false);
        setPreviewBallot(false);
        
      
        setTimeout(() => {
          
          document.location.href = '/superadmin';
        }, 100);
        
      } catch (apiError) {
       
        if (apiError.message !== "Ballot created successfully") {
          throw apiError;
        }
        
        
        setIsLoading(false);
        
       
        setTimeout(() => {
          document.location.href = '/superadmin';
        }, 100);
      }
    } catch (error) {
      
      if (error.message !== "Ballot created successfully") {
        setApiError(error.message || "An unexpected error occurred");
        window.scrollTo(0, 0);
      } else {
        setTimeout(() => {
          document.location.href = '/superadmin';
        }, 100);
      }
      setIsLoading(false);
    }
  };

  if (!election) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {previewBallot && (
        <PreviewModal
          ballot={ballot}
          election={election}
          onConfirm={handleSubmit}
          onCancel={() => setPreviewBallot(false)}
        />
      )}

      {showBackConfirmation && (
        <BackConfirmationModal
          onConfirm={() => router.back()}
          onCancel={() => setShowBackConfirmation(false)}
        />
      )}

      <div className="flex items-center mb-6">
        <button 
          onClick={() => setShowBackConfirmation(true)}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create Ballot</h1>
          <p className="text-sm text-gray-600">For election: {election.title}</p>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {apiError}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ballot Description
        </label>
        <textarea
          name="description"
          value={ballot.description}
          onChange={handleBallotChange}
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
                            src={`${BASE_URL}${candidate.image_url}`}
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
                            const file = e.target.files[0];
                            handleImageUpload(position.id, candidate.id, file);
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
                    {/*
                    {candidate._isNew && (
                      <button
                        onClick={() => saveCandidate(position.id, candidate)}
                        disabled={isLoading || !candidate.first_name || !candidate.last_name}
                        className={`mt-3 px-3 py-1 text-sm rounded ${
                          isLoading || !candidate.first_name || !candidate.last_name
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isLoading ? 'Saving...' : 'Save Candidate'}
                      </button>
                    )}
                                          */}

                  </div>
                  <button
                    onClick={() => confirmDelete("candidate", candidate.id)}
                    className="ml-4 text-red-600 hover:text-red-800 p-2"
                    title="Delete candidate"
                    disabled={position.candidates.length <= 2}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => addCandidate(position.id)}
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
          onClick={addPosition}
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