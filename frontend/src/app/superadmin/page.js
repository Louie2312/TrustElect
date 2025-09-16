"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2, BarChart, PieChart, RefreshCw, Download, X } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import axios from 'axios';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth(url, options = {}, retries = 3) {
  const token = Cookies.get('token');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          console.warn(`Attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (attempt === retries) {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}

const statusTabs = [
  { id: 'ongoing', name: 'Ongoing Elections', icon: <Clock className="w-4 h-4" /> },
  { id: 'upcoming', name: 'Upcoming Elections', icon: <Calendar className="w-4 h-4" /> },
  { id: 'completed', name: 'Completed Elections', icon: <CheckCircle className="w-4 h-4" /> },
  { id: 'to_approve', name: 'To Approve', icon: <AlertCircle className="w-4 h-4 text-purple" /> },
];

const DeleteConfirmationModal = ({ isOpen, election, onCancel, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-50">
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

const ElectionCard = ({ election, onClick, onDeleteClick, activeTab }) => {
  // Determine if the creator is a superadmin
  const isSuperAdminCreator =
    election.created_by === 1 ||
    (election.created_by && election.created_by.id === 1) ||
    election.created_by_role === 'SuperAdmin';

  // Only show 'NEEDS APPROVAL' if in the to_approve tab
  const displayStatus = activeTab === 'to_approve' && election.needs_approval && !isSuperAdminCreator
    ? 'to_approve'
    : election.status;
  
  const statusColors = {
    ongoing: 'bg-blue-100 text-blue-800 border-blue-300',
    upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    to_approve: 'bg-purple-200 text-black border-purple-900'
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
    <div 
      className="border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 cursor-pointer bg-white"
      onClick={() => onClick(election.id)}
    >
      <div className={`w-full py-2 px-4 flex items-center justify-between ${statusColors[displayStatus]}`}>
        <div className="flex items-center">
          {statusIcons[displayStatus]}
          <span className="ml-2 font-semibold">
            {displayStatus === 'to_approve' ? 'NEEDS APPROVAL' : displayStatus.toUpperCase()}
          </span>
        </div>
        
        {displayStatus === 'completed' && (
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

      <div className="p-5">
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

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [elections, setElections] = useState([]);
  const [stats, setStats] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [totalUniqueVoters, setTotalUniqueVoters] = useState(0);
  const [liveVoteData, setLiveVoteData] = useState(null);
  const [showLiveVoteModal, setShowLiveVoteModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('online');

  const loadElections = useCallback(async (status) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let endpoint;
      if (status === 'to_approve') {
        endpoint = '/elections/pending-approval';
      } else {
        endpoint = `/elections/status/${status}`;
      }
      
      const data = await fetchWithAuth(endpoint);
      setElections(data || []);

      if (status === 'to_approve') {
        setPendingApprovals(data);
        setPendingCount(data.length);
      }
    } catch (err) {
      console.error('[SuperAdmin] Error in loadElections:', err);
      setError(err.message || 'Failed to load elections');
      setElections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPendingApprovals = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/elections/pending-approval');
      setPendingApprovals(data || []);
      setPendingCount(data?.length || 0);

      if (activeTab === 'to_approve') {
        setElections(data || []);
      }
    } catch (err) {
      console.error('[SuperAdmin] Error loading pending approvals:', err);
      // Don't set error state for pending approvals to avoid blocking the UI
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const data = await fetchWithAuth('/elections/stats');
      setStats(data || []);
    } catch (err) {
      console.error("[SuperAdmin] Failed to load stats:", err);
      setStats([]);
      // Don't set error state for stats to avoid blocking the UI
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

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
      console.error("[SuperAdmin] Failed to load total unique voters:", err);
      setTotalUniqueVoters(0);
      // Don't set error state for total voters to avoid blocking the UI
    }
  }, []);

  const loadLiveVoteCount = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await fetchWithAuth('/reports/live-vote-count');
      setLiveVoteData(data.data || null);
      setRefreshTime(new Date());
    } catch (error) {
      console.error('Error loading live vote count:', error);
      setLiveVoteData(null);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleViewLiveVoteDetails = (election) => {
    setSelectedElection(election);
    setShowLiveVoteModal(true);
  };

  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      
      try {
        // Load critical data first (elections)
        await loadElections(activeTab);
        
        // Load secondary data in parallel (non-blocking)
        Promise.all([
          loadPendingApprovals(),
          loadStats(),
          loadTotalUniqueVoters()
        ]).catch(error => {
          console.error('[SuperAdmin] Error loading secondary data:', error);
        });
        
        // Load live vote data only if on ongoing tab
        if (activeTab === 'ongoing') {
          loadLiveVoteCount().catch(error => {
            console.error('[SuperAdmin] Error loading live vote data:', error);
          });
        }
      } catch (error) {
        console.error('[SuperAdmin] Error during initial load:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialLoad();

    // Refresh pending approvals every 30 seconds (reduced frequency)
    const pendingInterval = setInterval(() => {
      loadPendingApprovals();
    }, 30000);
    
    // Refresh stats every 2 minutes
    const statsInterval = setInterval(() => {
      loadStats();
    }, 120000);

    // Refresh election data every 2 minutes
    const electionInterval = setInterval(() => {
      loadElections(activeTab);
    }, 120000);

    // Refresh live vote data every 30 seconds only for ongoing tab
    const liveVoteInterval = setInterval(() => {
      if (activeTab === 'ongoing') {
        loadLiveVoteCount();
      }
    }, 30000);

    return () => {
      clearInterval(pendingInterval);
      clearInterval(statsInterval);
      clearInterval(electionInterval);
      clearInterval(liveVoteInterval);
    };
  }, [activeTab]);

  useEffect(() => {
    loadElections(activeTab);
  }, [activeTab, loadElections]);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleElectionClick = (electionId) => {
    if (!electionId || isNaN(parseInt(electionId))) {
      console.error('Invalid election ID:', electionId);
      return;
    }
    router.push(`/superadmin/election/${electionId}`);
  };

  const handleDeleteClick = (election) => {
    setElectionToDelete(election);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!electionToDelete) return;
    
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
      
   
      setElections(elections.filter(e => e.id !== electionToDelete.id));

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

  const getStatValue = (status, field) => {

    if (status === 'to_approve' && field === 'count') {
      return pendingCount;
    }
    

    const stat = stats.find(s => s.status === status);
    
    if (stat) {
      return Number(stat[field] || 0);
    }
    
    return 0;
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        <div className="flex items-center space-x-4">
          {connectionStatus === 'offline' && (
            <div className="flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Connection Issues
            </div>
          )}
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>      
     
      {actionMessage && (
        <div className={`mb-4 p-4 rounded-lg shadow ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
          {actionMessage.text}
        </div>
      )}
      
     
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Elections</h3>
          {isStatsLoading ? (
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-black">
              {Number(stats.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Voters</h3>
          {isStatsLoading ? (
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-black">
              {Number(totalUniqueVoters).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-2 text-black">Total Votes Cast</h3>
          {isStatsLoading ? (
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          ) : (
            <p className="text-3xl font-bold text-black">
              {Number(stats.reduce((sum, stat) => sum + parseInt(stat.total_votes || 0), 0)).toLocaleString()}
            </p>
          )}
        </div>
      </div>

    
      <div className="bg-white rounded-lg shadow mb-6 p-1">
        <div className="flex">
          {statusTabs.map(tab => {
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
        <Link 
          href="/superadmin/election/create"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
        >
          + Create New Election
        </Link>
      </div>

  
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadElections(activeTab);
              }}
              className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
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
                activeTab={activeTab}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <div className="text-black mb-4">
                {activeTab === 'ongoing' && <Clock className="w-16 h-16 mx-auto" />}
                {activeTab === 'upcoming' && <Calendar className="w-16 h-16 mx-auto" />}
                {activeTab === 'completed' && <CheckCircle className="w-16 h-16 mx-auto" />}
                {activeTab === 'to_approve' && <AlertCircle className="w-16 h-16 mx-auto" />}
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No {activeTab === 'to_approve' ? 'elections pending approval' : `${activeTab} elections`}
              </h3>
              <p className="text-black max-w-md mx-auto">
                {activeTab === 'ongoing' && 'There are currently no ongoing elections.'}
                {activeTab === 'upcoming' && 'No upcoming elections scheduled.'}
                {activeTab === 'completed' && 'No completed elections yet. Elections that have ended will be shown here.'}
                {activeTab === 'to_approve' && 'No elections waiting for your approval.'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Live Vote Count Section */}
      {activeTab === 'ongoing' && elections.length > 0 && liveVoteData && (
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
                onClick={loadLiveVoteCount} 
                disabled={isRefreshing}
                className={`ml-2 text-gray-600 hover:text-gray-800 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow-inner">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-200">
                  <th className="p-4 text-left text-sm font-bold text-black">Election Name</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Type</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Eligible Voters</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Current Votes</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Live Turnout</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Time Remaining</th>
                  <th className="p-4 text-left text-sm font-bold text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveVoteData.live_elections && liveVoteData.live_elections.map((election) => (
                  <tr key={election.id} className="border-b hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-4 text-sm font-medium text-black">{election.title}</td>
                    <td className="p-4 text-sm text-black">{election.election_type}</td>
                    <td className="p-4 text-sm font-medium text-black">{election.eligible_voters.toLocaleString()}</td>
                    <td className="p-4 text-sm font-medium text-black">{election.current_votes.toLocaleString()}</td>
                    <td className="p-4 text-sm text-black">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-3 mr-2 shadow-inner">
                          <div 
                            className="bg-black h-3 rounded-full" 
                            style={{ width: `${Math.min(election.live_turnout * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{(election.live_turnout * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-black">{election.time_remaining}</td>
                    <td className="p-4 text-sm text-black">
                      <button 
                        onClick={() => handleViewLiveVoteDetails(election)}
                        className="text-black bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-md flex items-center transition-colors duration-150 shadow-sm"
                      >
                        <PieChart className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
    
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

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-blue-700 mb-2">Total Eligible Voters</h3>
                      <p className="text-3xl font-bold text-blue-900">{selectedElection.eligible_voters.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-green-700 mb-2">Current Votes</h3>
                      <p className="text-3xl font-bold text-green-900">{selectedElection.current_votes.toLocaleString()}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-purple-700 mb-2">Live Turnout</h3>
                      <p className="text-3xl font-bold text-purple-900">{(selectedElection.live_turnout * 100).toFixed(1)}%</p>
                    </div>
                    <BarChart className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-orange-700 mb-2">Remaining Voters</h3>
                      <p className="text-3xl font-bold text-orange-900">{(selectedElection.eligible_voters - selectedElection.current_votes).toLocaleString()}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Participation Progress Bar */}
              <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-bold text-black mb-4">Participation Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Participation</span>
                      <span className="text-sm font-bold text-gray-900">
                        {selectedElection.current_votes.toLocaleString()} / {selectedElection.eligible_voters.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(selectedElection.live_turnout * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">0%</span>
                      <span className="text-sm font-bold text-gray-900">
                        {(selectedElection.live_turnout * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs text-gray-500">100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-bold text-black mb-4">Voter Participation Overview</h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Voted', 
                            value: selectedElection.current_votes,
                            fill: '#10B981'
                          },
                          { 
                            name: 'Not Voted', 
                            value: Math.max(0, selectedElection.eligible_voters - selectedElection.current_votes),
                            fill: '#EF4444'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={140}
                        innerRadius={60}
                        dataKey="value"
                        label={({ name, value, percent }) => {
                          if (value === 0) return '';
                          return `${(percent * 100).toFixed(1)}%`;
                        }}
                        labelLine={false}
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => {
                          if (value === 0) return ['', ''];
                          const percentage = ((value / selectedElection.eligible_voters) * 100).toFixed(1);
                          return [
                            `${value.toLocaleString()} (${percentage}%)`, 
                            name
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ 
                          color: '#000000', 
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry) => {
                          if (entry.payload.value === 0) return '';
                          const percentage = ((entry.payload.value / selectedElection.eligible_voters) * 100).toFixed(1);
                          return (
                            <span className="text-black font-medium text-sm">
                              {value}: {entry.payload.value.toLocaleString()} ({percentage}%)
                            </span>
                          );
                        }}
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '14px'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {selectedElection.positions && selectedElection.positions.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <h3 className="text-lg font-bold text-black mb-4">Votes by Position</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={selectedElection.positions.map(pos => ({
                          name: pos.name,
                          votes: pos.votes || 0
                        }))}
                        margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.6} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80} 
                          tick={{ fill: '#374151', fontSize: 12, fontWeight: '500' }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={{ stroke: '#D1D5DB' }}
                        />
                        <YAxis 
                          tick={{ fill: '#374151', fontSize: 12 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={{ stroke: '#D1D5DB' }}
                          label={{ 
                            value: 'Number of Votes', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { textAnchor: 'middle', fill: '#374151', fontSize: '14px', fontWeight: '600' } 
                          }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [value.toLocaleString(), 'Votes']}
                          labelStyle={{ 
                            color: '#000000', 
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                          contentStyle={{ 
                            backgroundColor: '#F9FAFB', 
                            border: '1px solid #E5E7EB', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="votes" 
                          fill="#3B82F6" 
                          radius={[6, 6, 0, 0]}
                          stroke="#1D4ED8"
                          strokeWidth={1}
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Participation by Course/Program */}
              {selectedElection.votes_by_program && selectedElection.votes_by_program.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
                  <h3 className="text-lg font-bold text-black mb-4">Participation by Course/Program</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={selectedElection.votes_by_program
                          .sort((a, b) => b.votes_cast - a.votes_cast)
                          .map((item, index) => ({
                            ...item,
                            fill: [
                              '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                              '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
                              '#14B8A6', '#F43F5E', '#22C55E', '#A855F7', '#0EA5E9'
                            ][index % 15]
                          }))
                        }
                        margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.6} />
                        <XAxis 
                          dataKey="program" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80} 
                          tick={{ fill: '#374151', fontSize: 12, fontWeight: '500' }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={{ stroke: '#D1D5DB' }}
                        />
                        <YAxis 
                          tick={{ fill: '#374151', fontSize: 12 }}
                          axisLine={{ stroke: '#D1D5DB' }}
                          tickLine={{ stroke: '#D1D5DB' }}
                          label={{ 
                            value: 'Votes Cast', 
                            angle: -90, 
                            position: 'insideLeft', 
                            style: { textAnchor: 'middle', fill: '#374151', fontSize: '14px', fontWeight: '600' } 
                          }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [value.toLocaleString(), 'Votes Cast']}
                          labelStyle={{ 
                            color: '#000000', 
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                          contentStyle={{ 
                            backgroundColor: '#F9FAFB', 
                            border: '1px solid #E5E7EB', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="votes_cast" 
                          radius={[6, 6, 0, 0]}
                          stroke="#ffffff"
                          strokeWidth={1}
                        >
                          {selectedElection.votes_by_program
                            .sort((a, b) => b.votes_cast - a.votes_cast)
                            .map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={[
                                  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                                  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
                                  '#14B8A6', '#F43F5E', '#22C55E', '#A855F7', '#0EA5E9'
                                ][index % 15]}
                              />
                            ))
                          }
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Participating Courses Table */}
              {selectedElection.votes_by_program && selectedElection.votes_by_program.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mt-6">
                  <h3 className="text-lg font-bold text-black mb-4">Course Participation Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="p-3 text-left text-sm font-bold text-gray-700">Rank</th>
                          <th className="p-3 text-left text-sm font-bold text-gray-700">Course/Program</th>
                          <th className="p-3 text-left text-sm font-bold text-gray-700">Votes Cast</th>
                          <th className="p-3 text-left text-sm font-bold text-gray-700">Participation %</th>
                          <th className="p-3 text-left text-sm font-bold text-gray-700">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedElection.votes_by_program
                          .sort((a, b) => b.votes_cast - a.votes_cast)
                          .slice(0, 10)
                          .map((course, index) => {
                            const participationPercent = ((course.votes_cast / selectedElection.current_votes) * 100).toFixed(1);
                            return (
                              <tr key={course.program} className="border-b hover:bg-gray-50 transition-colors duration-150">
                                <td className="p-3 text-sm font-medium text-gray-900">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-medium text-gray-900">{course.program}</td>
                                <td className="p-3 text-sm font-bold text-gray-900">{course.votes_cast.toLocaleString()}</td>
                                <td className="p-3 text-sm text-gray-600">{participationPercent}%</td>
                                <td className="p-3 text-sm">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(parseFloat(participationPercent), 100)}%` }}
                                    ></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={loadLiveVoteCount}
                  disabled={isRefreshing}
                  className="flex items-center text-black bg-gray-200 px-5 py-2.5 rounded-md hover:bg-gray-300 shadow-sm transition-all duration-150 font-medium"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
                <button
                  onClick={() => setShowLiveVoteModal(false)}
                  className="flex items-center text-black bg-gray-200 px-5 py-2.5 rounded-md hover:bg-gray-300 shadow-sm transition-all duration-150 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

