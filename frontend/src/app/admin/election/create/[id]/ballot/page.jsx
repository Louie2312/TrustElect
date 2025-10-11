"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, AlertTriangle, X, CheckCircle, Info } from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useMrMsSTIPositions } from './components/MrMsSTIPositionManager';
import MrMsSTIPositionSelector from './components/MrMsSTIPositionSelector';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const studentCouncilPositionOrder = {
  "President": 1,
  "Vice President": 2,
  "Secretary": 3,
  "Treasurer": 4,
  "Auditor": 5,
  "Public Relations Officer": 6,
  "PRO": 6, // Alias for Public Relations Officer
  "Business Manager": 7,
  "Sergeant at Arms": 8
};

// Mr/Ms STI position order for sorting
const mrMsSTIPositionOrder = {
  "Mr. STI": 1,
  "Ms. STI": 2,
  "Mr. STI 1st Runner-up": 3,
  "Ms. STI 1st Runner-up": 4,
  "Mr. STI 2nd Runner-up": 5,
  "Ms. STI 2nd Runner-up": 6
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

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get("token");
  const apiBase = API_BASE || '/api';
  
  // Ensure URL starts with /api if API_BASE is empty
  const fullUrl = url.startsWith('/api') ? url : `${apiBase}${url}`;
  
  const defaultHeaders = {
    "Authorization": `Bearer ${token}`
  };
  
  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      if (response.status === 404 && errorMessage.includes('No ballot found')) {
        return null; // This is expected for new elections
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`API call failed for ${fullUrl}:`, error);
    throw error;
  }
}


const createBallot = async (ballotData) => {
  return fetchWithAuth('/api/ballots', {
    method: 'POST',
    body: JSON.stringify(ballotData)
  });
};

const getBallotByElection = async (electionId) => {
  try {
    const response = await fetchWithAuth(`/api/ballots/election/${electionId}`);
    return response;
  } catch (error) {
    console.error('Error fetching ballot:', error);
    throw error;
  }
};

const createPosition = async (ballotId, positionData) => {
  return fetchWithAuth(`/api/ballots/${ballotId}/positions`, {
    method: 'POST',
    body: JSON.stringify(positionData)
  });
};

