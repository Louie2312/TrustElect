"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2, Lock, BarChart, PieChart, RefreshCw, Download, X, Activity, BarChart2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import usePermissions, { ensureUserIdFromToken } from '../../hooks/usePermissions.js';
import axios from "axios";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { generatePdfReport } from '@/utils/pdfGenerator';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  
  const getStatusTabs = () => [
    { id: 'ongoing', name: 'Ongoing Elections', icon: <Clock className="w-4 h-4" /> },
    { id: 'upcoming', name: 'Upcoming Elections', icon: <Calendar className="w-4 h-4" /> },
    { id: 'completed', name: 'Completed Elections', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'to_approve', name: 'To Approve', icon: <AlertCircle className="w-4 h-4" /> }
  ];
  const [elections, setElections] = useState([]);
  const [allElections, setAllElections] = useState({
    ongoing: [],
    upcoming: [],
    completed: [],
    to_approve: []
  });
  const [stats, setStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const { hasPermission, permissionsLoading, permissions } = usePermissions();
  const [uiDesign, setUiDesign] = useState(null);
  const [landingContent, setLandingContent] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [totalUniqueVoters, setTotalUniqueVoters] = useState(0);
  const [liveVoteData, setLiveVoteData] = useState(null);
  const [showLiveVoteModal, setShowLiveVoteModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [systemLoadData, setSystemLoadData] = useState(null);
  const [showSystemLoadModal, setShowSystemLoadModal] = useState(false);
  const [isSystemLoadLoading, setIsSystemLoadLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDataReset, setIsDataReset] = useState(false);
  const isRefreshingRef = useRef(false);

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

  // Load pending approvals only (for background refresh)
  const loadPendingApprovals = useCallback(async () => {
    try {
      const response = await fetch(`/api/elections/admin-pending-approval`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllElections(prev => ({
          ...prev,
          'to_approve': data || []
        }));
      }
    } catch (err) {
      console.error('Error fetching pending approval elections:', err);
    }
  }, []);

  // Refresh all data with loading indicator
  const refreshAllData = useCallback(async () => {
    if (isRefreshingRef.current) return; // Prevent multiple simultaneous refreshes
    
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        loadAllElections(),
        loadStats(),
        loadTotalUniqueVoters(),
        loadLiveVoteCount()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [loadAllElections, loadStats, loadTotalUniqueVoters, loadLiveVoteCount]);

  // Load stats - memoized
  const loadStats = useCallback(async () => {
    try {
      const token = Cookies.get('token');
      
      // Load election stats only (remove superadmin endpoint for admin users)
      const electionsResponse = await fetch(`/api/elections/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!electionsResponse.ok) {
        throw new Error(`Failed to load election stats: ${electionsResponse.status}`);
      }
      
      const electionsData = await electionsResponse.json();
      
      // Set stats without total_students for admin users
      const statsData = electionsData || [];
      setStats(statsData);
      return statsData;
    } catch (err) {
      console.error("Failed to load stats:", err);
      setStats([]);
      throw err;
    }
  }, []);

  // Load total unique voters - same as super admin
  const loadTotalUniqueVoters = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/elections/preview-voters', {
        method: 'POST',
        body: JSON.stringify({
          eligible_voters: {
            programs: [],
            yearLevels: [],
            gender: []
          }
        })
      });
      setTotalUniqueVoters(response.count || 0);
    } catch (err) {
      console.log("[Admin] Total unique voters not available:", err.message);
      setTotalUniqueVoters(0);
    }
  }, []);

  // Load live vote count for ongoing elections (optional feature)
  const loadLiveVoteCount = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/elections/live-vote-count');
      setLiveVoteData(response);
      setRefreshTime(new Date());
      return response;
    } catch (err) {
      console.log("[Admin] Live vote count not available:", err.message);
      // Set empty data instead of null to prevent UI errors
      setLiveVoteData([]);
      return [];
    }
  }, []);

  // Load system load data
  const loadSystemLoadData = useCallback(async (timeframe = '24h') => {
    try {
      setIsSystemLoadLoading(true);
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/reports/system-load?timeframe=${timeframe}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load system load data: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Extract the actual data from the response structure
      // Backend returns: { success: true, data: { summary: {...}, login_activity: [...], voting_activity: [...] } }
      const data = responseData.success ? responseData.data : responseData;
      
      setSystemLoadData(data);
      setSelectedTimeframe(timeframe);
    } catch (err) {
      console.log("[Admin] System load data not available:", err.message);
      // Set empty data structure instead of null to prevent UI errors
      setSystemLoadData({
        login_activity: [],
        voting_activity: [],
        summary: {}
      });
    } finally {
      setIsSystemLoadLoading(false);
    }
  }, []);

  // Initialize dashboard data
  useEffect(() => {
    let isMounted = true;
    
    const initializeDashboard = async () => {
      if (permissionsLoading || dataLoaded) {
        return;
      }
      
      if (!hasPermission('elections', 'view')) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Load critical data
        await Promise.all([
          loadAllElections(),
          loadStats(),
          loadUIDesign()
        ]);
        
        if (isMounted) {
          setDataLoaded(true);
          setIsLoading(false);
          setIsInitialLoad(false);
        }
        
        // Load optional data in background
        setTimeout(() => {
          if (isMounted) {
            loadTotalUniqueVoters().catch(() => {});
            loadLiveVoteCount().catch(() => {});
            loadSystemLoadData('24h').catch(() => {});
          }
        }, 1000);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (isMounted) {
          setError('Failed to load dashboard data');
          setIsLoading(false);
        }
      }
    };
    
    initializeDashboard();
    
    return () => {
      isMounted = false;
    };
  }, [permissionsLoading, hasPermission, dataLoaded]);

  // Handle tab change - update elections when tab or allElections change
  useEffect(() => {
    if (allElections && allElections[activeTab]) {
      setElections(allElections[activeTab] || []);
    }
  }, [activeTab, allElections]);

  // Background refresh intervals
  useEffect(() => {
    if (!dataLoaded) return;
    
    const intervals = [];
    
    // Refresh elections every 30 seconds
    intervals.push(setInterval(() => {
      loadAllElections().catch(() => {});
    }, 30000));
    
    // Refresh stats every 2 minutes
    intervals.push(setInterval(() => {
      loadStats().catch(() => {});
    }, 120000));
    
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [dataLoaded]);

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

  // Render election cards
  const renderElectionCards = () => {
    if (!elections || elections.length === 0) return null;
    
    return elections.map((election, index) => (
      <ElectionCard 
        key={`${election.id}-${index}`} 
        election={election} 
        onClick={handleElectionClick}
        onDeleteClick={handleDeleteClick}
        canDelete={hasPermission ? hasPermission('elections', 'delete') : false}
        activeTab={activeTab}
      />
    ));
  };

  // Handle live vote count modal
  const handleViewLiveVoteCount = async (election) => {
    setSelectedElection(election);
    setShowLiveVoteModal(true);
    // Load live vote data when modal is opened
    await loadLiveVoteCount();
  };

  // Handle system load reports modal
  const handleViewSystemLoadReports = async () => {
    setShowSystemLoadModal(true);
    if (!systemLoadData) {
      await loadSystemLoadData('24h');
    }
  };

  // Helper functions for system load reports
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatTime = (hour) => {
    if (hour === undefined || hour === null) return '12:00 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12:00 AM';
    
    if (hourNum === 0) return '12:00 AM';
    if (hourNum < 12) return `${hourNum}:00 AM`;
    if (hourNum === 12) return '12:00 PM';
    return `${hourNum - 12}:00 PM`;
  };

  const formatTimeForChart = (hour) => {
    if (hour === undefined || hour === null) return '12 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12 AM';
    
    if (hourNum === 0) return '12 AM';
    if (hourNum < 12) return `${hourNum} AM`;
    if (hourNum === 12) return '12 PM';
    return `${hourNum - 12} PM`;
  };

  const calculateAverage = (data) => {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const validCounts = data.filter(item => item && typeof item.count === 'number' && !isNaN(item.count));
    if (validCounts.length === 0) return 0;
    const sum = validCounts.reduce((acc, curr) => acc + curr.count, 0);
    return Math.round(sum / validCounts.length);
  };

  const findPeakHour = (data) => {
    if (!Array.isArray(data) || data.length === 0) return { hour: 0, count: 0 };
    const validData = data.filter(item => item && typeof item.count === 'number' && !isNaN(item.count));
    if (validData.length === 0) return { hour: 0, count: 0 };
    
    return validData.reduce((peak, current) => 
      current.count > peak.count ? current : peak, 
      validData[0]
    );
  };

  const validateData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      hour: item.hour || 0,
      count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0
    }));
  };


  const handleResetSystemLoadData = async () => {
    // Check if user has permission to reset system load data
    if (!hasPermission('system', 'reset')) {
      toast.error('You do not have permission to reset system load data');
      setShowResetConfirm(false);
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE}/reports/system-load/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });

      if (response.ok) {
        toast.success('System load data has been reset successfully!');
        setShowResetConfirm(false);
        // Set data reset flag to show empty state immediately
        setIsDataReset(true);
        
        // Refresh the data after a short delay
        setTimeout(() => {
          loadSystemLoadData(selectedTimeframe);
          setIsDataReset(false);
        }, 1500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to reset system load data');
      }
    } catch (error) {
      console.error('Error resetting system load data:', error);
      toast.error('Failed to reset system load data. Please try again.');
    } finally {
      setIsResetting(false);
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

  if (isInitialLoad || permissionsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-solid border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }


  // If the user doesn't have permission to view elections, show an access denied message
  if (!hasPermission('elections', 'view')) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        <div className="flex items-center gap-3">
          {isRefreshing && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Refreshing data...
            </div>
          )}
          <button
            onClick={refreshAllData}
            disabled={isRefreshing}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh all data"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Elections</h3>
          <p className="text-3xl font-bold text-black">
            {Number(stats.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Voters</h3>
          <p className="text-3xl font-bold text-black">
            {Number(totalUniqueVoters).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Votes Cast</h3>
          <p className="text-3xl font-bold text-black">
            {Number(stats.reduce((sum, stat) => sum + parseInt(stat.total_votes || 0), 0)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow mb-6 p-1">
        <div className="flex">
          {getStatusTabs().map(tab => {
            const count = getStatValue(tab.id, 'count');
            const hasPending = tab.id === 'to_approve' && count > 0;
            
            return (
              <button
                key={tab.id}
                className={`flex items-center justify-center px-6 py-3 font-medium text-sm transition-colors duration-200 flex-1 
                  ${activeTab === tab.id 
                    ? 'bg-gray-200 text-black font-bold rounded-md' 
                    : hasPending 
                      ? 'text-black hover:text-black bg-purple-50 hover:bg-purple-100'
                      : 'text-black hover:text-black hover:bg-gray-50'
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-1 relative">
                    {tab.icon}
                    <span className="ml-2">{tab.name}</span>
                    {hasPending && (
                      <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {Number(count).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    hasPending 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100'
                  }`}>
                    {Number(count).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-black">
          {activeTab === 'ongoing' && 'Ongoing Elections'}
          {activeTab === 'upcoming' && 'Upcoming Elections'}
          {activeTab === 'completed' && 'Completed Elections'}
          {activeTab === 'to_approve' && 'Elections Pending Approval'}
        </h2>
        {hasPermission('elections', 'create') && (
          <Link 
            href="/admin/election/create"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
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
            renderElectionCards()
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
      
      {/* Live Vote Count Section */}
      {activeTab === 'ongoing' && elections.length > 0 && liveVoteData && liveVoteData.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-black flex items-center">
              <BarChart className="mr-2 text-black" />
              Live Vote Count
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full animate-pulse">
                Live
              </span>
            </h2>
            <div className="flex items-center text-sm text-black bg-gray-100 px-3 py-2 rounded-md shadow-sm">
              <Clock className="w-4 h-4 mr-1" />
              Last updated: {refreshTime.toLocaleTimeString()}
              <button 
                onClick={() => {
                  setIsRefreshing(true);
                  loadLiveVoteCount().finally(() => setIsRefreshing(false));
                }}
                disabled={isRefreshing}
                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Refresh live data"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveVoteData.map((election) => (
              <div key={election.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewLiveVoteCount(election)}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-black text-sm truncate flex-1">{election.title}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">Live</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Votes:</span>
                    <span className="font-semibold text-black">{Number(election.total_votes || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Voter Count:</span>
                    <span className="font-semibold text-black">{Number(election.voter_count || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${election.voter_count > 0 ? Math.min((election.total_votes / election.voter_count) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {election.voter_count > 0 ? Math.round((election.total_votes / election.voter_count) * 100) : 0}% participation
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Load Reports Navigation */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black flex items-center">
            <BarChart className="mr-2 text-black" />
            System Load Reports
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Analytics
            </span>
          </h2>
          <button 
            onClick={handleViewSystemLoadReports}
            className="flex items-center text-black bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors duration-150 shadow-sm"
          >
            <BarChart className="w-4 h-4 mr-2" />
            View Reports
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-500 rounded">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-black">Login Activity</h3>
            </div>
            <p className="text-2xl font-bold text-black">
              {systemLoadData && systemLoadData.login_activity ? formatNumber((systemLoadData.login_activity || []).reduce((sum, item) => sum + (item.count || 0), 0)) : '0'}
            </p>
            <p className="text-xs text-blue-600">Total logins (24h)</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-500 rounded">
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-black">Voting Activity</h3>
            </div>
            <p className="text-2xl font-bold text-black">
              {systemLoadData && systemLoadData.voting_activity ? formatNumber((systemLoadData.voting_activity || []).reduce((sum, item) => sum + (item.count || 0), 0)) : '0'}
            </p>
            <p className="text-xs text-green-600">Total votes (24h)</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-500 rounded">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-black">Peak Hour</h3>
            </div>
            <p className="text-2xl font-bold text-black">
              {systemLoadData && systemLoadData.login_activity && systemLoadData.login_activity.length > 0 
                ? formatTime(findPeakHour(validateData(systemLoadData.login_activity)).hour)
                : 'N/A'
              }
            </p>
            <p className="text-xs text-purple-600">Most active time</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            {systemLoadData && systemLoadData.login_activity 
              ? 'System analytics loaded successfully. Click "View Reports" for detailed analysis.'
              : 'Click "View Reports" to load system analytics and performance metrics.'
            }
          </p>
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

      {/* Live Vote Count Modal */}
      {showLiveVoteModal && selectedElection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-gray-50 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto border border-gray-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black">{selectedElection.title} - Live Vote Count</h2>
                  <p className="text-sm text-black bg-gray-100 px-3 py-1 rounded-md inline-block mt-2 shadow-sm">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Last updated: {refreshTime.toLocaleTimeString()}
                  </p>
                </div>
                <button onClick={() => setShowLiveVoteModal(false)} className="text-black hover:text-gray-700 bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-colors duration-150">
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Voter Participation Overview */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Voter Participation Overview
                  </h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Voted', value: selectedElection.total_votes || 0, color: '#10B981' },
                            { name: 'Not Voted', value: Math.max(0, (selectedElection.voter_count || 0) - (selectedElection.total_votes || 0)), color: '#E5E7EB' }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Voted', value: selectedElection.total_votes || 0, color: '#10B981' },
                            { name: 'Not Voted', value: Math.max(0, (selectedElection.voter_count || 0) - (selectedElection.total_votes || 0)), color: '#E5E7EB' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [Number(value).toLocaleString(), name]}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value) => <span style={{ color: '#374151', fontWeight: '500' }}>{value}</span>}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Participation Rate: <span className="font-bold text-black">
                        {selectedElection.voter_count > 0 ? Math.round((selectedElection.total_votes / selectedElection.voter_count) * 100) : 0}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Votes by Position */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-black mb-4 flex items-center">
                    <BarChart className="w-5 h-5 mr-2" />
                    Votes by Position
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={selectedElection.positions || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="voteGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#374151"
                          tick={{ fill: '#374151', fontSize: 11 }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          stroke="#374151"
                          tick={{ fill: '#374151', fontSize: 11 }}
                          tickFormatter={(value) => Number(value).toLocaleString()}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [Number(value).toLocaleString(), name]}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: '#ffffff', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="vote_count" 
                          name="Votes" 
                          fill="url(#voteGradient)"
                          radius={[6, 6, 0, 0]}
                          animationDuration={2000}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowLiveVoteModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Load Reports Modal */}
      {showSystemLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black">System Load Report</h2>
                  <p className="text-sm text-black">Peak usage times and system activity</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedTimeframe}
                    onChange={(e) => loadSystemLoadData(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm text-black"
                    disabled={isSystemLoadLoading}
                  >
                    <option value="24h" className="text-black">Last 24 Hours</option>
                    <option value="7d" className="text-black">Last 7 Days</option>
                    <option value="30d" className="text-black">Last 30 Days</option>
                  </select>
                  {/* Only show reset button for superadmins */}
                  {hasPermission('system', 'reset') && (
                    <button 
                      onClick={() => setShowResetConfirm(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                      title="Reset system load data for fresh testing"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Data
                    </button>
                  )}
                  <button onClick={() => setShowSystemLoadModal(false)} className="text-black hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Empty State Message */}
              {isDataReset && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <RefreshCw className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-800">Data Reset Successfully!</h3>
                      <p className="text-green-700">All system load data has been cleared. Fresh data collection will begin for tomorrow&apos;s testing.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isSystemLoadLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <p className="text-blue-800">Loading data for {selectedTimeframe === '24h' ? 'Last 24 Hours' : selectedTimeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'}...</p>
                  </div>
                </div>
              )}

              {systemLoadData ? (
                <>
                  {/* Process data */}
                  {(() => {
                    const processedLoginData = isDataReset ? [] : validateData(systemLoadData.login_activity || []);
                    const processedVotingData = isDataReset ? [] : validateData(systemLoadData.voting_activity || []);
                    
                    const loginPeak = findPeakHour(processedLoginData);
                    const votingPeak = findPeakHour(processedVotingData);

                    const chartConfig = {
                      login: {
                        gradient: { id: 'loginGradient', color: '#3B82F6' },
                        data: processedLoginData,
                        average: calculateAverage(processedLoginData),
                        peak: loginPeak,
                        total: processedLoginData.reduce((sum, item) => sum + item.count, 0)
                      },
                      voting: {
                        gradient: { id: 'votingGradient', color: '#10B981' },
                        data: processedVotingData,
                        average: calculateAverage(processedVotingData),
                        peak: votingPeak,
                        total: processedVotingData.reduce((sum, item) => sum + item.count, 0)
                      }
                    };

                    const CustomTooltip = ({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0].value || 0;
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl">
                            <p className="text-sm font-semibold mb-2 text-black">{formatTime(label)}</p>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                payload[0].name === 'Logins' ? 'bg-blue-500' : 'bg-green-500'
                              }`}></div>
                              <p className="text-sm text-black">
                                {payload[0].name}: <span className="font-bold text-black">{formatNumber(value)}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    };

                    return (
                      <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-blue-500 rounded-lg">
                                <Clock className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-sm font-semibold text-black">Peak Login Hour</h3>
                            </div>
                            <p className="text-3xl font-bold text-black mb-1">
                              {formatTime(chartConfig.login.peak.hour)}
                            </p>
                            <p className="text-sm text-black">
                              {formatNumber(chartConfig.login.peak.count)} logins
                            </p>
                            <div className="mt-2 text-xs text-blue-600">
                              Total: {formatNumber(chartConfig.login.total)} | Avg: {formatNumber(chartConfig.login.average)}/hour
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-green-500 rounded-lg">
                                <Activity className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-sm font-semibold text-black">Peak Voting Hour</h3>
                            </div>
                            <p className="text-3xl font-bold text-black mb-1">
                              {formatTime(chartConfig.voting.peak.hour)}
                            </p>
                            <p className="text-sm text-black">
                              {formatNumber(chartConfig.voting.peak.count)} votes
                            </p>
                            <div className="mt-2 text-xs text-green-600">
                              Total: {formatNumber(chartConfig.voting.total)} | Avg: {formatNumber(chartConfig.voting.average)}/hour
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-purple-500 rounded-lg">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              <h3 className="text-sm font-semibold text-black">Total Activity</h3>
                            </div>
                            <p className="text-3xl font-bold text-black mb-1">
                              {formatNumber(chartConfig.login.total + chartConfig.voting.total)}
                            </p>
                            <p className="text-sm text-black">
                              total actions in the last {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}
                            </p>
                            <div className="mt-2 text-xs text-purple-600">
                              Logins: {formatNumber(chartConfig.login.total)} | Votes: {formatNumber(chartConfig.voting.total)}
                            </div>
                          </div>
                        </div>

                        {/* Usage Charts */}
                        <div className="space-y-6">
                          {/* Login Activity Chart */}
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            {isDataReset || processedLoginData.length === 0 ? (
                              <div className="h-[350px] flex items-center justify-center">
                                <div className="text-center">
                                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <BarChart2 className="w-8 h-8 text-gray-400" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                    {isDataReset ? 'No Login Data Available' : 'No Login Data for Selected Period'}
                                  </h3>
                                  <p className="text-gray-500">
                                    {isDataReset 
                                      ? 'Data has been reset. New login activity will be tracked during testing.'
                                      : `No login activity found for the last ${selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}.`
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-xl text-black font-bold">Login Activity</h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span>Peak: {formatTime(chartConfig.login.peak.hour)} ({formatNumber(chartConfig.login.peak.count)} logins)</span>
                                  </div>
                                </div>
                                <div className="h-[350px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={chartConfig.login.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                      <defs>
                                        <linearGradient id={chartConfig.login.gradient.id} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.9}/>
                                          <stop offset="95%" stopColor={chartConfig.login.gradient.color} stopOpacity={0.3}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis 
                                        dataKey="hour" 
                                        tickFormatter={formatTimeForChart}
                                        stroke="#374151"
                                        tick={{ fill: '#374151', fontSize: 11 }}
                                        axisLine={{ stroke: '#d1d5db' }}
                                      />
                                      <YAxis 
                                        stroke="#374151"
                                        tick={{ fill: '#374151', fontSize: 11 }}
                                        tickFormatter={formatNumber}
                                        axisLine={{ stroke: '#d1d5db' }}
                                      />
                                      <Tooltip 
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                                      />
                                      <ReferenceLine 
                                        y={chartConfig.login.average} 
                                        label={{ 
                                          value: `Avg: ${formatNumber(chartConfig.login.average)}`,
                                          position: 'right',
                                          fill: '#6b7280',
                                          fontSize: 11,
                                          fontWeight: 500
                                        }} 
                                        stroke="#6b7280" 
                                        strokeDasharray="5 5" 
                                      />
                                      <Bar 
                                        dataKey="count" 
                                        name="Logins" 
                                        fill={`url(#${chartConfig.login.gradient.id})`}
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={2000}
                                      />
                                    </RechartsBarChart>
                                  </ResponsiveContainer>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Voting Activity Chart */}
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            {isDataReset || processedVotingData.length === 0 ? (
                              <div className="h-[350px] flex items-center justify-center">
                                <div className="text-center">
                                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <Activity className="w-8 h-8 text-gray-400" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                    {isDataReset ? 'No Voting Data Available' : 'No Voting Data for Selected Period'}
                                  </h3>
                                  <p className="text-gray-500">
                                    {isDataReset 
                                      ? 'Data has been reset. New voting activity will be tracked during testing.'
                                      : `No voting activity found for the last ${selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}.`
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-xl text-black font-bold">Voting Activity</h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span>Peak: {formatTime(chartConfig.voting.peak.hour)} ({formatNumber(chartConfig.voting.peak.count)} votes)</span>
                                  </div>
                                </div>
                                <div className="h-[350px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={chartConfig.voting.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                      <defs>
                                        <linearGradient id={chartConfig.voting.gradient.id} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.9}/>
                                          <stop offset="95%" stopColor={chartConfig.voting.gradient.color} stopOpacity={0.3}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis 
                                        dataKey="hour" 
                                        tickFormatter={formatTimeForChart}
                                        stroke="#374151"
                                        tick={{ fill: '#374151', fontSize: 11 }}
                                        axisLine={{ stroke: '#d1d5db' }}
                                      />
                                      <YAxis 
                                        stroke="#374151"
                                        tick={{ fill: '#374151', fontSize: 11 }}
                                        tickFormatter={formatNumber}
                                        axisLine={{ stroke: '#d1d5db' }}
                                      />
                                      <Tooltip 
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                                      />
                                      <ReferenceLine 
                                        y={chartConfig.voting.average} 
                                        label={{ 
                                          value: `Avg: ${formatNumber(chartConfig.voting.average)}`,
                                          position: 'right',
                                          fill: '#6b7280',
                                          fontSize: 11,
                                          fontWeight: 500
                                        }} 
                                        stroke="#6b7280" 
                                        strokeDasharray="5 5" 
                                      />
                                      <Bar 
                                        dataKey="count" 
                                        name="Votes" 
                                        fill={`url(#${chartConfig.voting.gradient.id})`}
                                        radius={[6, 6, 0, 0]}
                                        animationDuration={2000}
                                      />
                                    </RechartsBarChart>
                                  </ResponsiveContainer>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <BarChart2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No System Load Data Available</h3>
                    <p className="text-gray-500">System load data is not available or has not been collected yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-black">Reset System Load Data</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to reset all system load data? This action will:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Clear all login activity records</li>
                  <li>Clear all voting activity records</li>
                  <li>Reset peak hour calculations</li>
                  <li>Start fresh data collection for tomorrow&apos;s testing</li>
                </ul>
                <p className="text-red-600 font-medium mt-3">
                  ⚠️ This action cannot be undone!
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetSystemLoadData}
                  disabled={isResetting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Reset Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

