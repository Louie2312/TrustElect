"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Calendar, Clock, Users, CheckCircle, 
  ChevronLeft, List, User, PieChart,
  AlertTriangle as ExclamationTriangle,
  Lock, Award, ArrowDown, ArrowUp, Edit, Plus, AlertCircle, X,
  Maximize2, Minimize2, ChevronRight, Play, Pause
} from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { BASE_URL } from '@/config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        // Handle forbidden error specifically to show a better error message
        throw new Error('Access denied: You do not have permission to view this election');
      }

      // Check if the response is JSON before trying to parse it
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `Request failed with status ${response.status}`);
      } else {
        // For non-JSON responses, get the text
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }
    }

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // If not JSON (which should be rare for successful responses), return text
      const text = await response.text();
      console.warn('Expected JSON response but got text:', text);
      return { success: true, message: text };
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
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
  const [tab, setTab] = useState('details');
  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidateImages, setCandidateImages] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCurrentUserCreator, setIsCurrentUserCreator] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const partialCountingRef = useRef(null);
  const intervalRef = useRef(null);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const carouselIntervalRef = useRef(null);

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

  const fetchElectionData = async () => {
    try {
      const data = await fetchWithAuth(`/elections/${params.id}/details`);
      
      let electionData = data.election;
     
      if (electionData) {
        if (data.created_by_role) {
          electionData.created_by_role = data.created_by_role;
        } else if (electionData.created_by && electionData.created_by.role) {
          electionData.created_by_role = electionData.created_by.role;
        } else {
          electionData.created_by_role = 'admin';
        }
        
        setIsCurrentUserCreator(true);
        
        if (electionData.ballot?.positions) {
          electionData.positions = electionData.ballot.positions.map(pos => ({
            id: pos.position_id || pos.id,
            name: pos.position_name || pos.name,
            max_choices: pos.max_choices,
            candidates: pos.candidates || []
          }));
        } else if (!electionData.positions && electionData.ballot?.id) {
          try {
            const ballotResponse = await fetchWithAuth(`/elections/${params.id}/ballot`);
            if (ballotResponse && ballotResponse.positions) {
              electionData.positions = ballotResponse.positions.map(pos => ({
                id: pos.position_id || pos.id,
                name: pos.position_name || pos.name,
                max_choices: pos.max_choices,
                candidates: pos.candidates || []
              }));
            }
          } catch (ballotError) {
            console.error('Error fetching additional ballot data:', ballotError);
          }
        }
        
        if (!electionData.positions) {
          electionData.positions = [];
        }
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
        const completeElectionData = await fetchWithAuth(`/elections/${params.id}`);
        const eligibilityCriteriaResponse = await fetchWithAuth(`/elections/${params.id}/criteria`);
        
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
      
      console.log('Election data updated:', {
        voter_count: electionData.voter_count,
        vote_count: electionData.vote_count,
        positions: electionData.positions?.length
      });
      
      return electionData;
    } catch (err) {
      console.error('Error fetching election data:', err);
      throw err;
    }
  };

  useEffect(() => {
    const loadElectionDetails = async () => {
      try {
        setIsLoading(true);
        await fetchElectionData();
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

  // Auto-refresh effect for partial counting in fullscreen
  useEffect(() => {
    if (isFullScreen && tab === 'partial' && election?.status === 'ongoing') {
      console.log('Starting auto-refresh for partial counting...');
      
      intervalRef.current = setInterval(async () => {
        try {
          await fetchElectionData();
        } catch (error) {
          console.error('Error during auto-refresh:', error);
        }
      }, 1000); // Refresh every 1 second
      
      return () => {
        if (intervalRef.current) {
          console.log('Clearing auto-refresh interval...');
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        console.log('Clearing auto-refresh interval (conditions not met)...');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isFullScreen, tab, election?.status, params.id]);

  // Position carousel effect for fullscreen
  useEffect(() => {
    if (isFullScreen && tab === 'partial' && election?.positions?.length > 1) {
      console.log('Starting position carousel...');
      
      carouselIntervalRef.current = setInterval(() => {
        setCurrentPositionIndex(prev => 
          prev + 1 >= election.positions.length ? 0 : prev + 1
        );
      }, 10000); // Change position every 10 seconds
      
      return () => {
        if (carouselIntervalRef.current) {
          console.log('Clearing carousel interval...');
          clearInterval(carouselIntervalRef.current);
          carouselIntervalRef.current = null;
        }
      };
    } else {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
      if (!isFullScreen) {
        setCurrentPositionIndex(0);
      }
    }
  }, [isFullScreen, tab, election?.positions?.length]);

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, []);

  const handleCancelElection = async () => {
    if (!confirm("Are you sure you want to cancel this election? This action cannot be undone.")) {
      return;
    }

    try {
      setIsCancelling(true);
      const token = Cookies.get('token');
      
      // Log the request for debugging
      console.log(`Attempting to delete election: ${election.id}`);
      
      // Using DELETE method with proper election endpoint
      const response = await fetch(`${API_BASE}/elections/${election.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to cancel election';
        
        try {
          // Try to parse as JSON, but handle case where response is not JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            // Not JSON, use text or status
            const errorText = await response.text();
            errorMessage = errorText || `Server returned ${response.status}: ${response.statusText}`;
          }
        } catch (parseErr) {
          console.error('Error parsing error response:', parseErr);
          errorMessage = `Server error (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      toast.success('Election has been cancelled successfully');
      
      // After successful cancellation, redirect to the elections list page
      setTimeout(() => {
        router.push('/admin/election');
      }, 1000);
    } catch (err) {
      console.error('Error cancelling election:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

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

  // Helper function to get eligibility criteria with proper naming
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

  // Get properly mapped eligibility criteria
  const eligibilityCriteria = getEligibilityCriteria();

  // Inside the component body, add a function to format results data
  const formatResultsData = (positions) => {
    if (!positions || positions.length === 0) return [];
    
    // Create formatted data for each position
    return positions.map(position => {
      // Sort candidates by vote count in descending order
      const sortedCandidates = [...(position.candidates || [])].sort((a, b) => 
        (b.vote_count || 0) - (a.vote_count || 0)
      );
      
      // Format for chart with unique colors
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

  // Check if election has a ballot
  const hasBallot = !!(election.ballot?.id || (election.positions && election.positions.length > 0));

  // Check if election has results to display
  const hasResults = election.positions && election.positions.length > 0 && 
    (election.status === 'ongoing' || election.status === 'completed');

  // Determine if the creator is a superadmin
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
            (election.needs_approval && !isSuperAdminCreator) ? 'bg-purple-100 text-purple-800' :
            election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
            election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {(election.needs_approval && !isSuperAdminCreator) ? 'PENDING APPROVAL' : election.status.toUpperCase()}
          </span>
          
          {/* Edit buttons for upcoming or pending approval elections - only shown if user is creator */}
          {((election.needs_approval && !isSuperAdminCreator) || election.status === 'upcoming') && isCurrentUserCreator && (
            <>
              <Link
                href={`/admin/election/${election.id}/edit`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Election
              </Link>
              
              {election.positions && election.positions.length > 0 ? (
                <Link
                  href={`/admin/election/${election.id}/ballot`}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Ballot
                </Link>
              ) : (
                <Link
                  href={`/admin/election/${election.id}/ballot`}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ballot
                </Link>
              )}
              
              {/* Cancel button for pending approval elections, only if not superadmin creator */}
              {(election.needs_approval && !isSuperAdminCreator) && (
                <button
                  onClick={handleCancelElection}
                  disabled={isCancelling}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  {isCancelling ? (
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Cancel Election
                </button>
              )}
            </>
          )}
          {!(election.needs_approval || election.status === 'upcoming') && (
            <div className="flex items-center px-4 py-2 bg-gray-200 text-gray-600 rounded cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              {election.status === 'ongoing' ? 'Election In Progress' : 'Election Completed'}
            </div>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-black">Title: {election.title}</h1>
      <p className="text-gray-600 mb-6 text-black">Description: {election.description}</p>

      {/* Approval Section */}
      {(election.needs_approval && !isSuperAdminCreator) && (
        <div className="mb-6 p-4 rounded-lg border-2 border-yellow-400 bg-yellow-50">
          <div className="flex items-center gap-2 mb-2 text-yellow-800">
            <AlertCircle size={20} />
            <h3 className="font-bold">Election pending approval</h3>
          </div>
          <p className="mb-2 text-sm text-black">
            This election is waiting for approval from a System Admin before it can be published.
            {isCurrentUserCreator && " You can still edit all aspects of this election while waiting for approval."}
          </p>
          <div className="flex justify-between items-center">
            <p className="text-xs text-black">
              Only System Admin can approve or reject elections.
            </p>
            <button
              onClick={handleCancelElection}
              disabled={isCancelling}
              className="text-sm flex items-center text-red-600 hover:text-red-800"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel this election request'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Election & Ballot Details
          </button>
          {hasResults && (
            <>
              <button
                onClick={() => setTab('results')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  tab === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {election.status === 'completed' ? 'Final Results' : 'Partial Results'}
              </button>
              <button
                onClick={() => setTab('partial')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  tab === 'partial'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Counting
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'details' ? (
        <>
          {/* Election Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-black">Date & Time</h3>
              <p className="text-gray-800">
                <span>Starts: {parseElectionDate(election.date_from, election.start_time)}</span>
              </p>
              <p className="text-gray-800">
                <span>Ends: {parseElectionDate(election.date_to, election.end_time)}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium mb-2 text-black">Voter Information</h3>
              <p className="text-gray-800">
                Eligible Voters: {Number(election.voter_count || 0).toLocaleString()}
              </p>
              <p className="text-gray-800">
                Votes Cast: {Number(election.vote_count || 0).toLocaleString()} {election.voter_count ? `(${((election.vote_count / election.voter_count) * 100).toFixed(2)}%)` : '(0.00%)'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500 mb-2">Election/Event Type</h3>
              <p className="text-gray-800">{election.election_type}</p>
            </div>
          </div>

          {/* Eligibility Criteria */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Eligibility Criteria</h2>
            </div>
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

          {/* Ballot Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Ballot</h2>
            </div>
            
            {election.positions && election.positions.length > 0 ? (
              <div>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-green-700">
                      This election has a ballot with {election.positions?.length || 0} positions
                    </p>
                  </div>
                </div>
                
                {/* Ballot description */}
                {election.ballot?.description && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-md font-medium text-black mb-2">Ballot Description</h3>
                    <p className="text-black">{election.ballot.description}</p>
                  </div>
                )}
                
                {/* Positions and candidates */}
                <div className="space-y-6 mt-4">
                  <h3 className="text-lg font-medium text-black">Positions & Candidates</h3>
                  
                  {election.positions?.map((position) => (
                    <div key={position.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-semibold text-black">{position.name}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {position.max_choices > 1 ? `Select up to ${position.max_choices}` : 'Single choice'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {position.candidates?.map((candidate) => (
                          <div key={candidate.id} className="border rounded p-3 flex items-start">
                            <div className="relative w-32 h-32 mr-4">
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
                            <div className="flex-1">
                              <p className="font-medium text-black mb-1">
                                <span className="">Full Name: </span>{candidate.first_name} {candidate.last_name}
                              </p>
                              {candidate.party && (
                                <p className="text-sm text-black mb-1"><span className="font-bold">Partylist/Course: </span> {candidate.party}</p>
                              )}
                              {candidate.slogan && (
                                <p className="text-sm italic text-black mb-1">
                                  <span className="font-bold">Slogan: </span>"{candidate.slogan}"
                                </p>
                              )}
                              {candidate.platform && (
                                <p className="text-sm text-black"><span className="font-bold">Platform/Description: </span> {candidate.platform}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <ExclamationTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <p className="text-yellow-700">
                    This election doesn't have a ballot yet.
                    {election.status === 'upcoming' && " Create one to allow voting."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : tab === 'results' ? (
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
              election.positions.map(position => (
                <div key={position.id} className="mb-8 border-b pb-6">
                  <h3 className="text-lg font-medium text-black mb-4">{position.name}</h3>
                  {/* Winner banner (for completed elections) */}
                  {election.status === 'completed' && position.candidates && position.candidates.length > 0 && (() => {
                    const winner = position.candidates.reduce((prev, current) => 
                      (prev.vote_count || 0) > (current.vote_count || 0) ? prev : current
                    );
                    return (
                      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                          <Award className="w-4 h-4 mr-1 text-blue-600" />
                          Winner for {position.name}
                        </h4>
                        <div className="flex items-center">
                          <div className="relative w-16 h-16 mr-4">
                            {winner.image_url && !imageErrors[winner.id] ? (
                              <Image
                                src={candidateImages[winner.id] || getImageUrl(winner.image_url)}
                                alt={`${winner.first_name} ${winner.last_name}`}
                                fill
                                sizes="64px"
                                className="object-cover rounded-lg"
                                onError={() => handleImageError(winner.id)}
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                <User className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-black text-lg">
                              {formatNameSimple(winner.last_name, winner.first_name, winner.name)}
                            </h4>
                            {winner.party && (
                              <p className="text-sm text-gray-600 mb-1">{winner.party}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              {Number(winner.vote_count || 0).toLocaleString()} votes ({election.voter_count ? ((winner.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Candidates sorted by votes */}
                  <div className="space-y-3">
                    {position.candidates && position.candidates.length > 0 ? (
                      position.candidates
                        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                        .map((candidate, index) => (
                        <div key={candidate.id} className={`flex items-center p-3 rounded-lg ${index === 0 && election.status === 'completed' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                          <div className="relative w-12 h-12 mr-4 flex-shrink-0">
                            {candidate.image_url && !imageErrors[candidate.id] ? (
                              <Image
                                src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                alt={`${candidate.first_name} ${candidate.last_name}`}
                                fill
                                sizes="48px"
                                className="object-cover rounded-lg"
                                onError={() => handleImageError(candidate.id)}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="font-medium text-black">
                                {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
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
                                  style={{ width: `${election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : 0}%` }}
                                />
                              </div>
                              <span className="ml-3 text-black">
                                {Number(candidate.vote_count || 0).toLocaleString()} votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No candidates for this position
                      </div>
                    )}
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
      ) : tab === 'partial' ? (
        <div ref={partialCountingRef} className={`${isFullScreen ? 'fixed inset-0 bg-gray-100 z-50 overflow-y-auto' : ''}`}>
          {/* Vote Summary Section */}
          <div className={`bg-white rounded-lg shadow-lg ${isFullScreen ? 'sticky top-0 z-10 mx-6 mt-6 mb-8 p-8' : 'p-4 mb-6'}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${isFullScreen ? 'space-x-16' : 'space-x-8'}`}>
                <div className="flex items-center">
                  <Users className={`${isFullScreen ? 'w-8 h-8' : 'w-5 h-5'} mr-3 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-lg' : 'text-sm'} text-gray-500`}>Total Voters</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-2xl' : ''}`}>{Number(election.voter_count || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CheckCircle className={`${isFullScreen ? 'w-8 h-8' : 'w-5 h-5'} mr-3 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-lg' : 'text-sm'} text-gray-500`}>Votes Cast</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-2xl' : ''}`}>{Number(election.vote_count || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <PieChart className={`${isFullScreen ? 'w-8 h-8' : 'w-5 h-5'} mr-3 text-gray-600`} />
                  <div>
                    <div className={`${isFullScreen ? 'text-lg' : 'text-sm'} text-gray-500`}>Turnout</div>
                    <div className={`font-bold text-black ${isFullScreen ? 'text-2xl' : ''}`}>
                      {election.voter_count ? ((election.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={toggleFullScreen}
                className={`flex items-center ${isFullScreen ? 'px-6 py-3 text-lg' : 'px-3 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
              >
                {isFullScreen ? (
                  <>
                    <Minimize2 className={`${isFullScreen ? 'w-6 h-6' : 'w-4 h-4'} mr-2`} />
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
          <div className={`bg-white rounded-lg shadow-lg ${isFullScreen ? 'mx-6 mb-6 p-8' : 'p-6'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h2 className={`${isFullScreen ? 'text-4xl' : 'text-xl'} font-semibold text-black`}>
                  {isFullScreen && election?.positions?.length > 1 ? 'Live Election Results' : 'Live Vote Counting'}
                </h2>
                {isFullScreen && election?.positions?.length > 1 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-medium">Auto-rotating every 10s</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isFullScreen && election?.status === 'ongoing' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`${isFullScreen ? 'text-base' : 'text-sm'} font-medium`}>Live Updates</span>
                  </div>
                )}
                <div className={`px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full ${isFullScreen ? 'text-base' : 'text-sm'} font-medium`}>
                  Live Results
                </div>
              </div>
            </div>

            {election.positions && election.positions.length > 0 ? (
              isFullScreen && election.positions.length > 1 ? (
                // Carousel mode for fullscreen with multiple positions
                <div className="space-y-8">
                  {/* Position indicator */}
                  <div className="flex justify-center items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                      {election.positions.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPositionIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentPositionIndex ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-gray-600 text-lg">
                      {currentPositionIndex + 1} of {election.positions.length}
                    </div>
                  </div>

                  {/* Current position display */}
                  {(() => {
                    const position = election.positions[currentPositionIndex];
                    const { top3, others } = getTop3AndOtherCandidates(position.candidates || []);
                    
                    return (
                      <div className="transition-all duration-500 ease-in-out">
                        <h3 className="text-5xl font-bold text-center text-black mb-12">
                          {position.name}
                        </h3>

                        {/* Top 3 Candidates - Enhanced display */}
                        {top3.length > 0 && (
                          <div className="grid grid-cols-3 gap-16 mb-12">
                            {top3.map((candidate, index) => (
                              <div 
                                key={candidate.id} 
                                className={`flex flex-col items-center text-center p-10 rounded-2xl shadow-xl ${
                                  index === 0 ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-3 border-blue-400' :
                                  index === 1 ? 'bg-gradient-to-b from-gray-50 to-gray-100 border-3 border-gray-400' :
                                  'bg-gradient-to-b from-orange-50 to-orange-100 border-3 border-orange-400'
                                }`}
                              >
                                <div className="relative mb-8">
                                  <div className="relative w-56 h-64">
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes="224px"
                                        className="object-cover rounded-xl shadow-lg"
                                        priority
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className="w-56 h-64 rounded-xl bg-gray-200 flex items-center justify-center shadow-lg">
                                        <User className="w-28 h-28 text-gray-400" />
                                      </div>
                                    )}
                                    <div className={`absolute -top-4 -right-4 rounded-full p-3 text-lg font-bold shadow-xl ${
                                      index === 0 ? 'bg-blue-500 text-white' :
                                      index === 1 ? 'bg-gray-500 text-white' :
                                      'bg-orange-500 text-white'
                                    }`}>
                                      {getRankLabel(index)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="w-full">
                                  <h4 className="font-bold text-black text-xl mb-2">
                                    {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                  </h4>
                                  {candidate.party && (
                                    <div className="px-3 py-1 bg-white rounded-full mb-3 shadow-sm">
                                      <span className="text-black font-medium text-sm">{candidate.party}</span>
                                    </div>
                                  )}
                                  <div className="mt-4">
                                    <div className="font-bold text-black text-3xl mb-1">
                                      {Number(candidate.vote_count || 0).toLocaleString()}
                                    </div>
                                    <div className="text-lg text-gray-600 mb-1">votes</div>
                                    <div className="text-base text-gray-600 mb-3">
                                      {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                                    </div>
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                          index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-gray-500' : 'bg-orange-500'
                                        }`}
                                        style={{ width: `${election.voter_count ? (candidate.vote_count / election.voter_count * 100).toFixed(2) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Other Candidates - Enhanced grid */}
                        {others.length > 0 && (
                          <div>
                            <h4 className="font-bold text-gray-700 mb-10 text-2xl text-center">Other Candidates</h4>
                            <div className="grid grid-cols-3 gap-12">
                              {others.map(candidate => (
                                <div 
                                  key={candidate.id} 
                                  className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
                                >
                                  <div className="relative w-40 h-48 mb-6">
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes="160px"
                                        className="object-cover rounded-xl"
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className="w-40 h-48 rounded-xl bg-gray-200 flex items-center justify-center">
                                        <User className="w-20 h-20 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-center w-full">
                                    <h4 className="font-medium text-black text-base mb-2">
                                      {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                    </h4>
                                    {candidate.party && (
                                      <div className="text-sm text-gray-600 mb-3 px-2 py-1 bg-white rounded-full">
                                        {candidate.party}
                                      </div>
                                    )}
                                    <div className="font-bold text-black text-xl mb-1">
                                      {Number(candidate.vote_count || 0).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-1">votes</div>
                                    <div className="text-sm text-gray-600">
                                      {election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // Regular mode for non-fullscreen or single position
                <div className="space-y-10">
                  {election.positions.map(position => {
                    const { top3, others } = getTop3AndOtherCandidates(position.candidates || []);
                    
                    return (
                      <div key={position.id} className={`border rounded-lg p-6 ${isFullScreen ? 'shadow-lg' : ''}`}>
                        <h3 className={`${isFullScreen ? 'text-2xl' : 'text-lg'} font-medium text-black mb-6`}>
                          {position.name}
                        </h3>

                        {/* Top 3 Candidates */}
                        {top3.length > 0 && (
                          <div className={`mb-8 ${isFullScreen ? 'grid grid-cols-3 gap-12' : 'space-y-3'}`}>
                            {top3.map((candidate, index) => (
                              <div 
                                key={candidate.id} 
                                className={`${isFullScreen ? 'flex flex-col items-center text-center p-10' : 'flex items-center p-3'} 
                                  bg-gray-50 rounded-xl border-2 ${index === 0 ? 'border-blue-400' : index === 1 ? 'border-gray-400' : 'border-gray-300'} 
                                  ${isFullScreen && index === 0 ? 'shadow-xl bg-blue-50' : isFullScreen ? 'shadow-lg' : ''}`}
                              >
                                <div className={`relative ${isFullScreen ? 'mb-8' : ''}`}>
                                  <div className={`relative ${isFullScreen ? 'w-56 h-64' : 'w-16 h-20'} ${!isFullScreen ? 'mr-4' : ''}`}>
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes={isFullScreen ? "224px" : "80px"}
                                        className="object-cover rounded-xl"
                                        priority
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className={`${isFullScreen ? 'w-56 h-64' : 'w-16 h-20'} rounded-xl bg-gray-200 flex items-center justify-center`}>
                                        <User className={`${isFullScreen ? 'w-28 h-28' : 'w-8 h-8'} text-gray-400`} />
                                      </div>
                                    )}
                                    <div className={`absolute -top-3 -right-3 rounded-full p-2 text-sm font-bold ${
                                      index === 0 ? 'bg-blue-500 text-white' :
                                      index === 1 ? 'bg-gray-500 text-white' :
                                      'bg-gray-400 text-white'
                                    } ${isFullScreen ? 'text-lg p-3' : ''}`}>
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
                                        votes
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

                        {/* Other Candidates */}
                        {others.length > 0 && (
                          <div>
                            <h4 className={`font-medium text-gray-700 mb-6 ${isFullScreen ? 'text-2xl' : ''}`}>Other Candidates</h4>
                            <div className={`${isFullScreen ? 'grid grid-cols-2 md:grid-cols-3 gap-8' : 'space-y-3'}`}>
                              {others.map(candidate => (
                                <div 
                                  key={candidate.id} 
                                  className={`flex items-center p-6 bg-gray-50 rounded-xl ${isFullScreen ? 'shadow-lg' : ''}`}
                                >
                                  <div className="relative w-32 h-40 mr-6">
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes="128px"
                                        className="object-cover rounded-xl"
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className="w-32 h-40 rounded-xl bg-gray-200 flex items-center justify-center">
                                        <User className="w-16 h-16 text-gray-400" />
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
                                        <div className="text-sm text-gray-600">votes</div>
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
              )
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