const updatePosition = async (positionId, updates) => {
  return fetchWithAuth(`/api/ballots/positions/${positionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

const deletePosition = async (positionId) => {
  return fetchWithAuth(`/api/ballots/positions/${positionId}`, {
    method: 'DELETE'
  });
};

const createCandidate = async (positionId, formData) => {
  return fetchWithAuth(`/api/ballots/positions/${positionId}/candidates`, {
    method: 'POST',
    body: formData
  });
};

const updateCandidate = async (candidateId, updates) => {
  return fetchWithAuth(`/api/ballots/candidates/${candidateId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

const deleteCandidate = async (candidateId) => {
  return fetchWithAuth(`/api/ballots/candidates/${candidateId}`, {
    method: 'DELETE'
  });
};

const PreviewModal = ({ ballot, election, onConfirm, onCancel, isMrMsSTIElection }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-black">Ballot Preview</h2>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 text-black">Election Details</h3>
          <p className="text-lg font-medium text-black">Title: {election.title}</p>
          <p className="text-black mb-2">{election.description || "No description provided"}</p>
          <p className="text-black">
            {new Date(election.date_from).toLocaleDateString()} - {new Date(election.date_to).toLocaleDateString()}
          </p>
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
                      {(() => {
                        try {
                          const isGroup = isMrMsSTIElection === true && (
                            (candidateTypes && candidateTypes[candidate.id] === 'group') || 
                            (candidate.first_name && !candidate.last_name)
                          );
                          const isSymposium = isSymposiumElection === true;
                          return isGroup || isSymposium;
                        } catch (error) {
                          console.warn('Error checking candidate type:', error);
                          return false;
                        }
                      })() ? (
                        <p className="font-medium text-black">
                          <span className="text-black font-bold">
                            {isSymposiumElection ? 'Project Title:' : 'Group/Band Name:'}
                          </span> {candidate.first_name}
                        </p>
                      ) : (
                        <p className="font-medium text-black"><span className="text-black font-bold">Full Name:</span> {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}</p>
                      )}
                      {(isMrMsSTIElection !== true) && !isSymposiumElection && candidate.party && <p className="text-black"><span className="text-black font-bold">Partylist:</span> {candidate.party}</p>}
                  
                      {(isMrMsSTIElection !== true) && !isSymposiumElection && candidate.slogan && <p className="text-sm  text-black"><span className="text-black font-bold">Slogan:</span>{candidate.slogan}</p>}
                      {(isMrMsSTIElection !== true) && candidate.platform && <p className="text-sm text-black"><span className="text-black font-bold">{isSymposiumElection ? 'Project Description:' : 'Description/Platform:'} </span> {candidate.platform}</p>}
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
          Are you sure you want to exit this page?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-black"
          >
            No
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Yes
          </button>
          
        </div>
      </div>
    </div>
  );
};


const PartylistSelectionModal = ({ partylists, onSelect, onCancel, currentPosition, currentStudent }) => {
  const [partylistCandidates, setPartylistCandidates] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [filteredPartylists, setFilteredPartylists] = useState([]);

  useEffect(() => {
    const fetchPartylistCandidates = async () => {
      setIsLoading(true);
      try {
        const token = Cookies.get("token");
        
        // If student is selected, fetch their partylist directly
        if (currentStudent && currentStudent.student_number) {
          try {
            const response = await axios.get(
              `/api/partylist-candidates/student/${currentStudent.student_number}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              }
            );
            
            
            if (response.data.success && response.data.data) {
              // Student is in a partylist
              const studentPartylist = response.data.data;
              setFilteredPartylists([studentPartylist]);
            } else {
              // Student is not in any partylist
              setFilteredPartylists([{ name: "Independent", slogan: "", advocacy: "" }]);
            }
          } catch (error) {
            console.error('Error fetching student partylist:', error);
            // If there's an error, show Independent
            setFilteredPartylists([{ name: "Independent", slogan: "", advocacy: "" }]);
          }
        } else {
          // No student selected, fetch all partylists and their candidates
          const candidatesPromises = partylists.map(async (party) => {
            if (!party || party.name === "Independent") return null;
            const response = await axios.get(
              `/api/partylist-candidates/${party.id}/candidates`,
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              }
            );
            return {
              partylistId: party.id,
              candidates: response.data.candidates || []
            };
          });

          const results = await Promise.all(candidatesPromises);
          const candidatesMap = {};
          results.forEach(result => {
            if (result) {
              candidatesMap[result.partylistId] = result.candidates;
            }
          });
          setPartylistCandidates(candidatesMap);
          setFilteredPartylists([...partylists, { name: "Independent", slogan: "", advocacy: "" }]);
        }
      } catch (error) {
        console.error("Error fetching partylist candidates:", error);
        // On error, show all partylists
        setFilteredPartylists([...partylists, { name: "Independent", slogan: "", advocacy: "" }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartylistCandidates();
  }, [partylists, currentStudent]);

  const getCandidateForPosition = (partylist) => {
    if (!partylist || partylist.name === "Independent") return null;
    const candidates = partylistCandidates[partylist.id] || [];
    return candidates.find(c => 
      !c.is_representative && 
      c.position && 
      c.position.toLowerCase() === currentPosition.toLowerCase()
    );
  };

  const handlePartylistClick = (partylist) => {
    if (!partylist) return;
    const candidate = getCandidateForPosition(partylist);
    onSelect({
      ...partylist,
      candidate: candidate || null
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">Select a Partylist</h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {filteredPartylists.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No partylists found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartylists.map(party => {
              const candidate = getCandidateForPosition(party);
              return (
                <div 
                  key={party.id || 'independent'} 
                  className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handlePartylistClick(party)}
                >
                  <div className="flex items-start">
                    <div className="mr-4">
                      {party.logo_url ? (
                        <img 
                          src={`${BASE_URL}${party.logo_url}`} 
                          alt={`${party.name} logo`} 
                          className="w-24 h-24 object-contain rounded-md border p-1"
                          onError={(e) => {
                            e.target.src = '/placeholder-logo.png';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-md border flex items-center justify-center">
                          <Info className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-black">{party.name}</h3>
                      {party.slogan && (
                        <p className="text-sm text-black mb-2">{party.slogan}</p>
                      )}
                      {candidate && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-800">
                            {currentPosition}: {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-2">
                      <button className="p-2 bg-blue-50 rounded-full text-blue-600 hover:bg-blue-100">
                        <CheckCircle size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
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
  const [isStudentCouncilElection, setIsStudentCouncilElection] = useState(false);
  const [isMrMsSTIElection, setIsMrMsSTIElection] = useState(false);
  const [isSymposiumElection, setIsSymposiumElection] = useState(false);
  const [studentCouncilPositions, setStudentCouncilPositions] = useState([]);
  const [partylists, setPartylists] = useState([]);
  const [partylistCandidates, setPartylistCandidates] = useState({});
  const [showPartylistModal, setShowPartylistModal] = useState(false);
  const [currentEditingCandidate, setCurrentEditingCandidate] = useState({ posId: null, candId: null });
  const [allStudents, setAllStudents] = useState([]);
  const [firstNameSuggestions, setFirstNameSuggestions] = useState([]);
  const [lastNameSuggestions, setLastNameSuggestions] = useState([]);
  const [showFirstNameSuggestions, setShowFirstNameSuggestions] = useState(false);
  const [showLastNameSuggestions, setShowLastNameSuggestions] = useState(false);
  const [studentNumberSuggestions, setStudentNumberSuggestions] = useState([]);
  const [showStudentNumberSuggestions, setShowStudentNumberSuggestions] = useState(false);
  const [activeInput, setActiveInput] = useState({ posId: null, candId: null, field: null });
  const [candidateTypes, setCandidateTypes] = useState(() => {
    // Initialize with empty object to ensure it's always defined
    try {
      return {};
    } catch (error) {
      console.warn('Error initializing candidateTypes:', error);
      return {};
    }
  }); // Track candidate type for each candidate
  
  // Safety check to ensure candidateTypes is always defined
  const safeCandidateTypes = candidateTypes || {};
  
  // Helper function to get candidate type safely
  const getCandidateType = (candidateId) => {
    if (!candidateId) return 'individual';
    if (!candidateTypes || typeof candidateTypes !== 'object') return 'individual';
    return candidateTypes[candidateId] || 'individual';
  };
  

  // Mr/Ms STI positions hook
  const { mrMsSTIPositions, fetchMrMsSTIPositions, mrMsSTIPositionOrder } = useMrMsSTIPositions();

  // Ensure candidateTypes is always properly initialized
  useEffect(() => {
    if (!candidateTypes || typeof candidateTypes !== 'object') {
      setCandidateTypes({});
    }
  }, []);

  useEffect(() => {
    const fetchStudentCouncilPositions = async () => {
      try {
        const token = Cookies.get("token");

        const typesResponse = await axios.get('/api/maintenance/election-types', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        let studentCouncilTypeId = null;
        if (typesResponse.data.success && typesResponse.data.data) {
          const scType = typesResponse.data.data.find(type => 
            type.name.toLowerCase() === "student council"
          );
          if (scType) {
            studentCouncilTypeId = scType.id;
          }
        }

        if (studentCouncilTypeId) {
          const response = await axios.get(`/api/direct/positions?electionTypeId=${studentCouncilTypeId}`, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
          
          if (response.data.success && response.data.data && response.data.data.length > 0) {
            const scPositions = response.data.data;
            const positionNames = scPositions.map(pos => pos.name);
            positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
            setStudentCouncilPositions(positionNames);
            return;
          }
        }

        const response = await axios.get('/api/direct/positions', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.success && response.data.data) {
          const allPositions = response.data.data;

          const scPositions = allPositions.filter(pos => 
            ["president", "vice president", "secretary", "treasurer", "auditor", "vp", "pro", "public relations officer", "business manager", "sergeant at arms"].some(
              term => pos.name.toLowerCase().includes(term)
            )
          );
          
          if (scPositions.length > 0) {
            const positionNames = scPositions.map(pos => pos.name);
            positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
            setStudentCouncilPositions(positionNames);
            return;
          }
        }

        tryLocalStorageForPositions();
      } catch (error) {
        console.error("Error fetching positions from API:", error);

        tryLocalStorageForPositions();
      }
    };
    
    const tryLocalStorageForPositions = () => {
      try {
        const allPositionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');

        const electionTypes = JSON.parse(localStorage.getItem('election_types') || '[]');
        const scType = electionTypes.find(type => 
          type.name && type.name.toLowerCase() === "student council"
        );
        
        let scPositions = [];

        if (scType && scType.id && allPositionsData[scType.id]) {
          scPositions = allPositionsData[scType.id];
        } else {

          // Go through each election type to find Student Council positions
          Object.values(allPositionsData).forEach(positionsArray => {
            if (Array.isArray(positionsArray) && positionsArray.length > 0) {

              const foundSCPositions = positionsArray.filter(pos => 
                ["president", "vice president", "secretary", "treasurer", "auditor", "vp", "pro", "public relations officer", "business manager", "sergeant at arms"].some(
                  term => pos.name && pos.name.toLowerCase().includes(term)
                )
              );
              
              if (foundSCPositions.length > 0) {
              
                scPositions = [...scPositions, ...foundSCPositions];
              }
            }
          });
        }
        
        // If we found SC positions, extract their names and sort them
        if (scPositions.length > 0) {
          const positionNames = scPositions.map(pos => pos.name);
          positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
          setStudentCouncilPositions(positionNames);
        } else {

          setStudentCouncilPositions([ 
            "President",
            "Vice President",
            "Secretary",
            "Treasurer",
            "Auditor",
            "Public Relations Officer",
            "Business Manager",
            "Sergeant at Arms"
          ].sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999)));
        }
      } catch (error) {
        console.error("Error loading Student Council positions from localStorage:", error);
        // Fallback to default positions if local storage fails, also sorted
        setStudentCouncilPositions([
          "President",
          "Vice President",
          "Secretary",
          "Treasurer",
          "Auditor",
          "Public Relations Officer",
          "Business Manager",
          "Sergeant at Arms"
        ].sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999)));
      }
    };
    
    fetchStudentCouncilPositions();
  }, []);

  useEffect(() => {
    const fetchPartylists = async () => {
      try {
        const token = Cookies.get("token");
        const response = await axios.get(
          '/api/partylists',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          const partylistData = response.data.data || [];
          setPartylists(partylistData);

          const candidatesMap = {};
          partylistData.forEach(party => {
  
            const savedCandidates = localStorage.getItem(`partylist_candidates_${party.id}`);
            if (savedCandidates) {
              candidatesMap[party.id] = JSON.parse(savedCandidates);
            } else {
              candidatesMap[party.id] = [];
            }
          });
          
          setPartylistCandidates(candidatesMap);
        }
      } catch (error) {
        console.error("Error fetching partylists:", error);

        setPartylists([]);
      }
    };

    fetchPartylists();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!electionId) {
        setApiError("No election ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setApiError(null);
        
        // Fetch election data
        const electionData = await fetchWithAuth(`/api/elections/${electionId}`);
        if (!electionData) {
          throw new Error("Election not found");
        }
        
        setElection(electionData);
        
        if (electionData.election_type === "Student Council") {
          setIsStudentCouncilElection(true);
        } else if (electionData.election_type && 
                   electionData.election_type.toLowerCase().includes("mr") && 
                   electionData.election_type.toLowerCase().includes("ms") && 
                   electionData.election_type.toLowerCase().includes("sti")) {
          setIsMrMsSTIElection(true);
          // Fetch Mr/Ms STI positions when this election type is detected
          // The hook will auto-fetch, but we can also call it explicitly
          fetchMrMsSTIPositions();
        } else if (electionData.election_type && 
                   electionData.election_type.toLowerCase().includes("symposium")) {
          setIsSymposiumElection(true);
        }
        
        // Try to fetch existing ballot
        try {
          const ballotData = await getBallotByElection(electionId);
          if (ballotData && ballotData.positions) {
            const positions = ballotData.positions || [];
            
            // Sort positions if it's a student council election
            if (electionData.election_type === "Student Council") {
              positions.sort((a, b) => (studentCouncilPositionOrder[a.name] || 999) - (studentCouncilPositionOrder[b.name] || 999));
            } else if (isMrMsSTIElection === true) {
              positions.sort((a, b) => (mrMsSTIPositionOrder[a.name] || 999) - (mrMsSTIPositionOrder[b.name] || 999));
            }
            
            setBallot({
              ...ballotData,
              positions
            });
            
            // Initialize candidate types for existing candidates
            if (isMrMsSTIElection === true) {
              const initialCandidateTypes = {};
              positions.forEach(pos => {
                pos.candidates.forEach(cand => {
                  // Default to individual for existing candidates
                  initialCandidateTypes[cand.id] = 'individual';
                });
              });
              setCandidateTypes(initialCandidateTypes);
            }
          } else {
            // No existing ballot, create default structure
            createDefaultBallotStructure(electionData.election_type);
          }
        } catch (ballotError) {
          createDefaultBallotStructure(electionData.election_type);
        }
      } catch (error) {
        console.error("Error loading election data:", error);
        setApiError(error.message || "Failed to load election data");
      } finally {
        setIsLoading(false);
      }
    };

    const createDefaultBallotStructure = (electionType) => {
      if (electionType === "Student Council") {
        const defaultPositions = [
          "President", "Vice President", "Secretary", "Treasurer", 
          "Auditor", "Public Relations Officer", "Business Manager", "Sergeant at Arms"
        ];
        
        const sortedPositions = defaultPositions.sort(
          (a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999)
        );
        
        setBallot(prev => ({
          ...prev,
          positions: [{
            id: Math.floor(Math.random() * 1000000).toString(),
            name: sortedPositions[0],
            max_choices: 1,
            candidates: [{
              id: Math.floor(Math.random() * 1000000).toString(),
              first_name: "",
              last_name: "",
              student_number: "",
              course: "",
              party: "",
              slogan: "",
              platform: "",
              image_url: null
            }]
          }]
        }));
      } else if (electionType && 
                 electionType.toLowerCase().includes("mr") && 
                 electionType.toLowerCase().includes("ms") && 
                 electionType.toLowerCase().includes("sti")) {
        const defaultPositions = [
          "Mr. STI", "Ms. STI", "Mr. STI 1st Runner-up", "Ms. STI 1st Runner-up"
        ];
        
        const sortedPositions = defaultPositions.sort(
          (a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999)
        );
        
        setBallot(prev => ({
          ...prev,
          positions: [{
            id: Math.floor(Math.random() * 1000000).toString(),
            name: sortedPositions[0],
            max_choices: 1,
            candidates: [{
              id: Math.floor(Math.random() * 1000000).toString(),
              first_name: "",
              last_name: "",
              student_number: "",
              course: "",
              party: "",
              slogan: "",
              platform: "",
              image_url: null
            }]
          }]
        }));
      } else {
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
              student_number: "",
              course: "",
              party: "",
              slogan: "",
              platform: "",
              image_url: null
            }]
          }]
        }));
      }
    };

    loadData();
  }, [electionId]);

  const reloadStudentCouncilPositions = async () => {
    try {
      const token = Cookies.get("token");
      
      const studentCouncilPositionOrder = {
        "President": 1,
        "Vice President": 2,
        "Secretary": 3,
        "Treasurer": 4,
        "Auditor": 5,
        "Public Relations Officer": 6,
        "PRO": 6,
        "Business Manager": 7,
        "Sergeant at Arms": 8
      };

      const typesResponse = await axios.get('/api/maintenance/election-types', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      let studentCouncilTypeId = null;
      if (typesResponse.data.success && typesResponse.data.data) {
        const scType = typesResponse.data.data.find(type => 
          type.name.toLowerCase() === "student council"
        );
        if (scType) {
          studentCouncilTypeId = scType.id;
        }
      }

      if (studentCouncilTypeId) {
        const response = await axios.get(`/api/direct/positions?electionTypeId=${studentCouncilTypeId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const scPositions = response.data.data;
          const positionNames = scPositions.map(pos => pos.name);
          positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
          setStudentCouncilPositions(positionNames);
          return true;
        }
      }

      const response = await axios.get('/api/direct/positions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        const allPositions = response.data.data;
        
     
        const scPositions = allPositions.filter(pos => 
          ["president", "vice president", "secretary", "treasurer", "auditor", "vp", "pro", "public relations officer", "business manager", "sergeant at arms"].some(
            term => pos.name.toLowerCase().includes(term)
          )
        );
        
        if (scPositions.length > 0) {
          const positionNames = scPositions.map(pos => pos.name);
          positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
          setStudentCouncilPositions(positionNames);
          return true;
        }
      }

      const allPositionsData = JSON.parse(localStorage.getItem('electionPositions') || '{}');
      let foundPositions = false;
      
      // Try to find the Student Council type ID in localStorage
      const electionTypes = JSON.parse(localStorage.getItem('election_types') || '[]');
      const scType = electionTypes.find(type => 
        type.name && type.name.toLowerCase() === "student council"
      );
      
      // If we found the SC type, check for its positions directly
      if (scType && scType.id && allPositionsData[scType.id]) {
        const scPositions = allPositionsData[scType.id];
        const positionNames = scPositions.map(pos => pos.name);
        positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
        setStudentCouncilPositions(positionNames);
        return true;
      }
      
      // Otherwise search all positions
      Object.values(allPositionsData).forEach(positionsArray => {
        if (!foundPositions && Array.isArray(positionsArray) && positionsArray.length > 0) {
          // Filter positions that match common Student Council position names
          const foundSCPositions = positionsArray.filter(pos => 
            ["president", "vice president", "secretary", "treasurer", "auditor", "vp", "pro", "public relations officer", "business manager", "sergeant at arms"].some(
              term => pos.name && pos.name.toLowerCase().includes(term)
            )
          );
          
          if (foundSCPositions.length > 0) {
            const positionNames = foundSCPositions.map(pos => pos.name);
            positionNames.sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
            setStudentCouncilPositions(positionNames);
            foundPositions = true;
          }
        }
      });
      
      return foundPositions;
    } catch (error) {
      console.error("Error reloading Student Council positions:", error);
      return false;
    }
  };

  const validateField = (field, value) => {
    if (!value.trim()) return `${field} is required`;
    return "";
  };

  const validateImageFile = (file) => {
    if (!file) return "No file selected";
    if (!file.type.match('image.*')) return "Only image files are allowed";
    if (file.size > 5 * 1024 * 1024) return "Image must be less than 5MB";
    return null;
  };

  // Image compression function
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          file.type,
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleBallotChange = async (e) => {
    const { name, value } = e.target;
    setBallot({ ...ballot, [name]: value });
  };

  const handlePositionChange = async (posId, field, value) => {
    const updatedPositions = ballot.positions.map(pos => 
      pos.id === posId ? { ...pos, [field]: value } : pos
    );
    
    // Sort positions if it's a student council election and we're changing the name
    if (isStudentCouncilElection && field === "name") {
      updatedPositions.sort((a, b) => (studentCouncilPositionOrder[a.name] || 999) - (studentCouncilPositionOrder[b.name] || 999));
    } else if (isMrMsSTIElection === true && field === "name") {
      updatedPositions.sort((a, b) => (mrMsSTIPositionOrder[a.name] || 999) - (mrMsSTIPositionOrder[b.name] || 999));
    }
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
    
    try {
      if (ballot.id) {
        await updatePosition(posId, { [field]: value });
      }
    } catch (error) {
      setApiError(`Failed to update position: ${error.message}`);
    }
  };

  const handlePartylistChange = (posId, candId, value) => {
    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { ...cand, party: value } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
  };

  const fetchNameSuggestions = (searchTerm, type, posId, candId) => {
    if (!searchTerm || searchTerm.length < 2) {
      if (type === 'firstName') {
        setFirstNameSuggestions([]);
        setShowFirstNameSuggestions(false);
      } else {
        setLastNameSuggestions([]);
        setShowLastNameSuggestions(false);
      }
      return;
    }
    
    try {
      const matchingStudents = allStudents.filter(student => {
        if (type === 'firstName') {
          return student.first_name.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return student.last_name.toLowerCase().includes(searchTerm.toLowerCase());
        }
      }).slice(0, 10);

      if (type === 'firstName') {
        setFirstNameSuggestions(matchingStudents);
        setShowFirstNameSuggestions(matchingStudents.length > 0);
      } else {
        setLastNameSuggestions(matchingStudents);
        setShowLastNameSuggestions(matchingStudents.length > 0);
      }
    } catch (error) {
      console.error("Error filtering name suggestions:", error);
      if (type === 'firstName') {
        setFirstNameSuggestions([]);
        setShowFirstNameSuggestions(false);
      } else {
        setLastNameSuggestions([]);
        setShowLastNameSuggestions(false);
      }
    }
  };

  const fetchStudentNumberSuggestions = (searchTerm, posId, candId) => {
    if (!searchTerm || searchTerm.length < 2) {
      setStudentNumberSuggestions([]);
      setShowStudentNumberSuggestions(false);
      return;
    }
    try {
      const matchingStudents = allStudents.filter(student =>
        student.student_number.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10);

      setStudentNumberSuggestions(matchingStudents);
      setShowStudentNumberSuggestions(matchingStudents.length > 0);
    } catch (error) {
      console.error("Error filtering student number suggestions:", error);
      setStudentNumberSuggestions([]);
      setShowStudentNumberSuggestions(false);
    }
  };

  const selectNameSuggestion = (student, type, posId, candId) => {
    // Check if this student is already a candidate in any position
    const isDuplicate = ballot.positions.some(pos => 
      pos.candidates.some(cand => 
        cand.id !== candId && 
        cand.first_name.toLowerCase() === student.first_name.toLowerCase() && 
        cand.last_name.toLowerCase() === student.last_name.toLowerCase()
      )
    );

    if (isDuplicate) {
      setErrors(prev => ({
        ...prev,
        [`candidate-${candId}-duplicate`]: 'This candidate is already a candidate'
      }));
      return;
    }

    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { 
          ...cand, 
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          course: student.course_name
        } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
    
    if (type === 'firstName') {
      setShowFirstNameSuggestions(false);
    } else {
      setShowLastNameSuggestions(false);
    }
  };

  const selectStudentNumberSuggestion = (student, posId, candId) => {
    // Check if this student (by student_id or student_number) is already a candidate in any position
    const isDuplicate = ballot.positions.some(pos =>
      pos.candidates.some(cand =>
        cand.id !== candId &&
        (cand.student_id === student.id || cand.student_number === student.student_number)
      )
    );

    if (isDuplicate) {
      setErrors(prev => ({
        ...prev,
        [`candidate-${candId}-duplicate`]: 'This student is already a candidate in another position or this position.'
      }));
      // Do not update other fields if it's a duplicate
      return;
    }

    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand =>
        cand.id === candId ? {
          ...cand,
          student_id: student.id, // Store student ID
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
          course: student.course_name,
          // Clear any previous name errors if a valid student is selected
          [`candidate-fn-${cand.id}`]: undefined,
          [`candidate-ln-${cand.id}`]: undefined,
          [`candidate-validation-${cand.id}`]: undefined,
          [`candidate-duplicate-${cand.id}`]: undefined,
        } : cand
      )
    }));

    setBallot(prev => ({ ...prev, positions: updatedPositions }));

    // Clear suggestions
    setShowStudentNumberSuggestions(false);
    setStudentNumberSuggestions([]);
    setShowFirstNameSuggestions(false);
    setFirstNameSuggestions([]);
    setShowLastNameSuggestions(false);
    setLastNameSuggestions([]);

    // Clear specific errors related to name/student number if student is valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`candidate-fn-${candId}`];
      delete newErrors[`candidate-ln-${candId}`];
      delete newErrors[`candidate-sn-${candId}`];
      delete newErrors[`candidate-${candId}-validation`];
      delete newErrors[`candidate-${candId}-duplicate`];
      return newErrors;
    });
  };

  const handleCandidateTypeChange = (posId, candId, candidateType) => {
    try {
      setCandidateTypes(prev => {
        const currentTypes = prev || {};
        return {
          ...currentTypes,
          [candId]: candidateType
        };
      });
    } catch (error) {
      console.warn('Error updating candidate type:', error);
    }

    // Clear student-specific fields when switching to group
    if (candidateType === 'group') {
      const updatedPositions = ballot.positions.map(pos => ({
        ...pos,
        candidates: pos.candidates.map(cand => 
          cand.id === candId ? { 
            ...cand, 
            student_number: '', 
            course: '', 
            student_id: null 
          } : cand
        )
      }));
      setBallot(prev => ({ ...prev, positions: updatedPositions }));
    }
  };

  const handleCandidateChange = async (posId, candId, field, value) => {
    if (field === "party") {
      return;
    }
    
    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { ...cand, [field]: value } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));

    if (field === 'first_name' || field === 'last_name') {
      const candidate = updatedPositions.find(pos => 
        pos.candidates.some(c => c.id === candId)
      )?.candidates.find(c => c.id === candId);

      // Only clear student_number and course if the current candidate had a student_number
      // and the user is manually typing name fields.
      if (candidate && (field === 'first_name' || field === 'last_name') && candidate.student_number) {
          // Clear student number and course if names are being manually edited after auto-fill
          // This allows users to override auto-filled data.
          const finalUpdatedPositions = updatedPositions.map(pos => ({
              ...pos,
              candidates: pos.candidates.map(c =>
                  c.id === candId ? { ...c, student_number: '', course: '', student_id: null } : c
              )
          }));
          setBallot(prev => ({ ...prev, positions: finalUpdatedPositions }));
      }


      if (candidate && candidate.first_name && candidate.last_name) {
        // Check for duplicate candidates by name (only if student_number is not set)
        const allCandidates = updatedPositions.flatMap(pos => pos.candidates);
        const duplicateCount = allCandidates.filter(cand => 
          cand.id !== candId && 
          !cand.student_number && // Only check by name if no student_number is set
          cand.first_name.toLowerCase() === candidate.first_name.toLowerCase() && 
          cand.last_name.toLowerCase() === candidate.last_name.toLowerCase()
        ).length;

        if (duplicateCount > 0) {
          setErrors(prev => ({
            ...prev,
            [`candidate-${candId}-duplicate`]: 'This candidate (by name) is already a candidate.'
          }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`candidate-${candId}-duplicate`];
            return newErrors;
          });
        }
        // Also validate if student exists if first and last name are filled
        validateStudentExists(candidate.first_name, candidate.last_name, candId);
      } else {
         // Clear validation error if names are incomplete
         setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`candidate-${candId}-validation`];
            delete newErrors[`candidate-${candId}-duplicate`];
            return newErrors;
         });
      }
    } else if (field === 'student_number') {
        setActiveInput({ posId, candId, field: 'student_number' });
        fetchStudentNumberSuggestions(value, posId, candId);
        // If student number is cleared, also clear first name, last name, and course
        if (!value.trim()) {
            const finalUpdatedPositions = updatedPositions.map(pos => ({
                ...pos,
                candidates: pos.candidates.map(c =>
                    c.id === candId ? { ...c, first_name: '', last_name: '', course: '', student_id: null } : c
                )
            }));
            setBallot(prev => ({ ...prev, positions: finalUpdatedPositions }));
            // Clear any student number related errors
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[`candidate-sn-${candId}`];
              delete newErrors[`candidate-${candId}-validation`];
              delete newErrors[`candidate-${candId}-duplicate`];
              return newErrors;
            });
        }
    } else {
        // If user manually types name or other fields, clear student number suggestions
        // (already handled by onBlur, but good to ensure)
        if (activeInput.posId === posId && activeInput.candId === candId && activeInput.field === 'student_number') {
            setShowStudentNumberSuggestions(false);
        }
    }
    
    try {
      if (ballot.id && field !== '_pendingImage') {
        // When saving, if a student_id is present, send that. Otherwise, send individual fields.
        const candidateToUpdate = updatedPositions.find(p => p.id === posId)
                                  .candidates.find(c => c.id === candId);
        await updateCandidate(candId, {
            first_name: candidateToUpdate.first_name,
            last_name: candidateToUpdate.last_name,
            student_number: candidateToUpdate.student_number,
            course: candidateToUpdate.course,
            party: candidateToUpdate.party,
            slogan: candidateToUpdate.slogan,
            platform: candidateToUpdate.platform,
            student_id: candidateToUpdate.student_id || null,
        });
      }
    } catch (error) {
      setApiError(`Failed to update candidate: ${error.message}`);
    }
  };

  const handleImageUpload = async (posId, candId, file) => {
    try {
      // Validate file first
      const validationError = validateImageFile(file);
      if (validationError) {
        setErrors(prev => ({
          ...prev,
          [`candidate_${candId}_image`]: validationError
        }));
        return;
      }

      // Show loading state
      setErrors(prev => ({
        ...prev,
        [`candidate_${candId}_image`]: 'Compressing and uploading image...'
      }));

      // Compress image if it's larger than 2MB
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) { // 2MB
        processedFile = await compressImage(file, 1000, 0.8);
      }

      // Create preview
      const previewUrl = URL.createObjectURL(processedFile);
      setImagePreviews(prev => ({
        ...prev,
        [candId]: previewUrl
      }));

      // Prepare form data
      const formData = new FormData();
      formData.append('image', processedFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const imageResponse = await fetchWithAuth('/api/ballots/candidates/upload-image', {
          method: 'POST',
          body: formData,
          headers: {},
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        
        if (!imageResponse.success || !imageResponse.filePath) {
          throw new Error(imageResponse.message || 'Failed to upload image');
        }

        // Update ballot with new image URL
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

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);

        // Clear errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`candidate_${candId}_image`];
          return newErrors;
        });

        toast.success('Image uploaded successfully!');
      } catch (uploadError) {
        clearTimeout(timeoutId);
        throw uploadError;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      
      let errorMessage = 'Failed to upload image';
      if (error.name === 'AbortError') {
        errorMessage = 'Upload timeout - please try a smaller image';
      } else if (error.message.includes('413')) {
        errorMessage = 'Image too large - please use a smaller image (max 5MB)';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors(prev => ({
        ...prev,
        [`candidate_${candId}_image`]: errorMessage
      }));

      // Clean up preview
      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[candId];
        return newPreviews;
      });

      toast.error(errorMessage);
    }
  };

  const addPosition = async () => {
    try {
      setIsLoading(true);
      
      if (isStudentCouncilElection) {
        const usedPositionNames = ballot.positions.map(p => p.name);
        const availablePositions = studentCouncilPositions
          .filter(pos => !usedPositionNames.includes(pos))
          .sort((a, b) => (studentCouncilPositionOrder[a] || 999) - (studentCouncilPositionOrder[b] || 999));
        
        if (availablePositions.length === 0) {
          setApiError("All Student Council positions have been added.");
          setIsLoading(false);
          return;
        }
        
        if (ballot.id) {
          const newPosition = await createPosition(ballot.id, {
            name: availablePositions[0],
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
            ].sort((a, b) => (studentCouncilPositionOrder[a.name] || 999) - (studentCouncilPositionOrder[b.name] || 999))
          }));
        } else {
          setBallot(prev => ({
            ...prev,
            positions: [
              ...prev.positions,
              {
                id: Math.floor(Math.random() * 1000000).toString(),
                name: availablePositions[0], 
                max_choices: 1,
                candidates: []
              }
            ].sort((a, b) => (studentCouncilPositionOrder[a.name] || 999) - (studentCouncilPositionOrder[b.name] || 999))
          }));
        }
      } else if (isMrMsSTIElection === true) {
        const usedPositionNames = ballot.positions.map(p => p.name);
        const availablePositions = mrMsSTIPositions
          .filter(pos => !usedPositionNames.includes(pos))
          .sort((a, b) => (mrMsSTIPositionOrder[a] || 999) - (mrMsSTIPositionOrder[b] || 999));
        
        if (availablePositions.length === 0) {
          setApiError("All Mr/Ms STI positions have been added.");
          setIsLoading(false);
          return;
        }
        
        if (ballot.id) {
          const newPosition = await createPosition(ballot.id, {
            name: availablePositions[0],
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
            ].sort((a, b) => (mrMsSTIPositionOrder[a.name] || 999) - (mrMsSTIPositionOrder[b.name] || 999))
          }));
        } else {
          setBallot(prev => ({
            ...prev,
            positions: [
              ...prev.positions,
              {
                id: Math.floor(Math.random() * 1000000).toString(),
                name: availablePositions[0], 
                max_choices: 1,
                candidates: []
              }
            ].sort((a, b) => (mrMsSTIPositionOrder[a.name] || 999) - (mrMsSTIPositionOrder[b.name] || 999))
          }));
        }
      } else {
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

  const validateAllCandidates = () => {
    let hasInvalidCandidates = false;
    const newErrors = { ...errors }; // Start with existing errors

    const allCandidates = ballot.positions.flatMap(pos => pos.candidates);
    const seenStudentNumbers = new Set();
    const seenFullNames = new Set();

    allCandidates.forEach((cand) => {
      const candidateErrors = {};
      let isCurrentCandidateInvalid = false;
      const candidateType = getCandidateType(cand.id);

      // For Mr/Ms STI elections, check if this is a group candidate
      if (isMrMsSTIElection === true && candidateType === 'group') {
        // Group validation - only require name
        if (!cand.first_name.trim()) {
          candidateErrors[`candidate-fn-${cand.id}`] = "Group name is required";
          isCurrentCandidateInvalid = true;
        }
        
        // Check for duplicate group names
        if (cand.first_name.trim()) {
          const groupName = cand.first_name.toLowerCase();
          const duplicateCount = allCandidates.filter(otherCand => 
            otherCand.id !== cand.id && 
            getCandidateType(otherCand.id) === 'group' &&
            otherCand.first_name.toLowerCase() === groupName
          ).length;

          if (duplicateCount > 0) {
            candidateErrors[`candidate-${cand.id}-duplicate`] = 'This group name is already used.';
            isCurrentCandidateInvalid = true;
          }
        }
      } else {
        // Individual student validation - prioritize student number for validation and uniqueness
        if (cand.student_number) {
        const studentMatch = allStudents.find(student =>
          student.student_number === cand.student_number
        );

        if (!studentMatch) {
          candidateErrors[`candidate-sn-${cand.id}`] = 'Student number not found';
          isCurrentCandidateInvalid = true;
        } else {
          // If student number matches, ensure first_name, last_name, course are consistent
          if (cand.first_name !== studentMatch.first_name ||
              cand.last_name !== studentMatch.last_name ||
              cand.course !== studentMatch.course_name) {
            // This case should ideally not happen if selectStudentNumberSuggestion works correctly
            // but it's a safeguard if user manually edits fields after selection
            candidateErrors[`candidate-${cand.id}-validation`] = 'Student data mismatch. Please re-select student.';
            isCurrentCandidateInvalid = true;
          }

          // Check for duplicate student numbers/IDs among candidates
          if (seenStudentNumbers.has(cand.student_number) ||
              allCandidates.some(otherCand => otherCand.id !== cand.id && otherCand.student_id === studentMatch.id)) {
            candidateErrors[`candidate-${cand.id}-duplicate`] = 'This student is already a candidate.';
            isCurrentCandidateInvalid = true;
          }
          seenStudentNumbers.add(cand.student_number);
        }
      } else { // No student number, validate by name
        if (!cand.first_name.trim()) {
          candidateErrors[`candidate-fn-${cand.id}`] = "First name is required";
          isCurrentCandidateInvalid = true;
        }
        
        // Only require last name for individual students, not for groups
        if (candidateType !== 'group' && !cand.last_name.trim()) {
          candidateErrors[`candidate-ln-${cand.id}`] = "Last name is required";
          isCurrentCandidateInvalid = true;
        }

        if (cand.first_name.trim()) {
          // For group candidates, only check first name for duplicates
          if (candidateType === 'group') {
            const groupName = cand.first_name.toLowerCase();
            if (seenFullNames.has(groupName) ||
                allCandidates.some(otherCand =>
                  otherCand.id !== cand.id &&
                  getCandidateType(otherCand.id) === 'group' &&
                  otherCand.first_name.toLowerCase() === groupName
                )) {
              candidateErrors[`candidate-${cand.id}-duplicate`] = 'This group name is already used.';
              isCurrentCandidateInvalid = true;
            }
            seenFullNames.add(groupName);
          } else if (cand.last_name.trim()) {
            // For individual students, check both first and last name
            const fullName = `${cand.first_name.toLowerCase()} ${cand.last_name.toLowerCase()}`;
            
            // Check for name-based duplicates (only if no student_number is set for either)
            if (seenFullNames.has(fullName) ||
                allCandidates.some(otherCand =>
                  otherCand.id !== cand.id &&
                  !otherCand.student_number && // Ensure other candidate also has no student_number
                  getCandidateType(otherCand.id) !== 'group' && // Don't compare with group candidates
                  otherCand.first_name.toLowerCase() === cand.first_name.toLowerCase() &&
                  otherCand.last_name.toLowerCase() === cand.last_name.toLowerCase()
                )) {
              candidateErrors[`candidate-${cand.id}-duplicate`] = 'This candidate (by name) is already a candidate.';
              isCurrentCandidateInvalid = true;
            }
            seenFullNames.add(fullName);
          }
        }

          // Only check student existence for individual students, not for groups
          if (candidateType !== 'group') {
            const studentExists = allStudents.some(student =>
              student.first_name.toLowerCase() === cand.first_name.toLowerCase() &&
              student.last_name.toLowerCase() === cand.last_name.toLowerCase()
            );

            if (!studentExists) {
              candidateErrors[`candidate-${cand.id}-validation`] = 'Student not found in registered students list.';
              isCurrentCandidateInvalid = true;
            }
          }
        }
      }

      // Update errors for the current candidate
      if (isCurrentCandidateInvalid) {
        hasInvalidCandidates = true;
        Object.assign(newErrors, candidateErrors);
      } else {
        // Clear any previous errors for this candidate if it's now valid
        delete newErrors[`candidate-sn-${cand.id}`];
        delete newErrors[`candidate-fn-${cand.id}`];
        delete newErrors[`candidate-ln-${cand.id}`];
        delete newErrors[`candidate-${cand.id}-validation`];
        delete newErrors[`candidate-${cand.id}-duplicate`];
      }
    });

    setErrors(newErrors);
    return !hasInvalidCandidates;
  };

  const addCandidate = async (posId) => {
    try {
      setIsLoading(true);
      
      // Get all existing candidates across all positions
      const allExistingCandidates = ballot.positions.flatMap(pos => pos.candidates);
      
      // Check if there are any candidates with empty names or student numbers
      const hasEmptyCandidates = allExistingCandidates.some(
        cand => {
          const candidateType = getCandidateType(cand.id) || 'individual';
          
          // For group candidates, only check if first_name (group name) is empty
          if (isMrMsSTIElection === true && candidateType === 'group') {
            return !cand.first_name.trim();
          }
          
          // For individual students, check both names or student number
          return (!cand.first_name.trim() || !cand.last_name.trim()) && !cand.student_number.trim();
        }
      );
      
      if (hasEmptyCandidates) {
        const hasGroupCandidates = allExistingCandidates.some(cand => 
          isMrMsSTIElection === true && (getCandidateType(cand.id) || 'individual') === 'group'
        );
        
        if (hasGroupCandidates) {
          setApiError("Please fill in all candidate names (for groups) or student information (for individuals) before adding a new one.");
        } else {
          setApiError("Please fill in all candidate names or student numbers before adding a new one.");
        }
        setIsLoading(false);
        return;
      }

      // Check if there are any validation errors
      if (!validateAllCandidates()) {
        setApiError("Please fix existing candidate validation errors before adding a new one.");
        setIsLoading(false);
        return;
      }
      
      const newCandidate = {
        id: Math.floor(Math.random() * 1000000).toString(),
        first_name: "",
        last_name: "",
        student_number: "", // Initialize student_number
        course: "",        // Initialize course
        party: (isMrMsSTIElection === true) ? "" : "",
        slogan: (isMrMsSTIElection === true) ? "" : "",
        platform: (isMrMsSTIElection === true) ? "" : "",
        image_url: null,
        student_id: null,    // Initialize student_id
        _isNew: true
      };

      // Set default candidate type for Mr/Ms STI elections
      if (isMrMsSTIElection === true) {
        setCandidateTypes(prev => ({
          ...prev,
          [newCandidate.id]: 'individual' // Default to individual student
        }));
      }
  
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
  
      const candidateType = getCandidateType(candidate.id) || 'individual';
      
      // Validate based on candidate type
      if (isMrMsSTIElection === true && candidateType === 'group') {
        if (!candidate.first_name) {
          throw new Error("Group name is required");
        }
      } else if (isSymposiumElection === true) {
        if (!candidate.first_name) {
          throw new Error("Project title is required");
        }
      } else {
        if (!candidate.first_name || !candidate.last_name) {
          throw new Error("First name and last name are required");
        }
      }
  
      const formData = new FormData();
     
      // For group candidates in Mr/Ms STI elections or Symposium elections, only use first_name
      if ((isMrMsSTIElection === true && candidateType === 'group') || isSymposiumElection === true) {
        formData.append('firstName', candidate.first_name);
        formData.append('lastName', ''); // Empty for groups/symposium
        formData.append('candidateType', isSymposiumElection ? 'symposium' : 'group');
      } else {
        formData.append('firstName', candidate.first_name);
        formData.append('lastName', candidate.last_name);
        formData.append('candidateType', 'individual');
      }
      
      // Only add campaign fields for non-Mr/Ms STI elections, but handle Symposium differently
      if (isMrMsSTIElection !== true) {
        if (isSymposiumElection === true) {
          // For Symposium, only add platform (project description)
          formData.append('party', '');
          formData.append('slogan', '');
          formData.append('platform', candidate.platform || '');
        } else {
          // For regular elections, add all campaign fields
          formData.append('party', candidate.party || '');
          formData.append('slogan', candidate.slogan || '');
          formData.append('platform', candidate.platform || '');
        }
      }
      
      if (candidate._pendingImage) {
        formData.append('image', candidate._pendingImage);
      }
  
      let response;
      if (candidate._isNew) {
        response = await fetchWithAuth(
          `/positions/${positionId}/candidates`,
          {
            method: 'POST',
            body: formData
          }
        );
      } else if (candidate._pendingImage) {
        response = await fetchWithAuth(
          `/candidates/${candidate.id}`,
          {
            method: 'PUT',
            body: formData
          }
        );
      } else {
        const updateData = {
          firstName: candidate.first_name,
          lastName: candidate.last_name
        };
        
        // Only add campaign fields for non-Mr/Ms STI elections
        if (isMrMsSTIElection !== true) {
          updateData.party = candidate.party;
          updateData.slogan = candidate.slogan;
          updateData.platform = candidate.platform;
        }
        
        response = await fetchWithAuth(
          `/candidates/${candidate.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(updateData)
          }
        );
      }
  
  
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
    
    // Check for duplicate candidates across all positions
    const allCandidates = ballot.positions.flatMap(pos => pos.candidates);
    const seenCandidates = new Set();
    let hasDuplicates = false;

    ballot.positions.forEach((pos) => {
      pos.candidates.forEach((cand) => {
        if (cand.first_name && (cand.last_name || isSymposiumElection)) {
          const fullName = isSymposiumElection 
            ? cand.first_name.toLowerCase() 
            : `${cand.first_name.toLowerCase()} ${cand.last_name.toLowerCase()}`;
          
        // Check if student exists in the student list (skip for Symposium elections)
        if (!isSymposiumElection) {
          const studentExists = allStudents.some(student => 
            student.first_name.toLowerCase() === cand.first_name.toLowerCase() && 
            student.last_name.toLowerCase() === cand.last_name.toLowerCase()
          );
          
          if (!studentExists) {
            newErrors[`candidate-${cand.id}-validation`] = 'This student is not in the student list';
          }
        }

          // Check for duplicate candidates
          if (seenCandidates.has(fullName)) {
            newErrors[`candidate-${cand.id}-duplicate`] = 'This candidate is already a candidate';
            hasDuplicates = true;
          } else {
            seenCandidates.add(fullName);
          }
        }
      });
    });

    if (isStudentCouncilElection) {
      const usedPositions = ballot.positions.map(p => p.name).filter(name => name.trim() !== "");
      const uniquePositions = new Set(usedPositions);
      
      if (uniquePositions.size !== usedPositions.length) {
        newErrors.duplicatePositions = "Duplicate positions are not allowed in Student Council elections";
      }
    }
    
    if (isMrMsSTIElection === true) {
      const usedPositions = ballot.positions.map(p => p.name).filter(name => name.trim() !== "");
      const uniquePositions = new Set(usedPositions);
      
      if (uniquePositions.size !== usedPositions.length) {
        newErrors.duplicatePositions = "Duplicate positions are not allowed in Mr/Ms STI elections";
      }
    }
    
    ballot.positions.forEach((pos) => {
      if (!pos.name.trim()) {
        newErrors[`position-${pos.id}`] = "Position name is required";
      }  
      
      if (pos.candidates.length < 2) {
        newErrors[`position-${pos.id}-candidates`] = "At least 2 candidates are required per position";
      }
      
      pos.candidates.forEach((cand) => {
        const candidateType = getCandidateType(cand.id) || 'individual';
        
        if (isMrMsSTIElection === true && candidateType === 'group') {
          if (!cand.first_name.trim()) {
            newErrors[`candidate-fn-${cand.id}`] = "Group name is required";
          }
        } else {
          if (!cand.first_name.trim()) {
            newErrors[`candidate-fn-${cand.id}`] = "First name is required";
          }
          if (!cand.last_name.trim()) {
            newErrors[`candidate-ln-${cand.id}`] = "Last name is required";
          }
        }
      });
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = () => {
    if (!validateForm()) {
      const positionsWithTooFewCandidates = ballot.positions.filter(pos => pos.candidates.length < 2);
      const hasDuplicateCandidates = Object.keys(errors).some(key => key.includes('-duplicate'));
      
      if (hasDuplicateCandidates) {
        setApiError("Cannot preview ballot: There are duplicate candidates. Please remove duplicates before proceeding.");
        window.scrollTo(0, 0);
        return;
      }
      
      if (positionsWithTooFewCandidates.length > 0) {
        setApiError(`Each position must have at least 2 candidates. Please add more candidates to ${positionsWithTooFewCandidates.map(p => p.name || 'unnamed position').join(', ')}.`);
        window.scrollTo(0, 0);
      } else {
        setApiError("Make sure that candidates are registered students and there are no duplicate candidates.");
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

      // Validate again before submitting
      if (!validateForm()) {
        const hasDuplicateCandidates = Object.keys(errors).some(key => key.includes('-duplicate'));
        if (hasDuplicateCandidates) {
          setApiError("Cannot save ballot: There are duplicate candidates. Please remove duplicates before proceeding.");
          window.scrollTo(0, 0);
          setIsLoading(false);
          return;
        }
        setApiError("Please fix all validation errors before saving the ballot.");
        window.scrollTo(0, 0);
        setIsLoading(false);
        return;
      }

      for (const position of ballot.positions) {
        for (const candidate of position.candidates) {
          if (candidate._isNew || candidate._pendingImage) {
            await saveCandidate(position.id, candidate);
          }
        }
      }

      const apiData = {
        election_id: ballot.election_id,
        description: election.description || "",
        positions: ballot.positions.map(pos => ({
          name: pos.name,
          max_choices: pos.max_choices,
          candidates: pos.candidates.map(cand => {
            const candidateData = {
              id: cand.id,
              first_name: cand.first_name,
              last_name: cand.last_name,
              image_url: cand.image_url
            };
            
            // Only include campaign fields for non-Mr/Ms STI elections
            if (isMrMsSTIElection !== true) {
              candidateData.party = cand.party;
              candidateData.slogan = cand.slogan;
              candidateData.platform = cand.platform;
            }
            
            return candidateData;
          })
        }))
      };
      
      let response;
      try {
        if (ballot.id) {
          response = await fetchWithAuth(`/api/ballots/${ballot.id}`, {
            method: 'PUT',
            body: JSON.stringify(apiData)
          });
        } else {
          response = await fetchWithAuth('/api/ballots', {
            method: 'POST',
            body: JSON.stringify(apiData)
          });
        }
      
        setIsLoading(false);
        setPreviewBallot(false);
        
      
        setTimeout(() => {
          
          router.push('/admin');
        }, 100);
        
      } catch (apiError) {
       
        if (apiError.message !== "Ballot created successfully") {
          throw apiError;
        }
        
        
        setIsLoading(false);
        
       
        setTimeout(() => {
          router.push('/admin');
        }, 100);
      }
    } catch (error) {
      
      if (error.message !== "Ballot created successfully") {
        setApiError(error.message || "An unexpected error occurred");
        window.scrollTo(0, 0);
      } else {
        setTimeout(() => {
          router.push('/admin');
        }, 100);
      }
      setIsLoading(false);
    }
  };

  const openPartylistModal = (posId, candId) => {
    const position = ballot.positions.find(pos => pos.id === posId);
    setCurrentEditingCandidate({ posId, candId });
    setShowPartylistModal(true);
    return position?.name;
  };

  const handlePartylistSelect = (party) => {
    const { posId, candId } = currentEditingCandidate;
    
    const updatedPositions = ballot.positions.map(pos => ({
      ...pos,
      candidates: pos.candidates.map(cand => 
        cand.id === candId ? { 
          ...cand, 
          party: party.name,
          slogan: party.slogan || '',
          platform: party.advocacy || '',
          first_name: party.candidate ? party.candidate.first_name : cand.first_name,
          last_name: party.candidate ? party.candidate.last_name : cand.last_name,
          student_number: party.candidate ? party.candidate.student_number : cand.student_number,
          course: party.candidate ? party.candidate.course : cand.course
        } : cand
      )
    }));
    
    setBallot(prev => ({ ...prev, positions: updatedPositions }));
    setShowPartylistModal(false);
  };

  useEffect(() => {
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get('/api/superadmin/students', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (res.data && res.data.students) {
        const activeStudents = res.data.students.filter((student) => student.is_active);
        setAllStudents(activeStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const validateStudentExists = (firstName, lastName) => {
    const studentExists = allStudents.some(student => 
      student.first_name.toLowerCase() === firstName.toLowerCase() && 
      student.last_name.toLowerCase() === lastName.toLowerCase()
    );
    
    if (!studentExists) {
      setErrors(prev => ({
        ...prev,
        [`candidate-${currentEditingCandidate.candId}-validation`]: 'This student is not in the student list'
      }));
      return false;
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`candidate-${currentEditingCandidate.candId}-validation`];
      return newErrors;
    });
    return true;
  };

  if (!election) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error boundary for rendering
  try {
    // Ensure all critical state is properly initialized
    if (!ballot || !ballot.positions) {
      return (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p>Loading ballot data...</p>
          </div>
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
          isMrMsSTIElection={isMrMsSTIElection}
        />
      )}

      {showBackConfirmation && (
        <BackConfirmationModal
          onConfirm={() => router.back()}
          onCancel={() => setShowBackConfirmation(false)}
        />
      )}
      
      {showPartylistModal && (
        <PartylistSelectionModal 
          partylists={partylists} 
          onSelect={handlePartylistSelect} 
          onCancel={() => setShowPartylistModal(false)}
          currentPosition={ballot.positions.find(pos => pos.id === currentEditingCandidate.posId)?.name}
          currentStudent={ballot.positions
            .find(pos => pos.id === currentEditingCandidate.posId)
            ?.candidates.find(cand => cand.id === currentEditingCandidate.candId)}
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

      {errors.duplicatePositions && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errors.duplicatePositions}
        </div>
      )}

  
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-black mb-4"> {election.description || "No description provided"}</p>
        
        
      </div>

      {ballot.positions.map((position) => (
        <div key={position.id} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 mr-4">
              <label className="block text-sm font-medium text-black mb-1">
                Position Name
              </label>
              
              {isStudentCouncilElection ? (
                <select
                  value={position.name}
                  onChange={(e) => handlePositionChange(position.id, "name", e.target.value)}
                  className={`w-full p-2 border rounded text-black ${
                    errors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  {studentCouncilPositions
                    .filter(posName => 
                      position.name === posName || 
                      !ballot.positions.some(p => p.id !== position.id && p.name === posName)
                    )
                    .map(posName => (
                      <option key={posName} value={posName}>
                        {posName}
                      </option>
                    ))
                  }
                </select>
              ) : (isMrMsSTIElection === true) ? (
                <MrMsSTIPositionSelector
                  position={position}
                  ballot={ballot}
                  onPositionChange={handlePositionChange}
                  errors={errors}
                />
              ) : (
                <input
                  type="text"
                  value={position.name}
                  onChange={(e) => handlePositionChange(position.id, "name", e.target.value)}
                  className={`w-full p-2 border rounded text-black ${
                    errors[`position-${position.id}`] ? "border-red-500" : "border-gray-300"
                  }`}
                />
              )}
              
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
                    <label className="block w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors relative group" title="Click to upload image (max 5MB)">
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
                          <span className="text-xs text-gray-300">Max 5MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            // Show file size info
                            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
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
                    {/* Candidate Type Selector for Mr/Ms STI elections (not needed for Symposium) */}
                    {isMrMsSTIElection === true && !isSymposiumElection && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-black mb-2">
                          Candidate Type
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`candidate-type-${candidate.id}`}
                              value="individual"
                              checked={(() => {
                                try {
                                  return !candidateTypes || candidateTypes[candidate.id] !== 'group';
                                } catch (error) {
                                  console.warn('Error checking candidate type:', error);
                                  return true;
                                }
                              })()}
                              onChange={(e) => handleCandidateTypeChange(position.id, candidate.id, e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-black">Individual Student</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`candidate-type-${candidate.id}`}
                              value="group"
                              checked={(() => {
                                try {
                                  return candidateTypes && candidateTypes[candidate.id] === 'group';
                                } catch (error) {
                                  console.warn('Error checking candidate type:', error);
                                  return false;
                                }
                              })()}
                              onChange={(e) => handleCandidateTypeChange(position.id, candidate.id, e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-black">Group/Band</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Conditional form fields based on candidate type */}
                    {(() => {
                      try {
                        const isGroup = isMrMsSTIElection === true && (
                          (candidateTypes && candidateTypes[candidate.id] === 'group') || 
                          (candidate.first_name && !candidate.last_name)
                        );
                        const isSymposium = isSymposiumElection === true;
                        return isGroup || isSymposium;
                      } catch (error) {
                        console.warn('Error checking candidate type:', error);
                        return false;
                      }
                    })() ? (
                      /* Group/Band/Symposium form - only name field */
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-black mb-1">
                          {isSymposiumElection ? 'Project Title' : 'Group/Band Name'}
                        </label>
                        <input
                          type="text"
                          value={candidate.first_name}
                          onChange={(e) => handleCandidateChange(position.id, candidate.id, "first_name", e.target.value)}
                          className={`w-full p-2 border rounded text-black ${
                            errors[`candidate-fn-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder={isSymposiumElection ? "Enter project title" : "Enter group or band name"}
                        />
                        {errors[`candidate-fn-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-fn-${candidate.id}`]}</p>
                        )}
                      </div>
                    ) : (
                      /* Individual student form - full fields */
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
                            Student Number
                          </label>
                          <div className="relative">
                          <input
                            type="text"
                            value={candidate.student_number || ''}
                            onChange={(e) => handleCandidateChange(position.id, candidate.id, "student_number", e.target.value)}
                            onFocus={() => setActiveInput({ posId: position.id, candId: candidate.id, field: 'student_number' })}
                            onBlur={() => setTimeout(() => {
                              if (activeInput.posId === position.id && activeInput.candId === candidate.id && activeInput.field === 'student_number') {
                                setShowStudentNumberSuggestions(false);
                              }
                            }, 200)}
                            className={`w-full p-2 border rounded text-black ${errors[`candidate-sn-${candidate.id}`] ? "border-red-500" : "border-gray-300"}`}
                            placeholder="Student number"
                          />
                          {showStudentNumberSuggestions && studentNumberSuggestions.length > 0 && 
                           activeInput.posId === position.id && 
                           activeInput.candId === candidate.id && 
                           activeInput.field === 'student_number' && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                              {studentNumberSuggestions.map(student => (
                                <div 
                                  key={student.id} 
                                  className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                  onClick={() => selectStudentNumberSuggestion(student, position.id, candidate.id)}
                                >
                                  <div className="font-medium text-black">{student.student_number}</div>
                                  <div className="text-sm text-gray-600">{student.first_name} {student.last_name} - {student.course_name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors[`candidate-sn-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-sn-${candidate.id}`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Course
                        </label>
                        <input
                          type="text"
                          value={candidate.course || ''}
                          readOnly 
                          className="w-full p-2 border border-gray-300 rounded text-black bg-gray-100"
                          placeholder="Course"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          First Name 
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={candidate.first_name}
                            onChange={(e) => {
                              handleCandidateChange(position.id, candidate.id, "first_name", e.target.value);
                              fetchNameSuggestions(e.target.value, 'firstName', position.id, candidate.id);
                            }}
                            onFocus={() => {
                              setActiveInput({ posId: position.id, candId: candidate.id, field: 'first_name' });
                              if (candidate.first_name) {
                                fetchNameSuggestions(candidate.first_name, 'firstName', position.id, candidate.id);
                              }
                            }}
                            onBlur={() => setTimeout(() => {
                              if (activeInput.posId === position.id && activeInput.candId === candidate.id && activeInput.field === 'first_name') {
                                setShowFirstNameSuggestions(false);
                              }
                            }, 200)}
                            className={`w-full p-2 border rounded text-black ${
                              errors[`candidate-fn-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="First name"
                            readOnly={!!candidate.student_number} 
                          />
                          {showFirstNameSuggestions && firstNameSuggestions.length > 0 && 
                           activeInput.posId === position.id && 
                           activeInput.candId === candidate.id && 
                           activeInput.field === 'first_name' && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                              {firstNameSuggestions.map(student => (
                                <div 
                                  key={student.id} 
                                  className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                  onClick={() => selectNameSuggestion(student, 'firstName', position.id, candidate.id)}
                                >
                                  <div className="font-medium text-black">{student.first_name} {student.last_name}</div>
                                  <div className="text-sm text-gray-600">{student.student_number} - {student.course_name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors[`candidate-fn-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-fn-${candidate.id}`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Last Name 
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={candidate.last_name}
                            onChange={(e) => {
                              handleCandidateChange(position.id, candidate.id, "last_name", e.target.value);
                              fetchNameSuggestions(e.target.value, 'lastName', position.id, candidate.id);
                            }}
                            onFocus={() => {
                              setActiveInput({ posId: position.id, candId: candidate.id, field: 'last_name' });
                              if (candidate.last_name) {
                                fetchNameSuggestions(candidate.last_name, 'lastName', position.id, candidate.id);
                              }
                            }}
                            onBlur={() => setTimeout(() => {
                              if (activeInput.posId === position.id && activeInput.candId === candidate.id && activeInput.field === 'last_name') {
                                setShowLastNameSuggestions(false);
                              }
                            }, 200)}
                            className={`w-full p-2 border rounded text-black ${
                              errors[`candidate-ln-${candidate.id}`] ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="Last name"
                            readOnly={!!candidate.student_number}
                          />
                          {showLastNameSuggestions && lastNameSuggestions.length > 0 && 
                           activeInput.posId === position.id && 
                           activeInput.candId === candidate.id && 
                           activeInput.field === 'last_name' && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto">
                              {lastNameSuggestions.map(student => (
                                <div 
                                  key={student.id} 
                                  className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                                  onClick={() => selectNameSuggestion(student, 'lastName', position.id, candidate.id)}
                                >
                                  <div className="font-medium text-black">{student.first_name} {student.last_name}</div>
                                  <div className="text-sm text-gray-600">{student.student_number} - {student.course_name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors[`candidate-ln-${candidate.id}`] && (
                          <p className="text-red-500 text-sm mt-1 text-black">{errors[`candidate-ln-${candidate.id}`]}</p>
                        )}
                      </div>
                    </div>
                        </>
                    )}

                    {/* Only show campaign fields for non-Mr/Ms STI elections, but show platform for Symposium */}
                    {(isMrMsSTIElection !== true) && (
                      <>
                        {/* Hide partylist and slogan for Symposium elections */}
                        {!isSymposiumElection && (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Partylist
                              </label>
                              <div>
                                <div 
                                  onClick={() => openPartylistModal(position.id, candidate.id)}
                                  className={`w-full p-2 border border-gray-300 rounded text-black flex justify-between items-center cursor-pointer hover:border-blue-500 ${candidate.party ? 'bg-gray-50' : ''}`}
                                >
                                  <span className={candidate.party ? 'text-black' : 'text-gray-400'}>
                                    {candidate.party || "Select a partylist"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-black mb-1">
                                Slogan
                              </label>
                              <input
                                type="text"
                                value={candidate.slogan || ''}
                                onChange={(e) => handleCandidateChange(position.id, candidate.id, "slogan", e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-black"
                            
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-black mb-1">
                            {isSymposiumElection ? 'Project Description' : 'Platform/Description'}
                          </label>
                          <textarea
                            value={candidate.platform || ''}
                            onChange={(e) => handleCandidateChange(position.id, candidate.id, "platform", e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-black"
                            rows={2}
                            placeholder={isSymposiumElection ? "Enter project description" : "Candidate platform or bio"}
                          />
                        </div>
                      </>
                    )}
                    {errors[`candidate-${candidate.id}-validation`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`candidate-${candidate.id}-validation`]}</p>
                    )}
                    {errors[`candidate-${candidate.id}-duplicate`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`candidate-${candidate.id}-duplicate`]}</p>
                    )}

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
  } catch (error) {
    console.error('Error rendering ballot component:', error);
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="text-lg font-bold mb-2">Application Error</h2>
          <p>There was an error loading the ballot page. Please refresh the page and try again.</p>
          <p className="text-sm mt-2">Error: {error.message}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }
}
