"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2, GraduationCap, BarChart, Building, ClipboardCheck, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import PermissionDisplay from '../../components/Admin/PermissionDisplay';
import usePermissions, { ensureUserIdFromToken } from '../../hooks/usePermissions.js';
import axios from "axios";

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

const statusTabs = [
  { id: 'ongoing', name: 'Ongoing Elections', icon: <Clock className="w-4 h-4" /> },
  { id: 'upcoming', name: 'Upcoming Elections', icon: <Calendar className="w-4 h-4" /> },
  { id: 'completed', name: 'Completed Elections', icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'to_approve', name: 'To Approve', icon: <AlertCircle className="w-4 h-4" /> }
];

const DeleteConfirmationModal = ({ isOpen, election, onCancel, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-black">Confirm Delete</h3>
        <p className="mb-6 text-black">
          Are you sure you want to delete the election <span className="font-semibold">{election?.title}</span>?      
        </p>  
             
        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center disabled:opacity-50"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="mr-2">Deleting...</span>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Election
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ElectionCard = ({ election, onClick, onDeleteClick, canDelete, activeTab }) => {
  // Determine if the creator is a superadmin
  const isSuperAdminCreator =
    election.created_by === 1 ||
    (election.created_by && election.created_by.id === 1) ||
    election.created_by_role === 'SuperAdmin';

  // Only show 'NEEDS APPROVAL' if in the to_approve tab and not created by superadmin
  const displayStatus = activeTab === 'to_approve' && election.needs_approval && !isSuperAdminCreator
    ? 'to_approve'
    : election.status;

  const statusColors = {
    ongoing: 'bg-blue-100 text-blue-800 border-blue-300',
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    to_approve: 'bg-purple-100 text-purple-800 border-purple-300'
  };

  const statusIcons = {
    ongoing: <Clock className="w-5 h-5" />,
    upcoming: <Calendar className="w-5 h-5" />,
    completed: <CheckCircle className="w-5 h-5" />,
    to_approve: <AlertCircle className="w-5 h-5" />
  };

  const parseElectionDate = (dateStr, timeStr) => {
    try {
      if (!dateStr || !timeStr) return 'Date not set';
      
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    
      const timeParts = timeStr.includes(':') ? timeStr.split(':') : [timeStr, '00'];
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // FIX: Remove the +1 from day
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
  
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 bg-white">
      {/* Status Banner */}
      <div className={`w-full py-2 px-4 flex items-center justify-between ${statusColors[displayStatus]}`}>
        <div className="flex items-center">
          {statusIcons[displayStatus]}
          <span className="ml-2 font-semibold">
            {displayStatus === 'to_approve' ? 'NEEDS APPROVAL' : displayStatus.toUpperCase()}
          </span>
        </div>
        
        {displayStatus === 'completed' && canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(election);
            }}
            className="text-red-500 hover:text-red-700 p-1 hover:bg-white hover:bg-opacity-50 rounded-full"
            title="Delete Election"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-5" onClick={() => onClick(election.id)}>
        <h3 className="font-bold text-xl text-black mb-2 truncate">{election.title}</h3>
        <p className="text-gray-600 mb-4 text-sm line-clamp-2 h-10">{election.description}</p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-600" />
            <div>
              <div className="text-sm text-gray-500">Voters</div>
              <div className="font-bold text-black">{Number(election.voter_count || 0).toLocaleString()}</div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-gray-600" />
            <div>
              <div className="text-sm text-gray-500">Votes</div>
              <div className="font-bold text-black">{Number(election.vote_count || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <div className={`h-2.5 w-2.5 rounded-full mr-2 ${election.ballot_exists ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <div className={`text-sm ${election.ballot_exists ? 'text-green-600' : 'text-red-600'}`}>
            {election.ballot_exists ? 'Ballot ready' : 'No ballot'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="grid grid-cols-2 gap-1 text-sm">
          <div className="text-black">
            <div className="text-gray-500 mb-1">Starts</div>
            <div className="font-medium">{parseElectionDate(election.date_from, election.start_time)}</div>
          </div>
          <div className="text-black">
            <div className="text-gray-500 mb-1">Ends</div>
            <div className="font-medium">{parseElectionDate(election.date_to, election.end_time)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [elections, setElections] = useState([]);
  const [allElections, setAllElections] = useState({
    ongoing: [],
    upcoming: [],
    completed: [],
    to_approve: []
  });
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const { hasPermission, permissionsLoading, permissions } = usePermissions();
  const [uiDesign, setUiDesign] = useState(null);
  const [landingContent, setLandingContent] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load UI design - simplified and memoized
  const loadUIDesign = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/studentUI`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.content) {
          const config = {
            type: data.content.type || 'poster',
            background_image: data.content.background_image || null,
            use_landing_design: data.content.use_landing_design || false
          };
          setUiDesign(config);
          
          if (config.type === 'landing' || config.use_landing_design) {
            try {
              const landingResponse = await fetch(`/api/content`);
              if (landingResponse.ok) {
                const landingData = await landingResponse.json();
                if (landingData && landingData.content) {
                  setLandingContent(landingData.content);
                }
              }
            } catch (landingError) {
              console.error('Error loading landing content:', landingError);
            }
          }
        } else {
          setUiDesign({
            type: 'poster',
            background_image: null,
            use_landing_design: false
          });
        }
      }
    } catch (error) {
      console.error('Error loading UI design:', error);
    }
  }, []);

  // Load all elections data - memoized without activeTab dependency
  const loadAllElections = useCallback(async () => {
    try {
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const results = {};
      
      await Promise.all(statuses.map(async (status) => {
        try {
          const response = await fetch(`/api/elections/status/${status}`, {
            headers: {
              'Authorization': `Bearer ${Cookies.get('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            results[status] = data || [];
          } else {
            console.error(`Error loading ${status} elections: ${response.status}`);
            results[status] = [];
          }
        } catch (err) {
          console.error(`Error fetching ${status} elections:`, err);
          results[status] = [];
        }
      }));
      
      // Load pending approval elections
      try {
        const response = await fetch(`/api/elections/admin-pending-approval`, {
          headers: {
            'Authorization': `Bearer ${Cookies.get('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          results['to_approve'] = data || [];
        } else {
          console.error(`Error loading pending approval elections: ${response.status}`);
          results['to_approve'] = [];
        }
      } catch (err) {
        console.error('Error fetching pending approval elections:', err);
        results['to_approve'] = [];
      }
      
      setAllElections(results);
      return results;
    } catch (err) {
      console.error('Error in loadAllElections:', err);
      setError('Failed to load elections data');
      throw err;
    }
  }, []);

  // Load stats - memoized
  const loadStats = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/elections/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load stats: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data || []);
      return data;
    } catch (err) {
      console.error("Failed to load stats:", err);
      setStats([]);
      throw err;
    }
  }, []);

  // Single initialization effect - FIXED
  useEffect(() => {
    let isMounted = true;
    
    const initializeDashboard = async () => {
      // Wait for permissions to load
      if (permissionsLoading) {
        return;
      }
      
      // Check if already loaded
      if (dataLoaded) {
        return;
      }
      
      // Check permissions
      if (!hasPermission('elections', 'view')) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Load data in parallel
        await Promise.all([
          loadAllElections(),
          loadStats(),
          loadUIDesign()
        ]);
        
        if (isMounted) {
          setDataLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (isMounted) {
          setError('Failed to load dashboard data');
          setIsLoading(false);
        }
      }
    };
    
    const initialLoad = async () => {
      if (isMounted) {
        await initializeDashboard();
      }
    };
    
    initialLoad();
    
    // Set up intervals for auto-refresh
    const intervals = [];
    
    // Refresh pending approvals every 15 seconds
    intervals.push(setInterval(() => {
      if (isMounted) {
        loadPendingApprovals();
      }
    }, 15000));
    
    // Refresh stats and live vote count every 30 seconds
    intervals.push(setInterval(() => {
      if (isMounted) {
        loadStats();
        loadLiveVoteCount();
      }
    }, 30000));
    
    // Refresh election data every 5 minutes to sync with backend status updates
    intervals.push(setInterval(() => {
      if (isMounted) {
        console.log('[FRONTEND] Auto-refreshing election data...');
        loadElections();
      }
    }, 300000)); // 5 minutes
    
    return () => {
      isMounted = false;
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [permissionsLoading, hasPermission, dataLoaded]); // REMOVED function dependencies

  // Handle tab change - update elections when tab or allElections change
  useEffect(() => {
    if (allElections && allElections[activeTab]) {
      setElections(allElections[activeTab] || []);
    }
  }, [activeTab, allElections]);

  // Ensure user ID is available from token - run once
  useEffect(() => {
    const userId = ensureUserIdFromToken();
    console.log('Admin Dashboard - Ensured User ID:', userId);
  }, []);

  const handleElectionClick = (electionId) => {
    if (!electionId || isNaN(parseInt(electionId))) {
      console.error('Invalid election ID:', electionId);
      return;
    }
    
    // Check if user has permission to view election details
    if (!hasPermission('elections', 'view')) {
      setActionMessage({
        type: 'error',
        text: 'You do not have permission to view election details'
      });
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
      return;
    }
    
    router.push(`/admin/election/${electionId}`);
  };

  const handleDeleteClick = (election) => {
    // Check if user has permission to delete elections
    if (!hasPermission('elections', 'delete')) {
      setActionMessage({
        type: 'error',
        text: 'You do not have permission to delete elections'
      });
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
      return;
    }
    
    setElectionToDelete(election);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!electionToDelete) return;
    
    // Double-check delete permission
    if (!hasPermission('elections', 'delete')) {
      setActionMessage({
        type: 'error',
        text: 'You do not have permission to delete elections'
      });
      setDeleteModalOpen(false);
      setElectionToDelete(null);
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
      return;
    }
    
    try {
      setIsDeleting(true);
      
      if (electionToDelete.status !== 'completed') {
        setActionMessage({
          type: 'error',
          text: 'Only completed elections can be deleted'
        });
        setDeleteModalOpen(false);
        return;
      }
      
      await fetchWithAuth(`/elections/${electionToDelete.id}`, {
        method: 'DELETE'
      });
      
      // Update the allElections state to remove the deleted election
      setAllElections(prev => ({
        ...prev,
        completed: prev.completed.filter(e => e.id !== electionToDelete.id)
      }));
      
      // Update the current elections view if we're on the completed tab
      if (activeTab === 'completed') {
        setElections(prev => prev.filter(e => e.id !== electionToDelete.id));
      }
      
      // Update stats
      loadStats();
      
      setActionMessage({
        type: 'success',
        text: `Election "${electionToDelete.title}" was successfully deleted.`
      });
      
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: `Failed to delete election: ${error.message}`
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setElectionToDelete(null);
      
      setTimeout(() => {
        setActionMessage(null);
      }, 5000);
    }
  };

  const getStatValue = (status, field = 'count') => {
    if (!stats || !Array.isArray(stats)) {
      return 0;
    }
    
    // Find the stat with matching status
    const stat = stats.find(s => s.status === status);
    
    if (stat) {
      if (field === 'count') {
        return parseInt(stat.count || 0);
      } else if (field === 'total_voters') {
        return parseInt(stat.total_voters || 0);
      } else if (field === 'total_votes') {
        return parseInt(stat.total_votes || 0);
      }
    }
    
    return 0;
  };

  // Format image URL helper function
  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('http')) return url;

    if (url.startsWith('/api/')) {
      return `${API_BASE.replace('/api', '')}${url}`;
    }

    if (url.startsWith('/uploads/')) {
      return `${API_BASE.replace('/api', '')}${url}`;
    }
    
    return `${API_BASE}${url.startsWith('/') ? url : '/' + url}`;
  };
  
  // Landing page layout component for when landing design is selected
  const LandingPageLayout = () => {
    if (!landingContent) return null;
    
    return (
      <div className="landing-page-container">
        {/* Hero Section */}
        <section 
          className="text-white py-12 px-6"
          style={{
            backgroundColor: landingContent.hero?.bgColor || '#01579B',
            color: landingContent.hero?.textColor || '#ffffff',
            backgroundImage: landingContent.hero?.posterImage ? `url(${formatImageUrl(landingContent.hero.posterImage)})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="container mx-auto max-w-6xl">
            <h1 
              className="text-3xl md:text-4xl font-bold leading-tight mb-4"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero?.title || 'Welcome to TrustElect'}
            </h1>
            <p 
              className="text-xl"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero?.subtitle || 'Your trusted voting platform'}
            </p>
          </div>
        </section>
      </div>
    );
  };

  if (isLoading || permissionsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-solid border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Remove all UI design/background/landing logic from this file.
  // Only keep dashboard content, stats, and election logic.
  // Remove containerStyle, contentStyle, uiDesign, landingContent, and related code.

  const contentStyle = {
    minHeight: '100vh',
    padding: '2rem 1rem'
  };

  // If the user doesn't have permission to view elections, show an access denied message
  if (!hasPermission('elections', 'view')) {
    return (
      <div style={contentStyle}>
        <div className="container mx-auto px-4 py-8 min-h-screen relative z-10">
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-md text-center">
            <div className="flex items-center justify-center">
              <div className="bg-red-100 p-3 rounded-full">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mt-4 mb-2 text-black">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don&apos;t have permission to view elections. Please contact your administrator for access.
            </p>
            <div className="mt-6">
              <Link href="/admin" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={contentStyle}>
      <div className="container mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="lg:w-3/4">
            <h1 className="text-3xl font-bold mb-2 text-black bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow">Dashboard</h1>
            
            {actionMessage && (
              <div className={`mb-4 p-4 rounded-lg shadow ${
                actionMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800 border-l-4 border-green-500' 
                  : 'bg-red-100 text-red-800 border-l-4 border-red-500'
              }`}>
                {actionMessage.text}
              </div>
            )}
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-500 mb-2">Total Elections</h3>
                <p className="text-3xl font-bold text-black">
                  {Array.isArray(stats) 
                    ? stats.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)
                    : stats?.elections_count || 0}
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-500 mb-2">Total Voters</h3>
                <p className="text-3xl font-bold text-black">
                  {Array.isArray(stats) 
                    ? stats.reduce((sum, stat) => sum + parseInt(stat.total_voters || 0), 0).toLocaleString()
                    : Number(stats?.voters_count || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6">
                <h3 className="font-medium text-gray-500 mb-2">Total Votes Cast</h3>
                <p className="text-3xl font-bold text-black">
                  {Array.isArray(stats) 
                    ? stats.reduce((sum, stat) => sum + parseInt(stat.total_votes || 0), 0)
                    : stats?.votes_count || 0}
                </p>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow mb-6 p-1">
              <div className="flex flex-wrap">
                {statusTabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`flex items-center justify-center px-4 py-3 font-medium text-sm transition-colors duration-200 flex-1 ${
                      activeTab === tab.id 
                        ? 'bg-blue-50 text-blue-600 rounded-md' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        {tab.icon}
                        <span className="ml-2">{tab.name}</span>
                      </div>
                      <span className="bg-gray-100 rounded-full px-3 py-1 text-xs font-bold">
                        {getStatValue(tab.id, 'count')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap justify-between items-center">
              <h2 className="text-xl font-bold text-black">
                {activeTab === 'ongoing' && 'Ongoing Elections'}
                {activeTab === 'upcoming' && 'Upcoming Elections'}
                {activeTab === 'completed' && 'Completed Elections'}
                {activeTab === 'to_approve' && 'Elections Pending Approval'}
              </h2>
              {hasPermission('elections', 'create') && (
                <Link 
                  href="/admin/election/create"
                  className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all mt-2 md:mt-0"
                >
                  + Create New Election
                </Link>
              )}
            </div>

            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {elections.length > 0 ? (
                  elections.map((election, index) => (
                    <ElectionCard 
                      key={`${election.id}-${index}`} 
                      election={election} 
                      onClick={handleElectionClick}
                      onDeleteClick={handleDeleteClick}
                      canDelete={hasPermission('elections', 'delete')}
                      activeTab={activeTab}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <div className="text-gray-400 mb-4">
                      {activeTab === 'ongoing' && <Clock className="w-16 h-16 mx-auto" />}
                      {activeTab === 'upcoming' && <Calendar className="w-16 h-16 mx-auto" />}
                      {activeTab === 'completed' && <CheckCircle className="w-16 h-16 mx-auto" />}
                      {activeTab === 'to_approve' && <AlertCircle className="w-16 h-16 mx-auto" />}
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      No {activeTab === 'to_approve' ? 'elections pending approval' : `${activeTab} elections`}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {activeTab === 'ongoing' && 'There are currently no ongoing elections.'}
                      {activeTab === 'upcoming' && 'No upcoming elections scheduled.'}
                      {activeTab === 'completed' && 'No completed elections yet. Elections that have ended will be shown here.'}
                      {activeTab === 'to_approve' && 'No elections are waiting for approval.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="lg:w-1/4 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow p-6">
              <PermissionDisplay />
            </div>
          </div>
        </div>
        
        <DeleteConfirmationModal 
          isOpen={deleteModalOpen}
          election={electionToDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setElectionToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}