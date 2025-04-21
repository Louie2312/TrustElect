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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

async function fetchWithAuth(url) {
  const token = Cookies.get('token');
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
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
    
    return {
      courses: criteria.courses || criteria.programs || [],
      year_levels: criteria.year_levels || criteria.yearLevels || [],
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

      const chartData = sortedCandidates.map(candidate => ({
        name: `${candidate.first_name} ${candidate.last_name}`,
        votes: candidate.vote_count || 0,
        party: candidate.party || 'Independent'
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
          
          {!election.needs_approval && election.status === 'upcoming' ? (
            <>
              <Link
                href={`/superadmin/election/${election.id}/edit`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Election
              </Link>
              
              {election.positions && election.positions.length > 0 ? (
                <Link
                  href={`/superadmin/election/${election.id}/ballot`}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Ballot
                </Link>
              ) : (
                <Link
                  href={`/superadmin/election/${election.id}/ballot/create`}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ballot
                </Link>
              )}
            </>
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

      {/* Approval Section */}
      {election.needs_approval && (
        <div className="mb-6 p-4 rounded-lg border-2 border-yellow-400 bg-yellow-50">
          <div className="flex items-center gap-2 mb-2 text-yellow-800">
            <ExclamationTriangle size={20} />
            <h3 className="font-bold text-black">This election requires your approval</h3>
          </div>
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
              <h3 className="font-medium mb-2 text-black">Date & Time</h3>
              <p className="text-gray-800">
                <span>Starts: {parseElectionDate(election.date_from, election.start_time)}</span>
              </p>
              <p className="text-gray-800">
                <span>Ends: {parseElectionDate(election.date_to, election.end_time)}</span>
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500 mb-2">Participation</h3>
              <p className="text-gray-800">
                {election.vote_count || 0} / {election.voter_count || 0} votes
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-500 mb-2">Election/Event Type</h3>
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
              </div>
              
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
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This election doesn't have a ballot yet.
                    {election.status === 'upcoming' && " Create one to allow voting."}
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
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="votes" fill="#3b82f6" name="Vote Count" />
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
            )}
          </div>
        </>
      )}
    </div>
  );
}