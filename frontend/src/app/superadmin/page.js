"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Trash2, BarChart, PieChart, RefreshCw, Download, X, Activity, BarChart2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import axios from 'axios';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { generatePdfReport } from '@/utils/pdfGenerator';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
  const [systemLoadData, setSystemLoadData] = useState(null);
  const [showSystemLoadModal, setShowSystemLoadModal] = useState(false);
  const [isSystemLoadLoading, setIsSystemLoadLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

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
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SuperAdmin] Error loading elections: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to load elections: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
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
      const response = await fetch(`${API_BASE}/elections/pending-approval`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      setPendingApprovals(data);
      setPendingCount(data.length);

      if (activeTab === 'to_approve') {
        setElections(data);
      }
    } catch (err) {
      console.error('[SuperAdmin] Error loading pending approvals:', err);
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchWithAuth('/elections/stats');
      setStats(data || []);
    } catch (err) {
      console.error("[SuperAdmin] Failed to load stats:", err);
      setStats([]);
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
    }
  }, []);

  const loadLiveVoteCount = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const token = Cookies.get('token');
      const response = await fetch(`${API_BASE}/reports/live-vote-count`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch live vote count data');
      }
      
      const data = await response.json();
      setLiveVoteData(data.data);
      setRefreshTime(new Date());
    } catch (error) {
      console.error('Error loading live vote count:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
        throw new Error('Failed to fetch system load data');
      }
      
      const data = await response.json();
      setSystemLoadData(data.data);
      setSelectedTimeframe(timeframe);
    } catch (error) {
      console.error('Error loading system load data:', error);
      setSystemLoadData(null);
    } finally {
      setIsSystemLoadLoading(false);
    }
  }, []);

  const handleViewLiveVoteDetails = (election) => {
    setSelectedElection(election);
    setShowLiveVoteModal(true);
  };


  // Helper functions for system load data processing
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatTime = (hour, date = null) => {
    if (hour === undefined || hour === null) return '12:00 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12:00 AM';
    
    let timeStr = '';
    if (hourNum === 0) timeStr = '12:00 AM';
    else if (hourNum < 12) timeStr = `${hourNum}:00 AM`;
    else if (hourNum === 12) timeStr = '12:00 PM';
    else timeStr = `${hourNum - 12}:00 PM`;
    
    // Add date if provided
    if (date) {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${dateStr} ${timeStr}`;
    }
    
    return timeStr;
  };

  const formatTimeForChart = (hour, date = null) => {
    if (hour === undefined || hour === null) return '12 AM';
    const hourNum = parseInt(hour);
    if (isNaN(hourNum)) return '12 AM';
    
    let timeStr = '';
    if (hourNum === 0) timeStr = '12 AM';
    else if (hourNum < 12) timeStr = `${hourNum} AM`;
    else if (hourNum === 12) timeStr = '12 PM';
    else timeStr = `${hourNum - 12} PM`;
    
    // Add date if provided and timeframe is more than 24h
    if (date && selectedTimeframe !== '24h') {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      return `${dateStr} ${timeStr}`;
    }
    
    return timeStr;
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
      hour: item.hour || item.hour_of_day || 0,
      count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 
             typeof item.login_count === 'number' && !isNaN(item.login_count) ? item.login_count :
             typeof item.vote_count === 'number' && !isNaN(item.vote_count) ? item.vote_count :
             typeof item.activity_count === 'number' && !isNaN(item.activity_count) ? item.activity_count : 0,
      date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : null),
      timestamp: item.timestamp || item.date || null
    }));
  };

  const processDataWithDates = (data, timeframe) => {
    if (!Array.isArray(data)) return [];
    
    console.log('SuperAdmin - Processing data with dates:', { data, timeframe });
    
    const now = new Date();
    let processedData = [];
    
    // The backend returns data with hour and count fields
    // For 24h: hour represents actual hour (0-23)
    // For 7d: hour represents hour (0-23) but we want to show daily data
    // For 30d: hour represents day of month (1-31) but we want to show daily data
    
    if (timeframe === '24h') {
      // For 24h, use the data as-is since backend already provides hourly data
      processedData = data.map(item => ({
        hour: item.hour || 0,
        count: typeof item.count === 'number' && !isNaN(item.count) ? item.count : 0,
        date: now.toISOString().split('T')[0], // Use current date for 24h
        timestamp: now.toISOString()
      }));
    } else if (timeframe === '7d') {
      // For 7d, backend returns hourly data but we need to aggregate by day
      // Generate last 7 days and map data to them
      const dailyData = {};
      
      // Aggregate data by day
      data.forEach(item => {
        const dayOffset = Math.floor((now.getTime() - (item.hour * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
        const dayKey = Math.max(0, Math.min(6, dayOffset)); // Ensure it's within 0-6 range
        
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = 0;
        }
        dailyData[dayKey] += item.count || 0;
      });
      
      // Generate 7 days of data
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        processedData.push({
          hour: 0, // Use 0 for daily data
          count: dailyData[i] || 0,
          date: date.toISOString().split('T')[0],
          timestamp: date.toISOString()
        });
      }
    } else if (timeframe === '30d') {
      // For 30d, backend returns daily data (hour represents day of month)
      // Generate last 30 days and map data to them
      const dailyData = {};
      
      // Map backend data to day offsets
      data.forEach(item => {
        const dayOfMonth = item.hour || 0;
        const currentDay = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Calculate the actual date for this day of month
        const itemDate = new Date(currentYear, currentMonth, dayOfMonth);
        const dayOffset = Math.floor((now.getTime() - itemDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (dayOffset >= 0 && dayOffset < 30) {
          dailyData[dayOffset] = item.count || 0;
        }
      });
      
      // Generate 30 days of data
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        processedData.push({
          hour: 0, // Use 0 for daily data
          count: dailyData[i] || 0,
          date: date.toISOString().split('T')[0],
          timestamp: date.toISOString()
        });
      }
    }
    
    console.log('SuperAdmin - Processed data result:', processedData);
    return processedData;
  };

  const handleDownloadSystemLoad = async () => {
    if (!systemLoadData) return;

    const processedLoginData = isDataReset ? [] : validateData(systemLoadData.login_activity || []);
    const processedVotingData = isDataReset ? [] : validateData(systemLoadData.voting_activity || []);
    
    const loginPeak = findPeakHour(processedLoginData);
    const votingPeak = findPeakHour(processedVotingData);

    const reportData = {
      title: "System Load Report",
      description: `Analysis of peak usage times and system activity patterns (${selectedTimeframe === '24h' ? 'Last 24 Hours' : selectedTimeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'})`,
      summary: {
        peak_login_hour: formatTime(loginPeak.hour),
        peak_login_count: formatNumber(loginPeak.count),
        peak_voting_hour: formatTime(votingPeak.hour),
        peak_voting_count: formatNumber(votingPeak.count),
        total_activity: formatNumber(processedLoginData.reduce((sum, item) => sum + item.count, 0) + 
                                   processedVotingData.reduce((sum, item) => sum + item.count, 0)),
        login_average: formatNumber(calculateAverage(processedLoginData)),
        voting_average: formatNumber(calculateAverage(processedVotingData))
      },
      login_activity: processedLoginData.map(activity => ({
        hour: formatTime(activity.hour),
        count: activity.count,
        average: calculateAverage(processedLoginData)
      })),
      voting_activity: processedVotingData.map(activity => ({
        hour: formatTime(activity.hour),
        count: activity.count,
        average: calculateAverage(processedVotingData)
      })),
      timeframe: selectedTimeframe,
      generated_at: new Date().toLocaleString()
    };

    try {
      await generatePdfReport(7, reportData); // 7 is the report ID for System Load
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate PDF report');
    }
  };


  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      
      try {
        await loadPendingApprovals();
        await Promise.all([
          loadStats(),
          loadElections(activeTab),
          loadTotalUniqueVoters(),
          loadLiveVoteCount(),
          loadSystemLoadData('7d')
        ]);
      } catch (error) {
        console.error('[SuperAdmin] Error during initial load:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialLoad();

    // Refresh pending approvals every 15 seconds
    const pendingInterval = setInterval(() => {
      loadPendingApprovals();
    }, 15000);
    
    // Refresh stats and live vote count every 30 seconds
    const statsInterval = setInterval(() => {
      loadStats();
      loadLiveVoteCount();
    }, 30000);

    // Refresh election data every 1 minute instead of 5 minutes
    const electionInterval = setInterval(() => {
      loadElections(activeTab);
    }, 60000); // 1 minute instead of 300000 (5 minutes)

    return () => {
      clearInterval(pendingInterval);
      clearInterval(statsInterval);
      clearInterval(electionInterval);
    };
  }, [activeTab, loadPendingApprovals, loadStats, loadElections, loadTotalUniqueVoters, loadLiveVoteCount, loadSystemLoadData]);

  useEffect(() => {
    loadElections(activeTab);
  }, [activeTab, loadElections]);

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
      <h1 className="text-3xl font-bold mb-2 text-black">Dashboard</h1>      
     
      {actionMessage && (
        <div className={`mb-4 p-4 rounded-lg shadow ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 'bg-red-100 text-red-800 border-l-4 border-red-500'}`}>
          {actionMessage.text}
        </div>
      )}
      
     
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

      {/* System Load Reports - Direct Display */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-black flex items-center">
            <BarChart className="mr-2 text-black" />
            System Load Reports
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Analytics
            </span>
          </h2>
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
        </div>

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
              // Try the new date-aware processing first
              let processedLoginData = processDataWithDates(systemLoadData.login_activity || [], selectedTimeframe);
              let processedVotingData = processDataWithDates(systemLoadData.voting_activity || [], selectedTimeframe);
              
              // Fallback to original data structure if new processing returns empty data
              if (processedLoginData.length === 0 && systemLoadData.login_activity && systemLoadData.login_activity.length > 0) {
                console.log('SuperAdmin - Falling back to original login data structure');
                processedLoginData = validateData(systemLoadData.login_activity);
              }
              
              if (processedVotingData.length === 0 && systemLoadData.voting_activity && systemLoadData.voting_activity.length > 0) {
                console.log('SuperAdmin - Falling back to original voting data structure');
                processedVotingData = validateData(systemLoadData.voting_activity);
              }
              
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
                  const dataPoint = payload[0].payload;
                  const displayTime = formatTime(label, dataPoint?.date);
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl">
                      <p className="text-sm font-semibold mb-2 text-black">{displayTime}</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500 rounded">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-black">Peak Login Hour</h3>
                      </div>
                      <p className="text-2xl font-bold text-black mb-1">
                        {formatTime(chartConfig.login.peak.hour)}
                      </p>
                      <p className="text-xs text-black">
                        {formatNumber(chartConfig.login.peak.count)} logins
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500 rounded">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-black">Peak Voting Hour</h3>
                      </div>
                      <p className="text-2xl font-bold text-black mb-1">
                        {formatTime(chartConfig.voting.peak.hour)}
                      </p>
                      <p className="text-xs text-black">
                        {formatNumber(chartConfig.voting.peak.count)} votes
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-black">Total Activity</h3>
                      </div>
                      <p className="text-2xl font-bold text-black mb-1">
                        {formatNumber(chartConfig.login.total + chartConfig.voting.total)}
                      </p>
                      <p className="text-xs text-black">
                        {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}
                      </p>
                    </div>
                  </div>

                  {/* Usage Charts */}
                  <div className="space-y-4">
                    {/* Login Activity Chart */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      {processedLoginData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                              <BarChart2 className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">
                              No Login Data for Selected Period
                            </h3>
                            <p className="text-xs text-gray-500">
                              No login activity found for the last {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg text-black font-bold">Login Activity</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>Peak: {formatTime(chartConfig.login.peak.hour)}</span>
                            </div>
                          </div>
                          <div className="h-[200px]">
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
                                  tickFormatter={(hour, index) => {
                                    const dataPoint = chartConfig.login.data[index];
                                    return formatTimeForChart(hour, dataPoint?.date);
                                  }}
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
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      {processedVotingData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                              <Activity className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">
                              No Voting Data for Selected Period
                            </h3>
                            <p className="text-xs text-gray-500">
                              No voting activity found for the last {selectedTimeframe === '24h' ? '24 hours' : selectedTimeframe === '7d' ? '7 days' : '30 days'}.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg text-black font-bold">Voting Activity</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Peak: {formatTime(chartConfig.voting.peak.hour)}</span>
                            </div>
                          </div>
                          <div className="h-[200px]">
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
                                  tickFormatter={(hour, index) => {
                                    const dataPoint = chartConfig.voting.data[index];
                                    return formatTimeForChart(hour, dataPoint?.date);
                                  }}
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

