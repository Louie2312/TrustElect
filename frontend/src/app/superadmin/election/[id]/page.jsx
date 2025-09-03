"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Calendar, Clock, Users, CheckCircle, 
  ChevronLeft, List, User, Edit, Plus,
  AlertTriangle as ExclamationTriangle,
  Lock, Award, ArrowDown, ArrowUp, PieChart,
  AlertCircle, XCircle, Check, X, Maximize2, Minimize2
} from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { BASE_URL } from '@/config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    } else {

      throw new Error(`Request failed with status ${response.status}`);
    }
  }

  const text = await response.text();
  if (!text) {
    return {}; 
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

const statusTabs = [
  { id: 'ongoing', name: 'Ongoing Elections', icon: <Clock className="w-4 h-4" /> },
  { id: 'upcoming', name: 'Upcoming Elections', icon: <Calendar className="w-4 h-4" /> },
  { id: 'completed', name: 'Completed Elections', icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'to_approve', name: 'To Approve', icon: <AlertCircle className="w-4 h-4 text-purple" /> },
];

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const partialCountingRef = useRef(null);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await partialCountingRef.current.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error('Error attempting to enable full-screen mode:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

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
        const data = await fetchWithAuth(`${API_BASE}/elections/${params.id}/details`);
        
        let electionData = data.election;

        if (electionData && electionData.created_by) {
          try {
            let isSysAdmin = false;

            if (typeof electionData.created_by === 'object') {
              const creatorId = electionData.created_by.id || '';
              if (creatorId === 1 || creatorId === '1') {
            
                isSysAdmin = true;
              }
            } else if (electionData.created_by === 1 || electionData.created_by === '1') {
            
              isSysAdmin = true;
              
              try {

                electionData.created_by_name = "System Administrator";
                electionData.created_by_role = "SuperAdmin";
              } catch (creatorFetchError) {
                console.error('Error setting creator details:', creatorFetchError);
                electionData.created_by_name = "System Administrator";
              }
            } else if (typeof electionData.created_by === 'number' || typeof electionData.created_by === 'string') {

              electionData.created_by_name = "";  
              electionData.created_by_role = "Admin";
            }

            if (typeof electionData.created_by === 'object' && electionData.created_by.role) {
              const creatorRole = electionData.created_by.role.toLowerCase();

              const isSysAdminByRole = 
                creatorRole.includes('superadmin') || 
                creatorRole.includes('system_admin') || 
                creatorRole.includes('systemadmin') ||
                creatorRole.includes('super');
              
              if (isSysAdminByRole) {
                isSysAdmin = true;
              }
                   
            } else if (electionData.created_by_role) {

              const creatorRole = electionData.created_by_role.toLowerCase();
              
              const isSysAdminByRole = 
                creatorRole.includes('superadmin') || 
                creatorRole.includes('system_admin') || 
                creatorRole.includes('systemadmin') ||
                creatorRole.includes('super');
                
              if (isSysAdminByRole) {
                isSysAdmin = true;
              }

            }

            setIsSystemAdminCreator(isSysAdmin);

          } catch (error) {
            console.error('Error checking creator:', error);

            setIsSystemAdminCreator(false);
          }
        } else {

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
          // Get the complete election data which includes precinct programs
          const completeElectionData = await fetchWithAuth(`${API_BASE}/elections/${params.id}`);
          
          // Get the eligibility criteria from the /criteria endpoint
          const eligibilityCriteriaResponse = await fetchWithAuth(`${API_BASE}/elections/${params.id}/criteria`);
          
          // Merge the data from both endpoints
          electionData.eligibility_criteria = {
            ...(eligibilityCriteriaResponse.criteria || {}),
            precinctPrograms: completeElectionData.eligible_voters?.precinctPrograms || {},
            precinct: completeElectionData.eligible_voters?.precinct || []
          };
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

    const removeDuplicates = (array) => {
      if (!Array.isArray(array)) return [];

      const seen = new Map();
      return array.filter(item => {
        if (!item) return false;

        const normalizedItem = item.toString().toLowerCase();
        if (seen.has(normalizedItem)) return false;
        
        seen.set(normalizedItem, true);
        return true;
      });
    };

    const yearLevels = removeDuplicates([
      ...(criteria.year_levels || []), 
      ...(criteria.yearLevels || [])
    ]);
    
    // Get precincts from the merged data
    const precincts = criteria.precinct || [];
    
    // Get precinctPrograms from the merged data
    const precinctPrograms = criteria.precinctPrograms || {};
    
    return {
      courses: criteria.courses || criteria.programs || [],
      year_levels: yearLevels,
      genders: criteria.genders || criteria.gender || [],
      semesters: criteria.semesters || criteria.semester || [],
      precincts: precincts,
      precinctPrograms: precinctPrograms
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

      const chartData = sortedCandidates.map((candidate, index) => ({
        name: formatNameSimple(candidate.last_name, candidate.first_name, candidate.name),
        votes: candidate.vote_count || 0, 
        party: candidate.party || 'Independent',
        percentage: election.voter_count ? ((candidate.vote_count || 0) / election.voter_count * 100).toFixed(2) : '0.00',
        color: CHART_COLORS[index % CHART_COLORS.length]
      }));
      
      return {
        ...position,
        sortedCandidates,
        chartData
      };
    });
  };

  const hasResults = election.positions && election.positions.length > 0 && 
    (election.status === 'ongoing' || election.status === 'completed');

  const isSuperAdminCreator =
    election.created_by === 1 ||
    (election.created_by && election.created_by.id === 1) ||
    election.created_by_role === 'SuperAdmin';

  const getTop3AndOtherCandidates = (candidates) => {
    if (!candidates || candidates.length === 0) return { top3: [], others: [] };
    
    const sortedCandidates = [...candidates].sort((a, b) => 
      (b.vote_count || 0) - (a.vote_count || 0)
    );
    
    return {
      top3: sortedCandidates.slice(0, 3),
      others: sortedCandidates.slice(3)
    };
  };

  const getRankLabel = (index) => {
    switch(index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      default: return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">

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
            election.needs_approval && !isSuperAdminCreator ? 'bg-purple-100 text-purple-800' :
            election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
            election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {election.needs_approval && !isSuperAdminCreator ? 'NEEDS APPROVAL' : election.status.toUpperCase()}
          </span>
   
          {(election.needs_approval || election.status === 'upcoming' || election.status === 'ongoing' || election.status === 'completed') ? (
            isSystemAdminCreator ? (
              <>
                <Link
                  href={`/superadmin/election/${election.id}/edit`}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Election
                </Link>
                {(election.status !== 'ongoing' && election.status !== 'completed') && (
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

      {election.needs_approval && !isSuperAdminCreator && (
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
            <>
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
              <button
                onClick={() => setActiveTab('partial')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'partial'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Partial Counting
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'details' ? (
        <>
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
                Eligible Voters: {Number(election.voter_count || 0).toLocaleString()}
              </p>
              {(election.status === 'ongoing' || election.status === 'completed') && (
                <p className="text-gray-800">
                  Votes Cast: {Number(election.vote_count || 0).toLocaleString()}
                  {election.voter_count > 0 && (
                    <span className="text-sm ml-1">
                      ({((election.vote_count || 0) / election.voter_count * 100).toFixed(2)}%)
                    </span>
                  )}
                  {election.voter_count === 0 && (
                    <span className="text-sm ml-1">(0.00%)</span>
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
                <h3 className="font-medium text-black mb-1">Semesters</h3>
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
                <h3 className="font-medium text-black mb-1">Precincts</h3>
                {eligibilityCriteria.precincts && eligibilityCriteria.precincts.filter(Boolean).length > 0 ? (
                  <ul className="list-disc list-inside text-black">
                    {eligibilityCriteria.precincts.filter(Boolean).map(precinct => (
                      <li key={precinct} className="mb-3">
                        <span className="font-medium">{precinct}</span>
                        {eligibilityCriteria.precinctPrograms && 
                         eligibilityCriteria.precinctPrograms[precinct] && 
                         Array.isArray(eligibilityCriteria.precinctPrograms[precinct]) && 
                         eligibilityCriteria.precinctPrograms[precinct].length > 0 ? (
                          <div className="ml-5 mt-1">
                            <span className="text-black text-sm">
                              <span className="font-medium">Assigned Programs:</span> {eligibilityCriteria.precinctPrograms[precinct].join(', ')}
                            </span>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">All precincts are eligible</p>
                )}
              </div>
            </div>
          </div>

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
              
          <div className="space-y-6">
            {election.positions.map(position => {
              const { top3, others } = getTop3AndOtherCandidates(position.candidates || []);
              
              return (
                <div key={position.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium text-black mb-4">
                    {position.name}
                  </h3>

                  <div className="space-y-3">
                    {/* Top 3 Candidates */}
                    {top3.map((candidate, index) => (
                      <div key={candidate.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="relative">
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
                            <div className={`absolute -top-2 -right-2 rounded-full p-1 text-xs font-bold ${
                              index === 0 ? 'bg-blue-500 text-white' :
                              index === 1 ? 'bg-gray-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              {getRankLabel(index)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-black">
                                {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                              </h4>
                              {candidate.party && (
                                <span className="text-sm text-black">
                                  {candidate.party}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-black text-lg">
                                {Number(candidate.vote_count || 0).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600">
                                {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Other Candidates */}
                    {others.map(candidate => (
                      <div key={candidate.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
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
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-black">
                                {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                              </h4>
                              {candidate.party && (
                                <span className="text-sm text-black">
                                  {candidate.party}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-black text-lg">
                                {Number(candidate.vote_count || 0).toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600">
                                {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {position.candidates && position.candidates.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No candidates for this position
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
      ) : activeTab === 'results' ? (
        <>
          {/* Vote Summary Section */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-500">Total Voters</div>
                  <div className="font-bold text-black">{Number(election.voter_count || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-500">Votes Cast</div>
                  <div className="font-bold text-black">{Number(election.vote_count || 0).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-500">Votes Percentage</div>
                  <div className="font-bold text-black">
                    {election.voter_count ? ((election.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vote Results Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">
                {election.status === 'completed' ? 'Final Results' : 'Partial Results'}
              </h2>
              
              {election.status === 'ongoing' && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Preliminary Results - Voting Still In Progress
                </div>
              )}
            </div>
            
            {election.positions && election.positions.length > 0 ? (
              formatResultsData(election.positions).map(position => (
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
                            {formatNameSimple(position.sortedCandidates[0].last_name, position.sortedCandidates[0].first_name, position.name)}
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
                              {Number(position.sortedCandidates[0].vote_count || 0).toLocaleString()} 
                            </span>
                            <span className="ml-1 text-blue-600">
                              ({election.voter_count ? (position.sortedCandidates[0].vote_count / election.voter_count * 100).toFixed(2) : 0}% of eligible voters)
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
                          formatter={(value, name) => [`${value} votes (${election.voter_count ? ((value / election.voter_count) * 100).toFixed(2) : '0.00'}% `, 'Votes']}
                          labelFormatter={(name) => `${name}`}
                        />
                        <Legend />
                        <Bar 
                          dataKey="votes" 
                          name="Vote Count" 
                          fill="#3b82f6" 
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
                              {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                            </h4>
                            {candidate.party && (
                              <span className="ml-2 px-2 py-1 bg-gray-100 text-black text-xs rounded">
                                {candidate.party}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center mt-1">
                            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${election.voter_count ? (candidate.vote_count / election.voter_count * 100).toFixed(2) : 0}%` }}
                              />
                            </div>
                            <span className="ml-3 text-black">
                              {Number(candidate.vote_count || 0).toLocaleString()} votes ({election.voter_count ? (candidate.vote_count / election.voter_count * 100).toFixed(2) : 0}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No results available yet
              </div>
            )}
            
            {election.status === 'completed' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-black mb-2">Election Summary</h3>
                <p className="text-black">
                  Total Votes Cast: <span className="font-semibold">{Number(election.vote_count || 0).toLocaleString()}</span> out of <span className="font-semibold">{Number(election.voter_count || 0).toLocaleString()}</span> eligible voters
                  ({election.voter_count ? ((election.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}% participation)
                </p>
                <p className="text-black mt-1">
                  Election Completed: {new Date(election.date_to).toLocaleDateString()} at {election.end_time}
                </p>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'partial' ? (
        <div ref={partialCountingRef} className={`${isFullScreen ? 'fixed inset-0 bg-white z-50 overflow-y-auto p-4' : ''}`}>
          {/* Vote Summary Section */}
          <div className={`bg-white rounded-lg shadow p-4 mb-6 ${isFullScreen ? 'sticky top-0 z-10' : ''}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${isFullScreen ? 'space-x-12' : 'space-x-8'}`}>
                <div className="flex items-center">
                  <Users className={`${isFullScreen ? 'w-6 h-6' : 'w-5 h-5'} mr-2 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-base' : 'text-sm'} text-gray-500`}>Total Voters</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-xl' : ''}`}>{Number(election.voter_count || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className={`${isFullScreen ? 'w-6 h-6' : 'w-5 h-5'} mr-2 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-base' : 'text-sm'} text-gray-500`}>Votes Cast</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-xl' : ''}`}>{Number(election.vote_count || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <PieChart className={`${isFullScreen ? 'w-6 h-6' : 'w-5 h-5'} mr-2 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-base' : 'text-sm'} text-gray-500`}>Votes Percentage</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-xl' : ''}`}>
                      {election.voter_count ? ((election.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFullScreen}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 mr-2" />
                    Exit Full Screen
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Full Screen
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Partial Counting Results */}
          <div className={`bg-white rounded-lg shadow p-6 ${isFullScreen ? 'mx-auto max-w-7xl' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`${isFullScreen ? 'text-3xl' : 'text-xl'} font-semibold text-black`}>Partial Vote Counting</h2>
              <div className={`px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full ${isFullScreen ? 'text-base' : 'text-sm'}`}>
                Partial Updates
              </div>
            </div>

            {election.positions && election.positions.length > 0 ? (
              <div className="space-y-10">
                {election.positions.map(position => {
                  const { top3, others } = getTop3AndOtherCandidates(position.candidates || []);
                  
                  return (
                    <div key={position.id} className={`border rounded-lg p-6 ${isFullScreen ? 'shadow-lg' : ''}`}>
                      <h3 className={`${isFullScreen ? 'text-2xl' : 'text-lg'} font-medium text-black mb-6`}>
                        {position.name}
                      </h3>

                      {/* Top 3 Candidates - Displayed prominently */}
                      {top3.length > 0 && (
                        <div className={`mb-8 ${isFullScreen ? 'grid grid-cols-3 gap-6' : 'space-y-3'}`}>
                          {top3.map((candidate, index) => (
                            <div 
                              key={candidate.id} 
                              className={`${isFullScreen ? 'flex flex-col items-center text-center p-6' : 'flex items-center p-3'} 
                                bg-gray-50 rounded-lg border ${index === 0 ? 'border-blue-300' : index === 1 ? 'border-gray-300' : 'border-gray-200'} 
                                ${isFullScreen && index === 0 ? 'shadow-lg bg-blue-50' : ''}`}
                            >
                              <div className={`relative ${isFullScreen ? 'mb-4' : ''}`}>
                                <div className={`relative ${isFullScreen ? 'w-32 h-32' : 'w-16 h-16'} ${!isFullScreen ? 'mr-4' : ''}`}>
                                  {candidate.image_url && !imageErrors[candidate.id] ? (
                                    <Image
                                      src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                      alt={`${candidate.first_name} ${candidate.last_name}`}
                                      fill
                                      sizes={isFullScreen ? "128px" : "64px"}
                                      className="object-cover rounded-full"
                                      priority
                                      onError={() => handleImageError(candidate.id)}
                                    />
                                  ) : (
                                    <div className={`${isFullScreen ? 'w-32 h-32' : 'w-16 h-16'} rounded-full bg-gray-200 flex items-center justify-center`}>
                                      <User className={`${isFullScreen ? 'w-16 h-16' : 'w-8 h-8'} text-gray-400`} />
                                    </div>
                                  )}
                                  <div className={`absolute -top-2 -right-2 rounded-full p-1.5 text-xs font-bold ${
                                    index === 0 ? 'bg-blue-500 text-white' :
                                    index === 1 ? 'bg-gray-500 text-white' :
                                    'bg-gray-400 text-white'
                                  } ${isFullScreen ? 'text-base p-2' : ''}`}>
                                    {getRankLabel(index)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className={`${isFullScreen ? 'w-full' : 'flex-1'}`}>
                                <div className={`${isFullScreen ? '' : 'flex items-center justify-between'}`}>
                                  <div>
                                    <h4 className={`font-medium text-black ${isFullScreen ? 'text-xl mb-2' : ''}`}>
                                      {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                    </h4>
                                    {candidate.party && (
                                      <span className={`${isFullScreen ? 'block px-3 py-1 bg-gray-100 rounded-full mb-3' : 'text-sm'} text-black`}>
                                        {candidate.party}
                                      </span>
                                    )}
                                  </div>
                                  <div className={`${isFullScreen ? 'mt-4' : 'text-right'}`}>
                                    <div className={`font-bold text-black ${isFullScreen ? 'text-3xl' : 'text-lg'}`}>
                                      {Number(candidate.vote_count || 0).toLocaleString()}
                                    </div>
                                    <div className={`${isFullScreen ? 'text-base' : 'text-sm'} text-gray-600`}>
                                      {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                                    </div>
                                  </div>
                                </div>
                                {isFullScreen && (
                                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-3">
                                    <div 
                                      className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-gray-500' : 'bg-gray-400'}`}
                                      style={{ width: `${election.voter_count ? (candidate.vote_count / election.voter_count * 100).toFixed(2) : 0}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Other Candidates - Displayed in a grid when in fullscreen */}
                      {others.length > 0 && (
                        <div>
                          <h4 className={`font-medium text-gray-700 mb-3 ${isFullScreen ? 'text-xl' : ''}`}>Other Candidates</h4>
                          <div className={`${isFullScreen ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-3'}`}>
                            {others.map(candidate => (
                              <div 
                                key={candidate.id} 
                                className={`flex items-center p-3 bg-gray-50 rounded-lg ${isFullScreen ? 'shadow-sm' : ''}`}
                              >
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
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className={`font-medium text-black ${isFullScreen ? 'text-lg' : ''}`}>
                                        {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                      </h4>
                                      {candidate.party && (
                                        <span className="text-sm text-black">
                                          {candidate.party}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-bold text-black ${isFullScreen ? 'text-xl' : 'text-lg'}`}>
                                        {Number(candidate.vote_count || 0).toLocaleString()}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {position.candidates && position.candidates.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No candidates for this position
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No positions available
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}