"use client"
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { User } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const CandidatesSection = ({ 
  landingContent, 
  updateCandidates, 
  saveSectionContent, 
  showPreview,
  formatImageUrl
}) => {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidatesByPosition, setCandidatesByPosition] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchElectionDetails(selectedElection);
    }
  }, [selectedElection]);

  const handleImageError = (candidateId) => {
    if (!imageErrors[candidateId]) {
      setImageErrors(prev => ({
        ...prev,
        [candidateId]: true
      }));
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/uploads')) {
      return `${API_BASE}${imageUrl}`;
    }
    
    if (!imageUrl.startsWith('/')) {
      return `${API_BASE}/uploads/candidates/${imageUrl}`;
    }
    
    return `${API_BASE}${imageUrl}`;
  };

  async function fetchWithAuth(url) {
    // Try to get token from cookies first
    let token = Cookies.get('token');
    
    // Fall back to localStorage if not in cookies
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('authToken');
    }
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }
  
  const fetchElections = async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/api/elections');
      
      if (data && data.elections) {
        setElections(data.elections);
        
        // Select the first election by default if available
        if (data.elections.length > 0) {
          setSelectedElection(data.elections[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError('Failed to load elections. Please ensure you are logged in and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchElectionDetails = async (electionId) => {
    try {
      setLoading(true);
      const data = await fetchWithAuth(`/api/elections/${electionId}/details`);
      
      if (data && data.election) {
        let electionData = data.election;
        
        // Process the ballot structure to match what we need
        let allCandidates = [];
        let positionsMap = {};
        
        // Handle different possible ballot structures
        if (electionData?.ballot?.positions && Array.isArray(electionData.ballot.positions)) {
          // Use ballot positions if available
          electionData.positions = electionData.ballot.positions.map(pos => ({
            id: pos.position_id || pos.id,
            name: pos.position_name || pos.name,
            max_choices: pos.max_choices,
            candidates: pos.candidates
          }));
        }
        
        // Extract candidates from positions
        if (electionData.positions && Array.isArray(electionData.positions)) {
          electionData.positions.forEach(position => {
            const positionName = position.name;
            
            if (position.candidates && Array.isArray(position.candidates)) {
              positionsMap[positionName] = position.candidates.map(candidate => ({
                id: candidate.id,
                firstName: candidate.first_name || candidate.firstName || '',
                lastName: candidate.last_name || candidate.lastName || '',
                position: positionName,
                partyList: candidate.party || candidate.partyList || candidate.party_list || '',
                slogan: candidate.slogan || '',
                platform: candidate.platform || candidate.description || '',
                photoUrl: getImageUrl(candidate.image_url || candidate.photoUrl || candidate.photo_url),
                order: candidate.order || 0
              }));
              
              allCandidates = [...allCandidates, ...positionsMap[positionName]];
            }
          });
        }
        
        setCandidates(allCandidates);
        setCandidatesByPosition(positionsMap);
        
        // Update the landing content with the fetched candidates
        updateCandidates('items', allCandidates);
      }
    } catch (error) {
      console.error('Error fetching election details:', error);
      setError('Failed to load election details. Please ensure you are logged in and try again.');
      setCandidates([]);
      setCandidatesByPosition({});
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-medium text-black">Election Candidates Display</h2>
        <button
          onClick={() => saveSectionContent('candidates')}
          disabled={loading}
          className={`px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Loading...' : 'Save Candidates Display'}
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Title
          </label>
          <input 
            type="text" 
            value={landingContent.candidates.title}
            onChange={(e) => updateCandidates('title', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Subtitle
          </label>
          <textarea 
            value={landingContent.candidates.subtitle}
            onChange={(e) => updateCandidates('subtitle', e.target.value)}
            rows="2"
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        {/* Color pickers for the section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Section Background Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.candidates.sectionBgColor || "#f9fafb"}
                onChange={(e) => updateCandidates('sectionBgColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.candidates.sectionBgColor || "#f9fafb"}
                onChange={(e) => updateCandidates('sectionBgColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Text Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.candidates.textColor || "#000000"}
                onChange={(e) => updateCandidates('textColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.candidates.textColor || "#000000"}
                onChange={(e) => updateCandidates('textColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
        </div>
        
        {/* Election Selector */}
        <div className="border rounded-md p-4 bg-gray-50">
          <label className="block text-sm font-medium text-black mb-2">
            Select Election to Display Candidates From:
          </label>
          {loading && elections.length === 0 ? (
            <div className="text-gray-500">Loading elections...</div>
          ) : error && elections.length === 0 ? (
            <div className="text-red-600">{error}</div>
          ) : elections.length === 0 ? (
            <div className="text-gray-500">No elections available.</div>
          ) : (
            <select
              value={selectedElection || ''}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-black"
            >
              <option value="">Select an election...</option>
              {elections.map(election => (
                <option key={election.id} value={election.id}>
                  {election.title || election.name} 
                  {election.year ? ` (${election.year})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Candidates By Position */}
        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
            <h3 className="text-sm font-medium text-black">Election Ballot</h3>
            {loading && <span className="text-xs text-gray-500">Loading...</span>}
          </div>
          
          {error ? (
            <div className="p-4 text-center text-red-600">
              {error}
            </div>
          ) : !selectedElection ? (
            <div className="p-8 text-center text-gray-500">
              Select an election to display candidates.
            </div>
          ) : Object.keys(candidatesByPosition).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No candidates found for this election.
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(candidatesByPosition).map(([position, positionCandidates]) => (
                <div key={position} className="p-4">
                  <h4 className="text-md font-medium text-black mb-3 pb-2 border-b">
                    {position} ({positionCandidates.length})
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {positionCandidates.map((candidate, index) => (
                      <div key={candidate.id || index} className="flex items-center p-2 hover:bg-gray-50 rounded border">
                        <div className="relative w-16 h-16 mr-3">
                          {candidate.photoUrl && !imageErrors[candidate.id] ? (
                            <Image 
                              src={candidate.photoUrl}
                              alt={`${candidate.firstName} ${candidate.lastName}`}
                              fill
                              sizes="64px"
                              className="object-cover rounded-full"
                              onError={() => handleImageError(candidate.id)}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow">
                          <h5 className="text-sm font-medium text-black">
                            {candidate.firstName} {candidate.lastName}
                          </h5>
                          {candidate.partyList && (
                            <div className="text-xs text-gray-600">
                              <span className="font-bold">Partylist/Course: </span> 
                              {candidate.partyList}
                            </div>
                          )}
                          {candidate.slogan && (
                            <p className="text-xs italic text-gray-600">
                              <span className="font-bold">Slogan: </span>
                              "{candidate.slogan}"
                            </p>
                          )}
                          {candidate.platform && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              <span className="font-bold">Platform: </span>
                              {candidate.platform}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Preview */}
        {showPreview && (
          <div className="border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium text-black">Preview</span>
              <span className="text-xs text-blue-600">Pending save</span>
            </div>
            <div 
              className="p-4"
              style={{ 
                backgroundColor: landingContent.candidates.sectionBgColor || '#f9fafb',
                color: landingContent.candidates.textColor || '#000000'
              }}
            >
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: landingContent.candidates.textColor || '#000000' }}>
                {landingContent.candidates.title}
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: landingContent.candidates.textColor || '#000000' }}>
                {landingContent.candidates.subtitle}
              </p>
              
              {candidates.length > 0 ? (
                <div>
                  {Object.entries(candidatesByPosition).map(([position, positionCandidates]) => (
                    <div key={position} className="mb-8">
                      <h3 className="text-lg font-semibold mb-4 text-center pb-2 border-b" style={{ color: landingContent.candidates.textColor || '#000000' }}>
                        {position}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {positionCandidates.map((candidate, index) => (
                          <div key={candidate.id || index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                            {candidate.photoUrl && !imageErrors[candidate.id] ? (
                              <div className="h-48 bg-gray-200">
                                <img 
                                  src={candidate.photoUrl}
                                  alt={`${candidate.firstName} ${candidate.lastName}`}
                                  className="w-full h-full object-cover object-center" 
                                />
                              </div>
                            ) : (
                              <div className="h-48 bg-gray-200 flex items-center justify-center">
                                <User className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                            <div className="p-4">
                              <h4 className="font-bold text-lg">
                                {candidate.firstName} {candidate.lastName}
                              </h4>
                              {candidate.partyList && (
                                <div className="text-sm text-gray-700 mb-2">
                                  {candidate.partyList}
                                </div>
                              )}
                              {candidate.slogan && (
                                <p className="text-sm italic mb-3 text-gray-600">"{candidate.slogan}"</p>
                              )}
                              {candidate.platform && (
                                <p className="text-sm text-gray-600 line-clamp-3">{candidate.platform}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-100 rounded border-2 border-dashed">
                  <p className="text-gray-500">No candidates to display</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesSection; 