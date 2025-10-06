"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, Lock } from 'lucide-react';
import Cookies from 'js-cookie';
import usePermissions from '../../../hooks/usePermissions';
import Link from 'next/link';

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

const statusColors = {
  ongoing: 'bg-blue-100 text-black border-blue-300',
  upcoming: 'bg-yellow-100 text-black border-yellow-300',
  completed: 'bg-green-100 text-black border-green-300',
  pending: 'bg-purple-100 text-black border-purple-300',
  to_approve: 'bg-purple-100 text-black border-purple-800',
};

const statusIcons = {
  ongoing: <Clock className="w-5 h-5" />,
  upcoming: <Calendar className="w-5 h-5" />,
  completed: <CheckCircle className="w-5 h-5" />,
  pending: <AlertCircle className="w-5 h-5" />,
  to_approve: <AlertCircle className="w-5 h-5" />,
  draft: <AlertCircle className="w-5 h-5" />
};

const isCreatedBySystemAdmin = (election) => {
  // No creator information
  if (!election.created_by) return false;
  
  if (typeof election.created_by === 'number' || typeof election.created_by === 'string') {
    return election.created_by === 1 || election.created_by === '1';
  }
  
  if (typeof election.created_by === 'object') {
    // Check by role if available
    if (election.created_by.role) {
      const role = election.created_by.role.toLowerCase();
      return role.includes('superadmin') || 
             role.includes('system_admin') || 
             role.includes('systemadmin') ||
             role.includes('super');
    }
    
    // Check by ID if role not available
    if (election.created_by.id) {
      return election.created_by.id === 1 || election.created_by.id === '1';
    }
  }
  
  // Default to false if we can't determine
  return false;
};

