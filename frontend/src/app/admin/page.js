"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2, GraduationCap, BarChart, Building, ClipboardCheck, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import PermissionDisplay from '../../components/Admin/PermissionDisplay';
import usePermissions, { ensureUserIdFromToken } from '../../hooks/usePermissions.js';
import axios from "axios";

const API_BASE = 'http://localhost:5000/api';

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  const response = await fetch(`${API_BASE}${url}`, {
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

const ElectionCard = ({ election, onClick, onDeleteClick, canDelete }) => {
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
  
  // Add property to track display status including needs_approval
  const displayStatus = election.needs_approval ? 'to_approve' : election.status;
  
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 bg-white">
      {/* Status Banner */}
      <div className={`w-full py-2 px-4 flex items-center justify-between ${statusColors[displayStatus]}`}>
        <div className="flex items-center">
          {statusIcons[displayStatus]}
          <span className="ml-2 font-semibold">
            {election.needs_approval ? 'NEEDS APPROVAL' : election.status.toUpperCase()}
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
              <div className="font-bold text-black">{election.voter_count || 0}</div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-gray-600" />
            <div>
              <div className="text-sm text-gray-500">Votes</div>
              <div className="font-bold text-black">{election.vote_count || 0}</div>
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

  // Ensure user ID is available from token if needed
  useEffect(() => {
    const userId = ensureUserIdFromToken();
    console.log('Admin Dashboard - Ensured User ID:', userId);
  }, []);

  // For debugging
  useEffect(() => {
    console.log('Admin Dashboard - User info:', {
      userId: Cookies.get('userId'),
      role: Cookies.get('role'),
      token: Cookies.get('token') ? 'Token exists' : 'No token'
    });
    console.log('Admin Dashboard - Permissions loading:', permissionsLoading);
    console.log('Admin Dashboard - Permissions:', permissions);
  }, [permissionsLoading, permissions]);

  // Load all elections data at once
  const loadAllElections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const results = {};
      
      // Load regular election statuses
      await Promise.all(statuses.map(async (status) => {
        try {
          const response = await fetch(`${API_BASE}/elections/status/${status}`, {
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
        const response = await fetch(`${API_BASE}/elections/admin-pending-approval`, {
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
      // Set the elections for the active tab
      setElections(results[activeTab] || []);
    } catch (err) {
      console.error('Error in loadAllElections:', err);
      setError('Failed to load elections data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/elections/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Stats data received:", data); // Debug log
      
      // The API returns an array of stats, just like in superadmin
      setStats(data || []);
    } catch (err) {
      console.error("Failed to load stats:", err);
      setStats([]);
    }
  };

  // Load initial data
  useEffect(() => {
    const initializeDashboard = async () => {
      if (!permissionsLoading) {
        // First check if user has permission to view elections
        if (!hasPermission('elections', 'view')) {
          setIsLoading(false);
          return;
        }
        
        try {
          // Load all elections first to ensure we have counts for calculations
          await loadAllElections();
          
          // Then load stats
          const token = Cookies.get("token");
          
          // Fetch stats
          const statsResponse = await axios.get("http://localhost:5000/api/elections/stats", {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          // The API returns an array of stats by status
          const statsData = statsResponse.data || [];
          console.log("Raw stats data:", statsData);
          
          // Set the stats directly - our component will handle the array format
          setStats(statsData);
        } catch (error) {
          console.error("Error initializing dashboard:", error);
          // Try individual functions as fallback
          await loadStats();
        }
      }
    };
    
    initializeDashboard();
  }, [permissionsLoading, hasPermission]);

  // Update stats when all elections are loaded - handled differently now
  useEffect(() => {
    // If we don't have stats yet but we have elections, this will provide fallback counts
    if (Object.keys(allElections).length > 0 && (!stats || !stats.length)) {
      const fallbackStats = [
        { 
          status: 'ongoing', 
          count: allElections.ongoing?.length || 0,
          total_voters: (allElections.ongoing || []).reduce((sum, e) => sum + (e.voter_count || 0), 0),
          total_votes: (allElections.ongoing || []).reduce((sum, e) => sum + (e.vote_count || 0), 0)
        },
        { 
          status: 'upcoming', 
          count: allElections.upcoming?.length || 0,
          total_voters: (allElections.upcoming || []).reduce((sum, e) => sum + (e.voter_count || 0), 0),
          total_votes: (allElections.upcoming || []).reduce((sum, e) => sum + (e.vote_count || 0), 0)
        },
        { 
          status: 'completed', 
          count: allElections.completed?.length || 0,
          total_voters: (allElections.completed || []).reduce((sum, e) => sum + (e.voter_count || 0), 0),
          total_votes: (allElections.completed || []).reduce((sum, e) => sum + (e.vote_count || 0), 0)
        },
        { 
          status: 'to_approve', 
          count: allElections.to_approve?.length || 0,
          total_voters: (allElections.to_approve || []).reduce((sum, e) => sum + (e.voter_count || 0), 0),
          total_votes: (allElections.to_approve || []).reduce((sum, e) => sum + (e.vote_count || 0), 0)
        }
      ];
      
      setStats(fallbackStats);
    }
  }, [allElections, stats]);

  // Handle tab change without loading indicator
  useEffect(() => {
    // Just update the elections based on the activeTab from the already loaded data
    setElections(allElections[activeTab] || []);
  }, [activeTab, allElections]);
  
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

  // If the user doesn't have permission to view elections, show an access denied message
  if (!hasPermission('elections', 'view')) {
    return (
      <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex items-center justify-center">
            <div className="bg-red-100 p-3 rounded-full">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mt-4 mb-2 text-black">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to view elections. Please contact your administrator for access.
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
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="lg:w-3/4">
          <h1 className="text-3xl font-bold mb-2 text-black">Dashboard</h1>
          
          {actionMessage && (
            <div className={`mb-4 p-4 rounded-lg shadow ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
              {actionMessage.text}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-medium text-gray-500 mb-2 text-black">Total Elections</h3>
              <p className="text-3xl font-bold text-black">
                {Array.isArray(stats) 
                  ? stats.reduce((sum, stat) => sum + parseInt(stat.count || 0), 0)
                  : stats?.elections_count || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-medium text-gray-500 mb-2 text-black">Total Voters</h3>
              <p className="text-3xl font-bold text-black">
                {Array.isArray(stats) 
                  ? stats.reduce((sum, stat) => sum + parseInt(stat.total_voters || 0), 0)
                  : stats?.voters_count || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-medium text-gray-500 mb-2 text-black">Total Votes Cast</h3>
              <p className="text-3xl font-bold text-black">
                {Array.isArray(stats) 
                  ? stats.reduce((sum, stat) => sum + parseInt(stat.total_votes || 0), 0)
                  : stats?.votes_count || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow mb-6 p-1">
            <div className="flex flex-wrap">
              {statusTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`flex items-center justify-center px-4 py-3 font-medium text-sm transition-colors duration-200 flex-1 ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 rounded-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
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
          {/* Permissions Display */}
          <PermissionDisplay />
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
  );
}