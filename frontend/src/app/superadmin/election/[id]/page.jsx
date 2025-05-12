"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Calendar, Clock, Users, CheckCircle, 
  ChevronLeft, List, User, Edit, Plus,
  AlertTriangle as ExclamationTriangle,
  Lock, Award, ArrowDown, ArrowUp, PieChart,
  AlertCircle, XCircle, Check, X
} from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

const CHART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

async function fetchWithAuth(url) {
  const token = Cookies.get('token');
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    // Check if the response is JSON before trying to parse it
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    } else {
      // If not JSON, throw error with status
      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  const text = await response.text();
  if (!text) {
    return {}; // Return empty object if no response body
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing JSON response:", e);
    throw new Error("Invalid JSON response from server");
  }
}


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

export default function ElectionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidateImages, setCandidateImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [isSystemAdminCreator, setIsSystemAdminCreator] = useState(false);

  const handleImageError = (candidateId) => {
    if (!imageErrors[candidateId]) {
      setImageErrors(prev => ({
        ...prev,
        [candidateId]: true
      }));
    }
  };

  useEffect(() => {
    const loadElectionDetails = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWithAuth(`/elections/${params.id}/details`);
        
        console.log('Election details response:', data);
        
        let electionData = data.election;
       
        // Check if this election was created by a system admin
        if (electionData && electionData.created_by) {
          try {
            console.log('Creator data:', JSON.stringify(electionData.created_by));
            
            // Default to NOT being able to edit - more secure this way
            let isSysAdmin = false;
            
            // Special handling for ID 1 which is typically the system admin
            if (typeof electionData.created_by === 'object') {
              const creatorId = electionData.created_by.id || '';
              if (creatorId === 1 || creatorId === '1') {
                console.log('Creator has ID 1, treating as system admin');
                isSysAdmin = true;
              }
            } else if (electionData.created_by === 1 || electionData.created_by === '1') {
              console.log('Creator has ID 1, treating as system admin');
              isSysAdmin = true;
              
              // If we only have the ID but not the creator details, try to fetch them
              try {
                console.log('Attempting to fetch creator details for ID:', electionData.created_by);
                
                // Instead of attempting to fetch user details which may not exist,
                // set a default system admin name
                electionData.created_by_name = "System Administrator";
                electionData.created_by_role = "SuperAdmin";
              } catch (creatorFetchError) {
                console.error('Error setting creator details:', creatorFetchError);
                electionData.created_by_name = "System Administrator";
              }
            } else if (typeof electionData.created_by === 'number' || typeof electionData.created_by === 'string') {
              // For any other numeric or string ID
              console.log('Creator has ID (not 1):', electionData.created_by);
              
              // Set just the role without a name
              electionData.created_by_name = "";  // Empty string to only show role
              electionData.created_by_role = "Admin";
            }
            
            // Check creator role if available
            if (typeof electionData.created_by === 'object' && electionData.created_by.role) {
              const creatorRole = electionData.created_by.role.toLowerCase();
              console.log('Creator role from object:', creatorRole);
              
              // Check if creator is a system admin based on role
              const isSysAdminByRole = 
                creatorRole.includes('superadmin') || 
                creatorRole.includes('system_admin') || 
                creatorRole.includes('systemadmin') ||
                creatorRole.includes('super');
              
              if (isSysAdminByRole) {
                isSysAdmin = true;
              }
              
              console.log('Creator role:', creatorRole, 'Is System Admin by role:', isSysAdminByRole);
            } else if (electionData.created_by_role) {
              // Check if there's a separate created_by_role field
              const creatorRole = electionData.created_by_role.toLowerCase();
              console.log('Creator role from separate field:', creatorRole);
              
              const isSysAdminByRole = 
                creatorRole.includes('superadmin') || 
                creatorRole.includes('system_admin') || 
                creatorRole.includes('systemadmin') ||
                creatorRole.includes('super');
                
              if (isSysAdminByRole) {
                isSysAdmin = true;
              }
              
              console.log('Creator role from field:', creatorRole, 'Is System Admin by role:', isSysAdminByRole);
            }
            
            // Set the final determination
            setIsSystemAdminCreator(isSysAdmin);
            console.log('Final determination - Can edit (is system admin created):', isSysAdmin);
          } catch (error) {
            console.error('Error checking creator:', error);
            // Default to false for safety
            setIsSystemAdminCreator(false);
          }
        } else {
          // Default to false if no creator info
          setIsSystemAdminCreator(false);
        }

        if (electionData?.ballot?.positions && !electionData.positions) {
          electionData.positions = electionData.ballot.positions.map(pos => ({
            id: pos.position_id || pos.id,
            name: pos.position_name || pos.name,
            max_choices: pos.max_choices,
            candidates: pos.candidates
          }));
        }
        
        const imageCache = {};
        if (electionData?.positions) {
          electionData.positions.forEach(position => {
            position.candidates?.forEach(candidate => {
              if (candidate.image_url) {
                const processedUrl = getImageUrl(candidate.image_url);
                imageCache[candidate.id] = processedUrl;
              }
            });
          });
        }
        
        try {
          const eligibilityCriteriaResponse = await fetchWithAuth(`/elections/${params.id}/criteria`);
          console.log('Eligibility criteria response:', eligibilityCriteriaResponse);
          
          electionData.eligibility_criteria = eligibilityCriteriaResponse.criteria || {};
        } catch (criteriaErr) {
          console.error('Error fetching eligibility criteria:', criteriaErr);
          electionData.eligibility_criteria = {};
        }
        
        setCandidateImages(imageCache);
        setElection(electionData);
      } catch (err) {
        console.error('Error loading election details:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      loadElectionDetails();
    }
  }, [params.id]);

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

  const getEligibilityCriteria = () => {
    const criteria = election.eligibility_criteria || {};
    
    // Helper function to remove duplicates from an array (case-insensitive)
    const removeDuplicates = (array) => {
      if (!Array.isArray(array)) return [];
      
      // Use a Map to track normalized values
      const seen = new Map();
      return array.filter(item => {
        if (!item) return false;
        
        // Use lowercase for case-insensitive comparison
        const normalizedItem = item.toString().toLowerCase();
        if (seen.has(normalizedItem)) return false;
        
        seen.set(normalizedItem, true);
        return true;
      });
    };
    
    // Combine and deduplicate year levels from both property names
    const yearLevels = removeDuplicates([
      ...(criteria.year_levels || []), 
      ...(criteria.yearLevels || [])
    ]);
    
    return {
      courses: criteria.courses || criteria.programs || [],
      year_levels: yearLevels,
      genders: criteria.genders || criteria.gender || [],
      semesters: criteria.semesters || criteria.semester || [],
      precincts: criteria.precincts || criteria.precinct || []
    };
  };

  const parseElectionDate = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return 'Date not set';
      
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    
      const timeParts = timeStr.includes(':') ? timeStr.split(':') : [timeStr, '00'];
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      const dateObj = new Date(year, month - 1, day + 1, hours, minutes);
      
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      }).format(dateObj);
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'Invalid date';
    }
  };


  const eligibilityCriteria = getEligibilityCriteria();

  const formatResultsData = (positions) => {
    if (!positions || positions.length === 0) return [];

    return positions.map(position => {
      const sortedCandidates = [...(position.candidates || [])].sort((a, b) => 
        (b.vote_count || 0) - (a.vote_count || 0)
      );

      // Create chart data with individual colors for each candidate
      const chartData = sortedCandidates.map((candidate, index) => ({
        name: `${candidate.first_name} ${candidate.last_name}`,
        votes: candidate.vote_count || 0, 
        party: candidate.party || 'Independent',
        // Assign a color based on index, cycling through the array if needed
        color: CHART_COLORS[index % CHART_COLORS.length]
      }));
      
      return {
        ...position,
        sortedCandidates,
        chartData
      };
    });
  };

  const hasResults = election.positions && election.positions.length > 0 && !election.needs_approval;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            election.needs_approval ? 'bg-purple-100 text-purple-800' :
            election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
            election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {election.needs_approval ? 'NEEDS APPROVAL' : election.status.toUpperCase()}
          </span>
          
          {/* Only show edit buttons if system admin created the election */}
          {(election.needs_approval || election.status === 'upcoming' || election.status === 'ongoing') ? (
            isSystemAdminCreator ? (
              <>
                <Link
                  href={`/superadmin/election/${election.id}/edit`}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Election
                </Link>
                {election.status !== 'ongoing' && (
                  <Link
                    href={`/superadmin/election/${election.id}/ballot`}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Ballot
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed">
                <Lock className="w-4 h-4 mr-2" />
                {election.needs_approval ? 'Need Approval - Admin Created' : 'Admin Created (View Only)'}
              </div>
            )
          ) : (
            <div className="flex items-center px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              {election.status === 'ongoing' ? 'Election In Progress' : 'Election Completed'}
            </div>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-black">Title: {election.title}</h1>
      <p className="text-gray-600 mb-6 text-black">Description: {election.description}</p>

      {/* Created By Information */}
      <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Created by: </span>
          {election.created_by ? (
            typeof election.created_by === 'object' ? 
              <span className="text-black">
                {election.created_by.first_name && election.created_by.last_name ? 
                  `${election.created_by.first_name} ${election.created_by.last_name}` : 
                  election.created_by.name || election.created_by.username || 
                  election.created_by.email || ''}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isSystemAdminCreator 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isSystemAdminCreator ? 'System Admin' : 'Admin'}
                </span>
              </span> :
              <span className="text-black">
                {election.created_by_name && (
                  <span>{election.created_by_name} </span>
                )}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isSystemAdminCreator || election.created_by === 1 || election.created_by === '1'
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isSystemAdminCreator || election.created_by === 1 || election.created_by === '1' 
                    ? 'System Admin' 
                    : 'Admin'}
                </span>
              </span>
          ) : 'Unknown'}
          
          {election.created_at && (
            <span className="ml-2">
              on {new Date(election.created_at).toLocaleDateString()} at {new Date(election.created_at).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

      {/* Approval Section */}
      {election.needs_approval && (
        <div className="mb-6 p-4 rounded-lg border-2 border-yellow-400 bg-yellow-50">
          <div className="flex items-center gap-2 mb-2 text-yellow-800">
            <ExclamationTriangle size={20} />
            <h3 className="font-bold text-black">This election requires your approval</h3>
          </div>
          <p className="mb-3 text-black">
            Please review the election details and ballot before approving.
            {!isSystemAdminCreator && (
              <span className="block mt-1 text-sm font-medium text-yellow-800">
                Created by an Admin user - this election cannot be edited, only approved or rejected.
              </span>
            )}
          </p>
          <div className="flex gap-3">
            {/* Remove edit button in approval section */}
            
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const token = Cookies.get('token');
                  const response = await fetch(`${API_BASE}/elections/${election.id}/approve`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to approve election');
                  }
                  
                  toast.success('Election approved successfully');
                  // Refresh the page data
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                } catch (error) {
                  toast.error(error.message || 'Failed to approve election');
                  console.error('Error approving election:', error);
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              <Check size={16} />
              {loading ? 'Processing...' : 'Approve'}
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reject this election?')) {
                  setLoading(true);
                  fetch(`${API_BASE}/elections/${election.id}/reject`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${Cookies.get('token')}`,
                      'Content-Type': 'application/json'
                    }
                  })
                  .then(response => {
                    if (!response.ok) {
                      return response.json().then(data => {
                        throw new Error(data.message || 'Failed to reject election');
                      });
                    }
                    toast.success('Election rejected successfully');
                    setTimeout(() => {
                      router.push('/superadmin/election');
                    }, 1500);
                  })
                  .catch(error => {
                    toast.error(error.message || 'Failed to reject election');
                    console.error('Error rejecting election:', error);
                  })
                  .finally(() => {
                    setLoading(false);
                  });
                }
              }}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              <X size={16} />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Election & Ballot Details
          </button>
          {hasResults && (
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {election.status === 'completed' ? 'Final Results' : 'Partial Results'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <>
          {/* Election Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-black flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time
              </h3>
              <p className="text-gray-800">
                <span>Starts: {parseElectionDate(election.date_from, election.start_time)}</span>
              </p>
              <p className="text-gray-800">
                <span>Ends: {parseElectionDate(election.date_to, election.end_time)}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-black flex items-center gap-2">
                <Users className="w-4 h-4" />
                Voter Information
              </h3>
              <p className="text-gray-800">
                Eligible Voters: {election.voter_count || 0}
              </p>
              {(election.status === 'ongoing' || election.status === 'completed') && (
                <p className="text-gray-800">
                  Votes Cast: {election.vote_count || 0}
                  {election.voter_count > 0 && (
                    <span className="text-sm ml-1">
                      ({Math.round(((election.vote_count || 0) / election.voter_count) * 100)}%)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-black flex items-center gap-2">
                <List className="w-4 h-4" />
                Election/Event Type
              </h3>
              <p className="text-gray-800">{election.election_type}</p>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-black">Eligibility Criteria</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <h3 className="font-medium text-black mb-1">Courses</h3>
                {eligibilityCriteria.courses && eligibilityCriteria.courses.length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.courses.map(course => (
                      <li key={course}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All courses are eligible</p>
                )}
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Year Levels</h3>
                {eligibilityCriteria.year_levels && eligibilityCriteria.year_levels.length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.year_levels.map(year => (
                      <li key={year}>{year}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All year levels are eligible</p>
                )}
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Genders</h3>
                {eligibilityCriteria.genders && eligibilityCriteria.genders.length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.genders.map(gender => (
                      <li key={gender}>{gender}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All genders are eligible</p>
                )}
              </div>
              <div>
                <h3 className="font-medium text-black mb-1 text-black">Semesters</h3>
                {eligibilityCriteria.semesters && eligibilityCriteria.semesters.filter(Boolean).length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.semesters.filter(Boolean).map(semester => (
                      <li key={semester}>{semester}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All semesters are eligible</p>
                )}
              </div>
              <div>
                <h3 className="font-medium text-black mb-1 text-black">Precincts</h3>
                {eligibilityCriteria.precincts && eligibilityCriteria.precincts.filter(Boolean).length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.precincts.filter(Boolean).map(precinct => (
                      <li key={precinct}>{precinct}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All precincts are eligible</p>
                )}
              </div>
            </div>
          </div>

          {/* Ballot Section */}
          {election.positions && election.positions.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Ballot Details</h2>
                
                {(election.needs_approval || election.status === 'upcoming') && isSystemAdminCreator && (
                  <Link
                    href={`/superadmin/election/${election.id}/ballot`}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Ballot
                  </Link>
                )}
              </div>
              
              {election.needs_approval && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                  <p className="text-sm text-yellow-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please review all positions and candidates before approving this election.
                  </p>
                </div>
              )}
              
              <div className="space-y-6">
                {election.positions.map(position => (
                  <div key={position.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium text-black">
                        {position.name} ({position.max_choices === 1 ? 'Single choice' : `Select up to ${position.max_choices}`})
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {position.candidates && position.candidates.length > 0 ? (
                        position.candidates.map(candidate => (
                          <div key={candidate.id} className="border rounded p-3 flex items-center">
                            <div className="relative w-32 h-32">
                              {candidate.image_url && !imageErrors[candidate.id] ? (
                                <Image
                                  src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                  alt={`${candidate.first_name} ${candidate.last_name}`}
                                  fill
                                  sizes="128px"
                                  className="object-cover rounded-lg"
                                  onError={() => handleImageError(candidate.id)}
                                />
                              ) : (
                                <div className="w-32 h-32 rounded-lg overflow-hidden mr-4 bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                  <User className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 ml-4">
                              <p className="font-medium text-black mb-1">
                               <span className="">Full Name: </span>{candidate.first_name} {candidate.last_name}
                              </p>
                              {candidate.party && (
                                <p className="text-sm text-black mb-1">  <span className="font-bold">Partylist/Course: </span> {candidate.party}</p>
                              )}
                              {candidate.slogan && (
                                <p className="text-sm italic text-black mb-1">
                                   <span className="font-bold">Slogan: </span>"{candidate.slogan}"
                                </p>
                              )}
                              {candidate.platform && (
                                <p className="text-sm text-black"><span className="font-bold">Platform/Description:  </span> {candidate.platform}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-4 text-black">
                          No candidates for this position
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-yellow-700">
                    This election doesn't have a ballot yet.
                    {(election.needs_approval || election.status === 'upcoming') && isSystemAdminCreator && (
                      <>
                        <span className="font-medium"> A ballot is required before {election.needs_approval ? 'approval' : 'the election can start'}.</span>
                        <Link
                          href={`/superadmin/election/${election.id}/ballot/create`}
                          className="ml-2 inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded-md hover:bg-yellow-700"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Create Ballot Now
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Vote Results Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">
                {election.status === 'completed' ? 'Final Results' : 'Partial Results'}
              </h2>
              
              {election.status !== 'completed' && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Preliminary Results - Voting Still In Progress
                </div>
              )}
            </div>
            
            {formatResultsData(election.positions).map(position => (
              <div key={position.id} className="mb-8 border-b pb-6">
                <h3 className="text-lg font-medium text-black mb-4">{position.name}</h3>
                
                {/* Winner banner (for completed elections) */}
                {election.status === 'completed' && position.sortedCandidates.length > 0 && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-1 text-blue-600" />
                      Winner for {position.name}
                    </h4>
                    <div className="flex items-center">
                      <div className="relative w-16 h-16 mr-4">
                        {position.sortedCandidates[0].image_url && !imageErrors[position.sortedCandidates[0].id] ? (
                          <Image
                            src={candidateImages[position.sortedCandidates[0].id] || getImageUrl(position.sortedCandidates[0].image_url)}
                            alt={`${position.sortedCandidates[0].first_name} ${position.sortedCandidates[0].last_name}`}
                            fill
                            sizes="64px"
                            className="object-cover rounded-full border-2 border-blue-500"
                            onError={() => handleImageError(position.sortedCandidates[0].id)}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center border-2 border-blue-500">
                            <User className="w-8 h-8 text-blue-600" />
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                          <Award className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-black text-lg">
                          {position.sortedCandidates[0].first_name} {position.sortedCandidates[0].last_name}
                        </h4>
                        {position.sortedCandidates[0].party && (
                          <div className="mt-1">
                            <span className="font-medium text-sm text-black">Partylist:</span>
                            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded">
                              {position.sortedCandidates[0].party}
                            </span>
                          </div>
                        )}
                        <div className="mt-2">
                          <span className="font-medium text-sm text-black">Votes:</span>
                          <span className="ml-1 text-black font-bold">
                            {position.sortedCandidates[0].vote_count || 0} 
                          </span>
                          <span className="ml-1 text-blue-600">
                            ({position.sortedCandidates[0].percentage || 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Results chart */}
                <div className="h-72 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={position.chartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [`${value} votes`, 'Votes']}
                        labelFormatter={(name) => `${name}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="votes" 
                        name="Vote Count" 
                        // Use the color property from each data point instead of a fixed fill
                        fill="#3b82f6" 
                        // Add this to use individual colors for each bar
                        isAnimationActive={true}
                      >
                        {position.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Candidates sorted by votes */}
                <div className="space-y-3">
                  {position.sortedCandidates.map((candidate, index) => (
                    <div key={candidate.id} className={`flex items-center p-3 rounded-lg ${index === 0 && election.status === 'completed' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <div className="relative w-16 h-16 mr-4">
                        {candidate.image_url && !imageErrors[candidate.id] ? (
                          <Image
                            src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                            alt={`${candidate.first_name} ${candidate.last_name}`}
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
                        {index === 0 && election.status === 'completed' && (
                          <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                            <Award className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="font-medium text-black">
                            {candidate.first_name} {candidate.last_name}
                          </h4>
                          {candidate.party && (
                            <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {candidate.party}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${candidate.percentage || 0}%` }}
                            />
                          </div>
                          <span className="ml-3 text-black">
                            {candidate.vote_count || 0} votes ({candidate.percentage || 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {election.status === 'completed' && (
                <>
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-black mb-2">Election Summary</h3>
                    <p className="text-black">
                      Total Votes Cast: <span className="font-semibold">{election.vote_count || 0}</span> out of <span className="font-semibold">{election.voter_count || 0}</span> eligible voters
                      ({election.voter_count ? Math.round((election.vote_count / election.voter_count) * 100) : 0}% participation)
                    </p>
                    <p className="text-black mt-1">
                      Election Completed: {new Date(election.date_to).toLocaleDateString()} at {election.end_time}
                    </p>
                  </div>
                </>
              )}
          </div>
        </>
      )}
    </div>
  );
}