export default function ElectionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [elections, setElections] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  const tabs = [
    { id: 'all', label: 'All Elections' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending Approval', requiresPermission: 'edit' },
  ];

  const fetchElections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/elections');
      // Do not filter out super admin elections globally; show all elections
      setElections(data || []);
    } catch (err) {
      console.error("Failed to load elections:", err);
      setError("Failed to load elections. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      // Only fetch pending approvals if the user has edit permissions
      if (!hasPermission('elections', 'edit')) {
        setPendingApprovals([]);
        setPendingCount(0);
        return;
      }
      
      setLoading(true);
      // Use the dedicated endpoint for admin pending approval
      const data = await fetchWithAuth('/elections/admin-pending-approval');
      
      // Filter to only include elections created by the current admin
      // This ensures system admin created elections won't appear here
      const adminCreatedElections = data.filter(election => {
        // Exclude elections created by system admin
        return !isCreatedBySystemAdmin(election);
      });
      
      setPendingApprovals(adminCreatedElections || []);
      setPendingCount(adminCreatedElections.length);
    } catch (err) {
      console.error("Failed to load pending approvals:", err);
      // Don't set the main error state here, just log it
      setPendingApprovals([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      if (!permissionsLoading && hasPermission('elections', 'view')) {
        await fetchElections();
        await fetchPendingApprovals();
      } else if (!permissionsLoading) {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchElections, fetchPendingApprovals, hasPermission, permissionsLoading]);

  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredElections(elections.map(election => {
        // If created by super admin, treat as not needing approval
        if (isCreatedBySystemAdmin(election) && election.needs_approval) {
          return { ...election, needs_approval: false };
        }
        return election;
      }));
    } else if (activeTab === 'pending') {
      // Use the dedicated pendingApprovals state
      setFilteredElections(pendingApprovals);
    } else {
      // For other tabs, filter by status but exclude those needing approval
      setFilteredElections(
        elections.filter(election => {
          // If created by super admin, treat as not needing approval
          if (isCreatedBySystemAdmin(election) && election.needs_approval) {
            return election.status === activeTab;
          }
          return election.status === activeTab && !election.needs_approval;
        })
      );
    }
  }, [activeTab, elections, pendingApprovals]);

  // Set default active tab based on permissions
  useEffect(() => {
    if (!permissionsLoading) {
      // If the current active tab requires permissions the user doesn't have
      const currentTab = tabs.find(tab => tab.id === activeTab);
      if (currentTab?.requiresPermission && !hasPermission('elections', currentTab.requiresPermission)) {
        // Fall back to 'all' tab which is always available with view permission
        setActiveTab('all');
      }
    }
  }, [permissionsLoading, hasPermission, activeTab]);

  const handleCreateElection = () => {
    if (!hasPermission('elections', 'create')) {
      alert("You don't have permission to create elections");
      return;
    }
    router.push("/admin/election/create");
  };

  const handleElectionClick = (electionId) => {
    if (!hasPermission('elections', 'view')) {
      alert("You don't have permission to view election details");
      return;
    }
    router.push(`/admin/election/${electionId}`);
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (election) => {
    // If created by super admin, never show as pending approval
    if (isCreatedBySystemAdmin(election)) {
      return (
        <div className={`flex items-center px-3 py-1 rounded-full ${statusColors[election.status]}`}>
          {statusIcons[election.status]}
          <span className="ml-2 text-xs font-medium">
            {election.status === 'pending' ? 'PENDING APPROVAL' : 
             election.status === 'draft' ? 'DRAFT' : 
             election.status.toUpperCase()}
          </span>
        </div>
      );
    }
    // If the election needs approval, show it as to_approve regardless of other status
    if (election.needs_approval) {
      return (
        <div className={`flex items-center px-3 py-1 rounded-full ${statusColors['to_approve']}`}>
          {statusIcons['to_approve']}
          <span className="ml-2 text-xs font-medium">PENDING APPROVAL</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center px-3 py-1 rounded-full ${statusColors[election.status]}`}>
        {statusIcons[election.status]}
        <span className="ml-2 text-xs font-medium">
          {election.status === 'pending' ? 'PENDING APPROVAL' : 
           election.status === 'draft' ? 'DRAFT' : 
           election.status.toUpperCase()}
        </span>
      </div>
    );
  };

  // Show loading state while permissions are being checked
  if (loading || permissionsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 bg-gray-50 min-h-screen">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-solid border-blue-500"></div>
      </div>
    );
  }
  
  // Only show access denied if permissions have loaded and user definitely doesn't have permission
  if (!permissionsLoading && !hasPermission('elections', 'view')) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Elections</h1>
        {hasPermission('elections', 'create') ? (
          <button 
            onClick={handleCreateElection} 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Election
          </button>
        ) : (
          <div className="text-sm text-gray-500 italic bg-gray-100 px-4 py-2 rounded-md flex items-center">
            <Lock className="w-4 h-4 mr-2" />
            Create permission required
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex flex-wrap">
          {tabs
            .filter(tab => !tab.requiresPermission || hasPermission('elections', tab.requiresPermission))
            .map(tab => (
            <button
              key={tab.id}
              className={`px-6 py-3 text-sm font-medium focus:outline-none transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-black border-b-2 border-blue-600' 
                  : 'text-black hover:text-black hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'pending' && pendingCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-black p-4 rounded-lg mb-6">
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {filteredElections.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider w-2/5">
                      Election Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      End Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredElections.map((election) => (
                    <tr 
                      key={election.id}
                      onClick={() => handleElectionClick(election.id)}
                      className={`${hasPermission('elections', 'view') ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">{election.title}</div>
                        <div className="text-sm text-black">{election.description?.substring(0, 60)}{election.description?.length > 60 ? '...' : ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(election)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(election.date_from)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(election.date_to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <div className="text-black mb-4">
                {activeTab === 'ongoing' && <Clock className="w-16 h-16 mx-auto" />}
                {activeTab === 'upcoming' && <Calendar className="w-16 h-16 mx-auto" />}
                {activeTab === 'completed' && <CheckCircle className="w-16 h-16 mx-auto" />}
                {activeTab === 'pending' && <AlertCircle className="w-16 h-16 mx-auto" />}
                {activeTab === 'draft' && <AlertCircle className="w-16 h-16 mx-auto" />}
                {activeTab === 'all' && <div className="w-16 h-16 mx-auto" />}
              </div>
              <h3 className="text-xl font-medium text-black mb-2">
                No {activeTab === 'all' ? '' : activeTab} elections found
              </h3>
              {activeTab === 'all' && !hasPermission('elections', 'create') && (
                <p className="text-gray-500 mt-2">
                  You don't have permission to create new elections.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
