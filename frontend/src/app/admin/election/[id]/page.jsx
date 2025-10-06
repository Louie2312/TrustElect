"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Calendar, Clock, Users, CheckCircle, 
  ChevronLeft, List, User, PieChart,
  AlertTriangle as ExclamationTriangle,
  Lock, Award, ArrowDown, ArrowUp, Edit, Plus, AlertCircle, X,
  Maximize2, Minimize2, ChevronRight, Play, Pause, Timer, FileText, Trophy, Download
} from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import toast from 'react-hot-toast';
import { BASE_URL } from '@/config';
import { generatePdfReport } from '../../../../utils/pdfGenerator';

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
  
  // Direct approach: If fallback exists and is a single word or short phrase, treat as group name
  if (fallback && fallback.trim()) {
    const fallbackWords = fallback.trim().split(/\s+/);
    // If fallback is 1-2 words and doesn't contain common first/last name patterns, treat as group
    if (fallbackWords.length <= 2 && !fallback.toLowerCase().includes(',')) {
      return cap(fallback.trim());
    }
  }
  
  // If no first name, treat as group name (no comma)
  if (!firstName || firstName.trim() === '') {
    return cap(lastName || fallback || 'No Name');
  }
  
  // For individual candidates with both names, add comma
  if (lastName && firstName) {
    return `${cap(lastName)}, ${cap(firstName)}`;
  }
  
  // Fallback cases
  if (!lastName && !firstName) return 'No Name';
  return cap(lastName || firstName || fallback || 'No Name');
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
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [bulletinData, setBulletinData] = useState({ voterCodes: [], candidateVotes: [] });
  const [bulletinLoading, setBulletinLoading] = useState(false);
  const [currentBulletinSlide, setCurrentBulletinSlide] = useState(0);
  const bulletinIntervalRef = useRef(null);
  const [currentPositionPage, setCurrentPositionPage] = useState(0);
  const [currentDetailsPositionPage, setCurrentDetailsPositionPage] = useState(0);
  const [currentCodesPage, setCurrentCodesPage] = useState(0);
  const [currentCandidatesPage, setCurrentCandidatesPage] = useState(0);
  const [isBulletinFullScreen, setIsBulletinFullScreen] = useState(false);
  const bulletinFullScreenRef = useRef(null);
  const [bulletinActiveTab, setBulletinActiveTab] = useState('voter-codes');
  const [bulletinVoterCodes, setBulletinVoterCodes] = useState([]);
  const [bulletinCandidateVotes, setBulletinCandidateVotes] = useState([]);
  const [bulletinCarouselIndex, setBulletinCarouselIndex] = useState(0);
  const [bulletinCarouselInterval, setBulletinCarouselInterval] = useState(null);


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

  const calculateTimeRemaining = () => {
    if (!election || election.status !== 'ongoing' || !election.date_to || !election.end_time) {
      setTimeRemaining(null);
      return;
    }

    const now = new Date();
    
    // Parse the end date and time properly
    const endDate = new Date(election.date_to);
    const [endHour, endMinute] = election.end_time.split(':').map(Number);
    
    // Set the end time with proper date and time
    const endTime = new Date(endDate);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const timeDiff = endTime - now;

    if (timeDiff <= 0) {
      setTimeRemaining('Election ended');
      return;
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setIsFullScreen(isFullscreen);
      setIsBulletinFullScreen(isFullscreen);
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

  const loadBulletinData = async () => {
    try {
      setBulletinLoading(true);
      const [voterCodesResponse, candidateVotesResponse] = await Promise.all([
        fetchWithAuth(`/elections/${params.id}/voter-codes`),
        fetchWithAuth(`/elections/${params.id}/votes-per-candidate`)
      ]);
      
      setBulletinData({
        voterCodes: voterCodesResponse.data?.voterCodes || [],
        candidateVotes: candidateVotesResponse.data?.positions || []
      });
      
      setBulletinVoterCodes(voterCodesResponse.data?.voterCodes || []);
      setBulletinCandidateVotes(candidateVotesResponse.data?.positions || []);
    } catch (err) {
      console.error('Error loading bulletin data:', err);
      setBulletinData({ voterCodes: [], candidateVotes: [] });
      setBulletinVoterCodes([]);
      setBulletinCandidateVotes([]);
    } finally {
      setBulletinLoading(false);
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

  // Update time remaining every second for ongoing elections
  useEffect(() => {
    if (election && election.status === 'ongoing') {
      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [election]);

  // Bulletin carousel effect
  useEffect(() => {
    if (tab === 'bulletin' && bulletinData.voterCodes.length > 0 && bulletinData.candidateVotes.length > 0) {
      console.log('Starting bulletin carousel...');
      
      bulletinIntervalRef.current = setInterval(() => {
        setCurrentBulletinSlide(prev => prev === 0 ? 1 : 0);
      }, 10000); // Change slide every 10 seconds
      
      return () => {
        if (bulletinIntervalRef.current) {
          console.log('Clearing bulletin carousel interval...');
          clearInterval(bulletinIntervalRef.current);
          bulletinIntervalRef.current = null;
        }
      };
    } else {
      if (bulletinIntervalRef.current) {
        clearInterval(bulletinIntervalRef.current);
        bulletinIntervalRef.current = null;
      }
    }
  }, [tab, bulletinData]);

  // Load bulletin data when tab is active
  useEffect(() => {
    if (tab === 'bulletin' && bulletinData.voterCodes.length === 0 && bulletinData.candidateVotes.length === 0) {
      loadBulletinData();
    }
  }, [tab]);

  // Cleanup intervals on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
      if (bulletinIntervalRef.current) {
        clearInterval(bulletinIntervalRef.current);
      }
      if (bulletinCarouselInterval) {
        clearInterval(bulletinCarouselInterval);
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

  const handleGenerateReport = async () => {
    try {
      // Fetch election details first
      const electionDetails = await fetchWithAuth(`/elections/${params.id}/details`);
      
      // Initialize data as empty
      let ballotData = { positions: [] };
      let resultsData = { positions: [] };
      let candidateVotes = [];

      // Use existing election data which has complete candidate information
      if (election.positions && election.positions.length > 0) {
        ballotData = {
          positions: election.positions.map(pos => ({
            position: pos.name,
            max_choices: pos.max_choices,
            candidates: (pos.candidates || []).map(candidate => {
              const candidateData = {
                first_name: candidate.first_name,
                last_name: candidate.last_name
              };
              
              // Only add fields that have actual data
              if (candidate.course && candidate.course.trim() !== '') {
                candidateData.course = candidate.course;
              }
              if (candidate.party && candidate.party.trim() !== '') {
                candidateData.party = candidate.party;
              }
              if (candidate.slogan && candidate.slogan.trim() !== '') {
                candidateData.slogan = candidate.slogan;
              }
              if (candidate.platform && candidate.platform.trim() !== '') {
                candidateData.platform = candidate.platform;
              }
              
              return candidateData;
            })
          }))
        };
      }

      // Try to fetch results data (optional - election might not have results yet)
      try {
        resultsData = await fetchWithAuth(`/elections/completed/${params.id}/results`);
      } catch (resultsError) {
        console.warn('No results found for this election:', resultsError.message);
        // Use existing election positions with vote counts if available
        if (election.positions && election.positions.length > 0) {
          // Sort candidates by vote count to determine winners and ranks
          resultsData = {
            positions: election.positions.map(pos => {
              const sortedCandidates = (pos.candidates || []).sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
              return {
                position_name: pos.name,
                candidates: sortedCandidates.map((candidate, index) => ({
                  name: `${candidate.first_name} ${candidate.last_name}`,
                  party: candidate.party || 'Independent',
                  vote_count: candidate.vote_count || 0,
                  vote_percentage: election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00',
                  rank: index + 1,
                  is_winner: index === 0 && candidate.vote_count > 0, // First place is winner if they have votes
                  status: index === 0 && candidate.vote_count > 0 ? 'Winner' : 'Candidate'
                }))
              };
            })
          };
        }
      }


      // Try to fetch candidate votes
      try {
        const candidateVotesResponse = await fetchWithAuth(`/elections/${params.id}/votes-per-candidate`);
        candidateVotes = candidateVotesResponse.data?.positions || [];
      } catch (candidateVotesError) {
        console.warn('No candidate votes found for this election:', candidateVotesError.message);
        candidateVotes = [];
      }

      // Prepare report data
      const reportData = {
        title: "Comprehensive Election Report",
        description: "Complete election details including ballot information, final results, and election bulletin codes",
        election_details: {
          title: electionDetails.election?.title || electionDetails.title || election.title,
          type: electionDetails.election?.election_type || electionDetails.type || election.election_type || 'Regular Election',
          status: electionDetails.election?.status || electionDetails.status || election.status,
          start_date: parseElectionDate(electionDetails.election?.date_from || electionDetails.date_from || election.date_from, electionDetails.election?.start_time || electionDetails.start_time || election.start_time),
          end_date: parseElectionDate(electionDetails.election?.date_to || electionDetails.date_to || election.date_to, electionDetails.election?.end_time || electionDetails.end_time || election.end_time),
          description: electionDetails.election?.description || electionDetails.description || election.description,
          total_eligible_voters: electionDetails.election?.voter_count || electionDetails.total_eligible_voters || election.voter_count || 0,
          total_votes_cast: electionDetails.election?.vote_count || electionDetails.total_votes_cast || election.vote_count || 0,
          voter_turnout_percentage: election.voter_count ? ((election.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'
        },
        ballot_info: ballotData.positions?.map(position => ({
          position_name: position.position,
          max_choices: position.max_choices,
          candidates: position.candidates?.map(candidate => {
            const candidateData = {
              name: formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)
            };
            
            // Only add fields that have actual data
            if (candidate.course && candidate.course.trim() !== '') {
              candidateData.course = candidate.course;
            }
            if (candidate.party && candidate.party.trim() !== '') {
              candidateData.party = candidate.party;
            }
            if (candidate.slogan && candidate.slogan.trim() !== '') {
              candidateData.slogan = candidate.slogan;
            }
            if (candidate.platform && candidate.platform.trim() !== '') {
              candidateData.platform = candidate.platform;
            }
            
            return candidateData;
          }) || []
        })) || [],
        results: resultsData.positions?.map(position => ({
          position_name: position.position_name,
          candidates: position.candidates?.map(candidate => ({
            name: candidate.name,
            party: candidate.party || 'Independent',
            vote_count: candidate.vote_count || 0,
            vote_percentage: candidate.vote_percentage || 0,
            rank: candidate.rank || 0,
            is_winner: candidate.is_winner || false,
            status: candidate.status || 'Candidate'
          })) || []
        })) || [],
        candidate_votes: candidateVotes.map(position => ({
          position_name: position.position_title,
          max_choices: position.max_choices,
          candidates: position.candidates?.map(candidate => ({
            name: formatNameSimple(candidate.lastName, candidate.firstName, candidate.name),
            party: candidate.partylistName || candidate.party || 'Independent',
            course: candidate.course || 'Not specified',
            vote_count: candidate.voteCount || candidate.vote_count || 0,
            vote_percentage: election.voter_count ? (((candidate.voteCount || candidate.vote_count || 0) / election.voter_count) * 100).toFixed(2) : '0.00'
          })) || []
        })),
        bulletin_code: electionDetails.election?.bulletin_code || electionDetails.bulletin_code || election.bulletin_code || 'N/A',
        generated_at: new Date().toLocaleString()
      };

      // Generate PDF report
      await generatePdfReport(15, reportData);
      toast.success('Election report generated successfully!');
    } catch (error) {
      console.error('Error generating election report:', error);
      toast.error('Failed to generate report. Please try again.');
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

  // Helper function to calculate Y-axis domain for better scaling
  const calculateYAxisDomain = (chartData) => {
    if (!chartData || chartData.length === 0) return [0, 10];
    
    // Ensure all vote counts are numbers
    const voteCounts = chartData.map(d => Number(d.votes) || 0);
    const maxVotes = Math.max(...voteCounts);
    const minVotes = Math.min(...voteCounts);
    
    // If all votes are the same, add some padding
    if (maxVotes === minVotes) {
      return [0, Math.max(maxVotes + 1, 5)];
    }
    
    // Add 10% padding to the top for better visualization, minimum 1
    const padding = Math.max(1, Math.ceil(maxVotes * 0.1));
    return [0, maxVotes + padding];
  };

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
        name: formatNameSimple(candidate.last_name, candidate.first_name, candidate.name),
        votes: Number(candidate.vote_count || 0),
        party: candidate.party || 'Independent',
        percentage: election.voter_count ? ((candidate.vote_count || 0) / election.voter_count * 100).toFixed(2) : '0.00',
        color: CHART_COLORS[index % CHART_COLORS.length]
      }));
      
      // Debug logging for chart data
      console.log(`Chart data for position ${position.name}:`, chartData.map(c => ({ name: c.name, votes: c.votes })));
      console.log(`Y-axis domain for ${position.name}:`, calculateYAxisDomain(chartData));
      console.log(`Max votes: ${Math.max(...chartData.map(d => d.votes))}, Min votes: ${Math.min(...chartData.map(d => d.votes))}`);
      
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

  const getTop3Winners = (candidates) => {
    if (!candidates || candidates.length === 0) return [];
    
    const sortedCandidates = [...candidates].sort((a, b) => 
      (b.vote_count || 0) - (a.vote_count || 0)
    );
    
    return sortedCandidates.slice(0, 3);
  };

  // Pagination functions
  const goToNextPosition = () => {
    if (election?.positions && currentPositionPage < election.positions.length - 1) {
      setCurrentPositionPage(prev => prev + 1);
    }
  };

  const goToPreviousPosition = () => {
    if (currentPositionPage > 0) {
      setCurrentPositionPage(prev => prev - 1);
    }
  };

  const goToNextDetailsPosition = () => {
    if (election?.positions && currentDetailsPositionPage < election.positions.length - 1) {
      setCurrentDetailsPositionPage(prev => prev + 1);
    }
  };

  const goToPreviousDetailsPosition = () => {
    if (currentDetailsPositionPage > 0) {
      setCurrentDetailsPositionPage(prev => prev - 1);
    }
  };

  // Bulletin pagination functions
  const goToNextCodesPage = () => {
    const codesPerPage = 50; // 50 codes per page
    const totalPages = Math.ceil(bulletinData.voterCodes.length / codesPerPage);
    if (currentCodesPage < totalPages - 1) {
      setCurrentCodesPage(prev => prev + 1);
    }
  };

  const goToPreviousCodesPage = () => {
    if (currentCodesPage > 0) {
      setCurrentCodesPage(prev => prev - 1);
    }
  };

  const goToNextCandidatesPage = () => {
    if (election?.positions && currentCandidatesPage < election.positions.length - 1) {
      setCurrentCandidatesPage(prev => prev + 1);
    }
  };

  const goToPreviousCandidatesPage = () => {
    if (currentCandidatesPage > 0) {
      setCurrentCandidatesPage(prev => prev - 1);
    }
  };

  const toggleBulletinFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await bulletinFullScreenRef.current.requestFullscreen();
        setIsBulletinFullScreen(true);
        startBulletinCarousel();
      } catch (err) {
        console.error('Error attempting to enable full-screen mode:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsBulletinFullScreen(false);
        stopBulletinCarousel();
      }
    }
  };

  const startBulletinCarousel = () => {
    if (bulletinCarouselInterval) {
      clearInterval(bulletinCarouselInterval);
    }
    
    const interval = setInterval(() => {
      setBulletinCarouselIndex(prev => {
        // Calculate total items for carousel
        const voterPages = Math.ceil(bulletinData.voterCodes.length / 40);
        const candidateItems = election?.positions?.reduce((total, position) => {
          return total + (position.candidates?.length || 0);
        }, 0) || 0;
        const winnerPages = election?.positions?.length || 0;
        
        const totalItems = voterPages + candidateItems + winnerPages;
        
        return (prev + 1) % totalItems;
      });
    }, 5000); // 5 seconds interval
    
    setBulletinCarouselInterval(interval);
  };

  const stopBulletinCarousel = () => {
    if (bulletinCarouselInterval) {
      clearInterval(bulletinCarouselInterval);
      setBulletinCarouselInterval(null);
    }
    setBulletinCarouselIndex(0);
  };

  const getBulletinCarouselContent = () => {
    const voterPages = Math.ceil(bulletinData.voterCodes.length / 50);
    
    // Calculate total candidate pages (including pagination for candidates with 40+ votes)
    let totalCandidatePages = 0;
    const candidatePageMap = [];
    
    election?.positions?.forEach((position, posIndex) => {
      position.candidates?.forEach((candidate, candIndex) => {
        const candidateVotes = bulletinData.candidateVotes
          ?.find(pos => pos.id === position.id)
          ?.candidates?.find(c => c.id === candidate.id)
          ?.voters?.length || 0;
        
        const candidatePages = Math.ceil(candidateVotes / 50);
        candidatePageMap.push({
          positionIndex: posIndex,
          candidateIndex: candIndex,
          totalPages: candidatePages,
          candidateVotes
        });
        totalCandidatePages += candidatePages;
      });
    });
    
    const winnerPages = election?.positions?.length || 0;
    
    if (bulletinCarouselIndex < voterPages) {
      // Voter codes pages
      return {
        type: 'voter-codes',
        page: bulletinCarouselIndex,
        title: `Voter Codes - Page ${bulletinCarouselIndex + 1} of ${voterPages}`
      };
    } else if (bulletinCarouselIndex < voterPages + totalCandidatePages) {
      // Per candidate views with pagination
      let candidatePageIndex = bulletinCarouselIndex - voterPages;
      let currentPage = 0;
      
      for (let i = 0; i < candidatePageMap.length; i++) {
        const candidateInfo = candidatePageMap[i];
        if (candidatePageIndex < candidateInfo.totalPages) {
          return {
            type: 'per-candidate',
            positionIndex: candidateInfo.positionIndex,
            candidateIndex: candidateInfo.candidateIndex,
            page: candidatePageIndex,
            totalPages: candidateInfo.totalPages,
            candidateVotes: candidateInfo.candidateVotes,
            title: `${election.positions[candidateInfo.positionIndex]?.name} - ${election.positions[candidateInfo.positionIndex]?.candidates?.[candidateInfo.candidateIndex]?.first_name} ${election.positions[candidateInfo.positionIndex]?.candidates?.[candidateInfo.candidateIndex]?.last_name} (Page ${candidatePageIndex + 1} of ${candidateInfo.totalPages})`
          };
        }
        candidatePageIndex -= candidateInfo.totalPages;
      }
    } else {
      // Top 3 winners
      const winnerIndex = bulletinCarouselIndex - voterPages - totalCandidatePages;
      return {
        type: 'top3-winners',
        positionIndex: winnerIndex,
        title: `Top 3 Winners - ${election.positions[winnerIndex]?.name}`
      };
    }
  };


  return (
    <>
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
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
          
          {/* Generate Report Button - Always visible */}
          <button
            onClick={handleGenerateReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="Generate Comprehensive Election Report"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </button>
          
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
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-black">Title: {election.title}</h1>
      <p className="text-gray-600 mb-6 text-black">Description: {election.description}</p>

      {/* Creator Information */}
      <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Created by: </span>
          <span className="text-black">
            {election.creator_name || 'Unknown'}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              election.creator_role === 'SuperAdmin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {election.creator_role || 'Admin'}
            </span>
          </span>
          {election.created_at && (
            <span className="ml-2">
              on {new Date(election.created_at).toLocaleDateString()} at {new Date(election.created_at).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>

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
          <button
            onClick={() => setTab('bulletin')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              tab === 'bulletin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Election Bulletin
          </button>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-black">Positions & Candidates</h3>
                    {election.positions && election.positions.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {currentDetailsPositionPage + 1} of {election.positions.length}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={goToPreviousDetailsPosition}
                            disabled={currentDetailsPositionPage === 0}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={goToNextDetailsPosition}
                            disabled={currentDetailsPositionPage === election.positions.length - 1}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {election.positions && election.positions[currentDetailsPositionPage] && (
                    <div key={election.positions[currentDetailsPositionPage].id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-semibold text-black">{election.positions[currentDetailsPositionPage].name}</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {election.positions[currentDetailsPositionPage].max_choices > 1 ? `Select up to ${election.positions[currentDetailsPositionPage].max_choices}` : 'Single choice'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {election.positions[currentDetailsPositionPage].candidates?.map((candidate) => (
                          <div key={candidate.id} className="border rounded p-3 flex items-start">
                            <div className="relative w-32 h-40 mr-4">
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
                                <div className="w-32 h-40 rounded-lg overflow-hidden mr-4 bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                  <User className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-black mb-1">
                                <span className="">Full Name: </span>{candidate.first_name} {candidate.last_name}
                              </p>
                              {candidate.party && (
                                <p className="text-sm text-black mb-1"><span className="font-bold">Partylist/Course: </span> {candidate.party?.replace(/,/g, '')}</p>
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
                  )}
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
              <>
                {/* Pagination controls for results */}
                {election.positions.length > 1 && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Position {currentPositionPage + 1} of {election.positions.length}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={goToPreviousPosition}
                        disabled={currentPositionPage === 0}
                        className="flex items-center px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      <button
                        onClick={goToNextPosition}
                        disabled={currentPositionPage === election.positions.length - 1}
                        className="flex items-center px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Current position results */}
                {(() => {
                  const position = formatResultsData(election.positions)[currentPositionPage];
                  if (!position) return null;
                  
                  return (
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
                        <div className="relative w-16 h-20 mr-4">
                          {position.sortedCandidates[0].image_url && !imageErrors[position.sortedCandidates[0].id] ? (
                            <Image
                              src={candidateImages[position.sortedCandidates[0].id] || getImageUrl(position.sortedCandidates[0].image_url)}
                              alt={`${position.sortedCandidates[0].first_name} ${position.sortedCandidates[0].last_name}`}
                              fill
                              sizes="64px"
                              className="object-cover rounded-lg border-2 border-blue-500"
                              onError={() => handleImageError(position.sortedCandidates[0].id)}
                            />
                          ) : (
                            <div className="w-16 h-20 rounded-lg bg-blue-200 flex items-center justify-center border-2 border-blue-500">
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
                          <div className="mt-3">
                            <div className="text-base text-black font-bold">
                              {Number(position.sortedCandidates[0].vote_count || 0).toLocaleString()} votes
                            </div>
                            <div className="text-sm text-blue-600">
                              ({election.voter_count ? (position.sortedCandidates[0].vote_count / election.voter_count * 100).toFixed(2) : 0}% of eligible voters)
                            </div>
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
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          fontSize={12}
                        />
                        <YAxis 
                          domain={calculateYAxisDomain(position.chartData)}
                          allowDecimals={false}
                          tickFormatter={(value) => value.toLocaleString()}
                          tickCount={Math.min(10, Math.max(3, Math.ceil(Math.max(...position.chartData.map(d => d.votes)) / 2)))}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value} votes (${election.voter_count ? ((value / election.voter_count) * 100).toFixed(2) : '0.00'}% `, 'Votes']}
                          labelFormatter={(name) => `${name}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            color: '#000000'
                          }}
                          labelStyle={{
                            color: '#000000',
                            fontWeight: 'bold'
                          }}
                          itemStyle={{
                            color: '#000000'
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="votes" 
                          name="Vote Count" 
                          fill="#3b82f6" 
                          isAnimationActive={true}
                          radius={[4, 4, 0, 0]}
                        >
                          {position.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color}>
                              <LabelList 
                                dataKey="votes" 
                                position="top" 
                                style={{ fontSize: '12px', fontWeight: 'bold', fill: '#000000' }}
                                formatter={(value) => value.toLocaleString()}
                              />
                            </Cell>
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Candidates sorted by votes */}
                  <div className="space-y-3">
                    {position.sortedCandidates.map((candidate, index) => (
                      <div key={candidate.id} className={`flex items-center p-3 rounded-lg ${index === 0 && election.status === 'completed' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                        <div className="relative w-16 h-20 mr-4">
                          {candidate.image_url && !imageErrors[candidate.id] ? (
                            <Image
                              src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                              alt={`${candidate.first_name} ${candidate.last_name}`}
                              fill
                              sizes="64px"
                              className="object-cover rounded-lg"
                              onError={() => handleImageError(candidate.id)}
                            />
                          ) : (
                            <div className="w-16 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
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
                            <span className="ml-3 text-black text-base font-semibold">
                              {Number(candidate.vote_count || 0).toLocaleString()} votes ({election.voter_count ? (candidate.vote_count / election.voter_count * 100).toFixed(2) : 0}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  );
                })()}
              </>
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
        <div ref={partialCountingRef} className={`${isFullScreen ? 'fixed inset-0 bg-gray-100 z-50 overflow-hidden hide-scrollbar' : ''}`}>
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
                {timeRemaining && (
                  <div className="flex items-center">
                    <Timer className={`${isFullScreen ? 'w-8 h-8' : 'w-5 h-5'} mr-3 text-gray-600`} />
                    <div>
                      <div className={`${isFullScreen ? 'text-lg' : 'text-sm'} text-gray-500`}>Time Remaining</div>
                      <div className={`font-bold text-black ${isFullScreen ? 'text-2xl' : ''}`}>
                        {timeRemaining}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!isFullScreen && (
                <button
                  onClick={toggleFullScreen}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Full Screen
                </button>
              )}
            </div>
          </div>

          {/* Partial Counting Results */}
          <div className={`bg-white rounded-lg shadow-lg ${isFullScreen ? 'mx-6 mb-6 p-8' : 'p-6'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h2 className={`${isFullScreen ? 'text-4xl' : 'text-xl'} font-semibold text-black`}>
                  {isFullScreen && election?.positions?.length > 1 ? 'Live Election Results' : 'Partial Vote Counting'}
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
                  Partial Results
                </div>
              </div>
            </div>

            {election.positions && election.positions.length > 0 ? (
              election.positions.length > 1 ? (
                // Carousel mode for multiple positions
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

                        {/* Top 3 Candidates - Compact display */}
                        {top3.length > 0 && (
                          <div className="grid grid-cols-3 gap-8 mb-8">
                            {top3.map((candidate, index) => (
                              <div 
                                key={candidate.id} 
                                className={`flex flex-col items-center text-center p-6 rounded-xl shadow-lg ${
                                  index === 0 ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-400' :
                                  index === 1 ? 'bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-gray-400' :
                                  'bg-gradient-to-b from-orange-50 to-orange-100 border-2 border-orange-400'
                                }`}
                              >
                                <div className="relative mb-4">
                                  <div className="relative w-40 h-48">
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes="160px"
                                        className="object-cover rounded-lg shadow-md"
                                        priority
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className="w-40 h-48 rounded-lg bg-gray-200 flex items-center justify-center shadow-md">
                                        <User className="w-20 h-20 text-gray-400" />
                                      </div>
                                    )}
                                    <div className={`absolute -top-2 -right-2 rounded-full p-2 text-base font-bold shadow-lg ${
                                      index === 0 ? 'bg-blue-500 text-white' :
                                      index === 1 ? 'bg-gray-500 text-white' :
                                      'bg-orange-500 text-white'
                                    }`}>
                                      {getRankLabel(index)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="w-full">
                                  <h4 className="font-bold text-black text-2xl mb-2">
                                    {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                  </h4>
                                  {candidate.party && (
                                    <div className="px-3 py-1 bg-white rounded-full mb-3 shadow-sm">
                                      <span className="text-black font-medium text-base">{candidate.party?.replace(/,/g, '')}</span>
                                    </div>
                                  )}
                                  <div className="mt-3">
                                    <div className="text-xl text-black mb-2 font-semibold">
                                      {Number(candidate.vote_count || 0).toLocaleString()} Votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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

                        {/* Other Candidates - Compact grid */}
                        {others.length > 0 && (
                          <div>
                            <h4 className="font-bold text-black mb-6 text-2xl text-center">Other Candidates</h4>
                            <div className="grid grid-cols-5 gap-4">
                              {others.map(candidate => (
                                <div 
                                  key={candidate.id} 
                                  className="flex flex-col items-center p-3 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow max-w-48"
                                >
                                  <div className="relative w-32 h-40 mb-3">
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
                                      <div className="w-32 h-40 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <User className="w-16 h-16 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-center w-full">
                                    <h4 className="font-medium text-black text-base mb-1 line-clamp-2">
                                      {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                    </h4>
                                    {candidate.party && (
                                      <div className="text-xs text-black mb-1 px-2 py-1 bg-white rounded-full">
                                        {candidate.party}
                                      </div>
                                    )}
                                    <div className="text-sm text-black font-semibold">
                                      {Number(candidate.vote_count || 0).toLocaleString()} Votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
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
                  {/* Pagination controls for partial counting */}
                  {election.positions.length > 1 && (
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Position {currentPositionPage + 1} of {election.positions.length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={goToPreviousPosition}
                          disabled={currentPositionPage === 0}
                          className="flex items-center px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </button>
                        <button
                          onClick={goToNextPosition}
                          disabled={currentPositionPage === election.positions.length - 1}
                          className="flex items-center px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current position display */}
                  {election.positions[currentPositionPage] && (() => {
                    const position = election.positions[currentPositionPage];
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
                                      <div className={`${isFullScreen ? 'text-base' : 'text-sm'} text-black`}>
                                        {Number(candidate.vote_count || 0).toLocaleString()} Votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
                                      </div>
                                    </div>
                                  </div>
                                  {isFullScreen && (
                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-4">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-gray-500' : 'bg-gray-400'}`}
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
                            <h4 className={`font-bold text-black mb-6 ${isFullScreen ? 'text-xl' : ''}`}>Other Candidates</h4>
                            <div className={`${isFullScreen ? 'grid grid-cols-4 gap-4' : 'space-y-3'}`}>
                              {others.map(candidate => (
                                <div 
                                  key={candidate.id} 
                                  className={`${isFullScreen ? 'flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow' : 'flex items-center p-6 bg-gray-50 rounded-xl'}`}
                                >
                                  <div className={`relative ${isFullScreen ? 'w-24 h-32 mb-3' : 'w-16 h-20 mr-4'}`}>
                                    {candidate.image_url && !imageErrors[candidate.id] ? (
                                      <Image
                                        src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                        alt={`${candidate.first_name} ${candidate.last_name}`}
                                        fill
                                        sizes={isFullScreen ? "96px" : "80px"}
                                        className="object-cover rounded-lg"
                                        onError={() => handleImageError(candidate.id)}
                                      />
                                    ) : (
                                      <div className={`${isFullScreen ? 'w-24 h-32' : 'w-16 h-20'} rounded-lg bg-gray-200 flex items-center justify-center`}>
                                        <User className={`${isFullScreen ? 'w-12 h-12' : 'w-8 h-8'} text-gray-400`} />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className={`${isFullScreen ? 'text-center w-full' : 'flex-1'}`}>
                                    <div className={`${isFullScreen ? '' : 'flex items-center justify-between'}`}>
                                      <div>
                                        <h4 className={`font-medium text-black ${isFullScreen ? 'text-sm mb-1 line-clamp-2' : 'text-sm'}`}>
                                          {formatNameSimple(candidate.last_name, candidate.first_name, candidate.name)}
                                        </h4>
                                        {candidate.party && (
                                          <div className={`${isFullScreen ? 'text-xs text-black mb-1 px-2 py-1 bg-white rounded-full' : 'text-sm text-black'}`}>
                                            {candidate.party}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`${isFullScreen ? '' : 'text-right'}`}>
                                        <div className={`${isFullScreen ? 'text-xs text-black font-semibold' : 'text-sm text-black'}`}>
                                          {Number(candidate.vote_count || 0).toLocaleString()} Votes ({election.voter_count ? ((candidate.vote_count / election.voter_count) * 100).toFixed(2) : '0.00'}%)
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
                  })()}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                No positions available
              </div>
            )}
          </div>
        </div>
      ) : tab === 'bulletin' ? (
        <div ref={bulletinFullScreenRef} className={`bg-white rounded-lg shadow p-6 ${isBulletinFullScreen ? 'fixed inset-0 bg-gray-100 z-50 overflow-y-auto' : ''}`}>
          {/* Election Info Header - Only in fullscreen */}
          {isBulletinFullScreen && (
            <div className="text-center mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <h1 className="text-4xl font-bold text-black mb-2">{election.title}</h1>
              <p className="text-xl text-gray-600 mb-4">{election.description}</p>
              <div className="flex items-center justify-center gap-6 text-lg text-gray-500">
                <span>Status: <span className={`font-medium ${election.status === 'completed' ? 'text-green-600' : election.status === 'ongoing' ? 'text-blue-600' : 'text-yellow-600'}`}>{election.status.toUpperCase()}</span></span>
                <span>•</span>
                <span>Total Voters: {election.voter_count || 0}</span>
                <span>•</span>
                <span>Votes Cast: {election.vote_count || 0}</span>
                <span>•</span>
                <span>Date: {parseElectionDate(election.date_from, election.start_time)} - {parseElectionDate(election.date_to, election.end_time)}</span>
              </div>
            </div>
          )}

          <div className={`flex items-center justify-between mb-6 ${isBulletinFullScreen ? 'sticky top-0 z-10 bg-white p-4 rounded-lg shadow-lg' : ''}`}>
            <h2 className={`text-xl font-semibold text-black flex items-center ${isBulletinFullScreen ? 'text-4xl' : ''}`}>
              <FileText className={`w-5 h-5 mr-2 ${isBulletinFullScreen ? 'w-8 h-8' : ''}`} />
              Election Bulletin
            </h2>
            <div className="flex items-center gap-3">
              {isBulletinFullScreen && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Auto-rotating every 5s</span>
                </div>
              )}
              {!isBulletinFullScreen && (
                <button
                  onClick={toggleBulletinFullScreen}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Bulletin
                </button>
              )}
            </div>
          </div>

          {/* Bulletin Tabs - Only show in non-fullscreen mode */}
          {!isBulletinFullScreen && (
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setBulletinActiveTab('voter-codes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  bulletinActiveTab === 'voter-codes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Voter Codes
              </button>
              <button
                onClick={() => setBulletinActiveTab('per-candidate')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  bulletinActiveTab === 'per-candidate'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Per Candidate
              </button>
            </div>
          </div>
          )}
          
          {bulletinLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : isBulletinFullScreen ? (
            /* Fullscreen Carousel Mode */
            <div className="space-y-6">
              {(() => {
                const carouselContent = getBulletinCarouselContent();
                
                if (carouselContent.type === 'voter-codes') {
                  return (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-semibold text-black flex items-center">
                          <Users className="w-8 h-8 mr-2" />
                          {carouselContent.title}
                        </h3>
                        <div className="text-sm text-gray-500">
                          Total: {bulletinData.voterCodes.length} voters
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {bulletinData.voterCodes.slice(carouselContent.page * 50, (carouselContent.page + 1) * 50).map((voter, index) => (
                          <div key={voter.voteToken || index} className="bg-white rounded p-2 border hover:shadow-md transition-shadow">
                            <div className="flex flex-col items-center w-full">
                              <span className="font-mono text-sm bg-blue-100 text-black px-2 py-1 rounded mb-1 text-center whitespace-nowrap w-full font-bold">
                                {voter.verificationCode}
                              </span>
                              <span className="text-xs text-gray-500 text-center">
                                {new Date(voter.voteDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (carouselContent.type === 'per-candidate') {
                  const position = election.positions[carouselContent.positionIndex];
                  const candidate = position?.candidates?.[carouselContent.candidateIndex];
                  
                  if (!candidate) return null;
                  
                  const candidateVoters = bulletinData.candidateVotes
                    ?.find(pos => pos.id === position.id)
                    ?.candidates?.find(c => c.id === candidate.id)
                    ?.voters || [];
                  
                  const startIndex = carouselContent.page * 50;
                  const endIndex = startIndex + 50;
                  const currentPageVoters = candidateVoters.slice(startIndex, endIndex);
                  
                  return (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-semibold text-black flex items-center">
                          <User className="w-8 h-8 mr-2" />
                          {carouselContent.title}
                        </h3>
                        <div className="text-sm text-gray-500">
                          Total: {carouselContent.candidateVotes || 0} votes
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-6 border">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="relative w-32 h-40">
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
                              <div className="w-32 h-40 rounded-lg bg-gray-200 flex items-center justify-center">
                                <User className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-semibold text-black">
                              {candidate.first_name} {candidate.last_name}
                            </h4>
                            {candidate.party && (
                              <div className="text-sm text-gray-600 mb-2">
                                {candidate.party}
                              </div>
                            )}
                            <div className="text-lg font-bold text-blue-600">
                              {candidate.vote_count || 0} votes
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                            Voter Codes ({candidateVoters.length}):
                          </h5>
                          <div className="grid grid-cols-6 gap-2">
                            {currentPageVoters.map((voter, voterIndex) => (
                              <div key={voterIndex} className="bg-white rounded p-2 border text-center hover:shadow-md transition-shadow">
                                <div className="flex flex-col items-center w-full">
                                  <span className="font-mono text-sm bg-blue-100 text-black px-2 py-1 rounded mb-1 whitespace-nowrap w-full font-bold">
                                    {voter.verificationCode}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(voter.voteDate || voter.vote_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (carouselContent.type === 'top3-winners') {
                  const position = election.positions[carouselContent.positionIndex];
                  const top3Winners = getTop3Winners(position.candidates || []);
                  
                  return (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                      <h3 className="text-2xl font-bold text-black mb-6 text-center">
                        {carouselContent.title}
                      </h3>
                      
                      {top3Winners.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {top3Winners.map((winner, index) => (
                              <div 
                                key={winner.id} 
                                className={`relative bg-white rounded-lg p-4 shadow-lg border-2 ${
                                  index === 0 ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-yellow-100' :
                                  index === 1 ? 'border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100' :
                                  'border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100'
                                }`}
                              >
                                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                                  index === 0 ? 'bg-yellow-500' :
                                  index === 1 ? 'bg-gray-500' :
                                  'bg-orange-500'
                                }`}>
                                  {index + 1}
                                </div>
                                
                                <div className="flex justify-center mb-3">
                                  <div className="relative w-32 h-40">
                                    {winner.image_url && !imageErrors[winner.id] ? (
                                      <Image
                                        src={candidateImages[winner.id] || getImageUrl(winner.image_url)}
                                        alt={`${winner.first_name} ${winner.last_name}`}
                                        fill
                                        sizes="128px"
                                        className="object-cover rounded-lg shadow-md"
                                        onError={() => handleImageError(winner.id)}
                                      />
                                    ) : (
                                      <div className="w-32 h-40 rounded-lg bg-gray-200 flex items-center justify-center shadow-md">
                                        <User className="w-16 h-16 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-center">
                                  <h5 className="font-bold text-black text-sm mb-1">
                                    {formatNameSimple(winner.last_name, winner.first_name, winner.name)}
                                  </h5>
                                  
                                  {winner.party && (
                                    <div className="mb-2">
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                        {winner.party}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="text-sm text-blue-600 font-bold">
                                    {Number(winner.vote_count || 0).toLocaleString()} votes
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
                        <div className="text-center py-4">
                          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No votes cast for this position yet</p>
                        </div>
                      )}
                    </div>
                  );
                }
                
                return null;
              })()}
            </div>
          ) : (
            /* Regular Tab Mode */
            <div className="space-y-6">
              {/* Voter Codes Tab */}
              {bulletinActiveTab === 'voter-codes' && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold text-black flex items-center ${isBulletinFullScreen ? 'text-2xl' : 'text-lg'}`}>
                      <Users className={`w-5 h-5 mr-2 ${isBulletinFullScreen ? 'w-8 h-8' : ''}`} />
                      Voter Verification Codes
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        Total: {bulletinData.voterCodes.length} voters
                      </div>
                      {bulletinData.voterCodes.length > 50 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Page {currentCodesPage + 1} of {Math.ceil(bulletinData.voterCodes.length / 50)}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={goToPreviousCodesPage}
                              disabled={currentCodesPage === 0}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={goToNextCodesPage}
                              disabled={currentCodesPage >= Math.ceil(bulletinData.voterCodes.length / 50) - 1}
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {bulletinData.voterCodes.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No voters yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-2">
                      {bulletinData.voterCodes.slice(currentCodesPage * 50, (currentCodesPage + 1) * 50).map((voter, index) => (
                        <div key={voter.voteToken || index} className="bg-white rounded p-2 border hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center w-full">
                            <span className="font-mono text-sm bg-blue-100 text-black px-2 py-1 rounded mb-1 text-center whitespace-nowrap w-full font-bold">
                              {voter.verificationCode}
                            </span>
                            <span className="text-xs text-gray-500 text-center">
                              {new Date(voter.voteDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Per Candidate Tab */}
              {bulletinActiveTab === 'per-candidate' && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold text-black flex items-center ${isBulletinFullScreen ? 'text-2xl' : 'text-lg'}`}>
                      <User className={`w-5 h-5 mr-2 ${isBulletinFullScreen ? 'w-8 h-8' : ''}`} />
                      Votes Per Candidate
                    </h3>
                    {election?.positions && election.positions.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Position {currentCandidatesPage + 1} of {election.positions.length}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={goToPreviousCandidatesPage}
                            disabled={currentCandidatesPage === 0}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={goToNextCandidatesPage}
                            disabled={currentCandidatesPage === election.positions.length - 1}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {election?.positions && election.positions[currentCandidatesPage] ? (
                    <div className="bg-white rounded-lg p-4">
                      <h4 className={`font-medium text-black mb-4 ${isBulletinFullScreen ? 'text-xl' : ''}`}>
                        {election.positions[currentCandidatesPage].name}
                      </h4>
                      <div className="space-y-4">
                        {election.positions[currentCandidatesPage].candidates?.map((candidate) => (
                          <div key={candidate.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <div className="relative w-16 h-20 mr-4">
                                  {candidate.image_url && !imageErrors[candidate.id] ? (
                                    <Image
                                      src={candidateImages[candidate.id] || getImageUrl(candidate.image_url)}
                                      alt={`${candidate.first_name} ${candidate.last_name}`}
                                      fill
                                      sizes="64px"
                                      className="object-cover rounded-lg"
                                      onError={() => handleImageError(candidate.id)}
                                    />
                                  ) : (
                                    <div className="w-16 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                                      <User className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-black">
                                    {candidate.first_name} {candidate.last_name}
                                  </div>
                                  {candidate.party && (
                                    <div className="text-sm text-gray-500">
                                          {candidate.party}
                                    </div>
                                  )}
                                  <div className="text-sm text-blue-600 font-medium">
                                    {candidate.vote_count || 0} votes
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Voter Codes for this candidate */}
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                Voter Codes ({bulletinData.candidateVotes
                                  .find(pos => pos.id === election.positions[currentCandidatesPage].id)
                                  ?.candidates?.find(c => c.id === candidate.id)
                                  ?.voters?.length || 0}):
                              </h5>
                              <div className="grid grid-cols-6 gap-2">
                                {bulletinData.candidateVotes
                                  .find(pos => pos.id === election.positions[currentCandidatesPage].id)
                                  ?.candidates?.find(c => c.id === candidate.id)
                                  ?.voters?.slice(0, 50).map((voter, voterIndex) => (
                                    <div key={voterIndex} className="bg-white rounded p-2 border text-center hover:shadow-md transition-shadow">
                                      <div className="flex flex-col items-center w-full">
                                        <span className="font-mono text-sm bg-blue-100 text-black px-2 py-1 rounded mb-1 whitespace-nowrap w-full font-bold">
                                          {voter.verificationCode}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(voter.voteDate || voter.vote_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  )) || []}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No positions found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Top 3 Winners - Only in fullscreen */}
              {isBulletinFullScreen && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                  <h3 className={`font-bold text-black mb-6 text-center ${isBulletinFullScreen ? 'text-2xl' : ''}`}>
                    Top 3 Winners Per Position
                  </h3>
                  {election.positions && election.positions.length > 0 ? (
                    <div className="space-y-6">
                      {election.positions.map((position) => {
                        const top3Winners = getTop3Winners(position.candidates || []);
                        
                        return (
                          <div key={position.id} className="bg-white rounded-lg p-4">
                            <h4 className="text-lg font-bold text-black mb-4 text-center">{position.name}</h4>
                            
                            {top3Winners.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {top3Winners.map((winner, index) => (
                                  <div 
                                    key={winner.id} 
                                    className={`relative bg-white rounded-lg p-4 shadow-lg border-2 ${
                                      index === 0 ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-yellow-100' :
                                      index === 1 ? 'border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100' :
                                      'border-orange-300 bg-gradient-to-b from-orange-50 to-orange-100'
                                    }`}
                                  >
                                    <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                                      index === 0 ? 'bg-yellow-500' :
                                      index === 1 ? 'bg-gray-500' :
                                      'bg-orange-500'
                                    }`}>
                                      {index + 1}
                                    </div>
                                    
                                    <div className="flex justify-center mb-3">
                                      <div className="relative w-20 h-24">
                                        {winner.image_url && !imageErrors[winner.id] ? (
                                          <Image
                                            src={candidateImages[winner.id] || getImageUrl(winner.image_url)}
                                            alt={`${winner.first_name} ${winner.last_name}`}
                                            fill
                                            sizes="80px"
                                            className="object-cover rounded-lg shadow-md"
                                            onError={() => handleImageError(winner.id)}
                                          />
                                        ) : (
                                          <div className="w-20 h-24 rounded-lg bg-gray-200 flex items-center justify-center shadow-md">
                                            <User className="w-10 h-10 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="text-center">
                                      <h5 className="font-bold text-black text-sm mb-1">
                                        {formatNameSimple(winner.last_name, winner.first_name, winner.name)}
                                      </h5>
                                      
                                      {winner.party && (
                                        <div className="mb-2">
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                            {winner.party}
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div className="text-sm text-blue-600 font-bold">
                                        {Number(winner.vote_count || 0).toLocaleString()} votes
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">No votes cast for this position yet</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-600 mb-2">No Positions Available</h4>
                      <p className="text-gray-500">This election doesn't have any positions yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      </div>
    </>
  );
}