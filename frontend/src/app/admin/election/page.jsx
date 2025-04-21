"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import Cookies from 'js-cookie';

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

export default function ElectionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [elections, setElections] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const tabs = [
    { id: 'all', label: 'All Elections' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending Approval' },

  ];

  const fetchElections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth('/elections');
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
      setLoading(true);
      // Use the dedicated endpoint for admin pending approvals
      const data = await fetchWithAuth('/elections/admin-pending-approval');
      setPendingApprovals(data || []);
      setPendingCount(data.length);
    } catch (err) {
      console.error("Failed to load pending approvals:", err);
      // Don't set the main error state here, just log it
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      await fetchElections();
      await fetchPendingApprovals();
    };
    loadData();
  }, [fetchElections, fetchPendingApprovals]);

  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredElections(elections);
    } else if (activeTab === 'pending') {
      // Use the dedicated pendingApprovals state
      setFilteredElections(pendingApprovals);
    } else {
      // For other tabs, filter by status but exclude those needing approval
      setFilteredElections(
        elections.filter(election => 
          election.status === activeTab && !election.needs_approval
        )
      );
    }
  }, [activeTab, elections, pendingApprovals]);

  const handleCreateElection = () => {
    router.push("/admin/election/create"); 
  };

  const handleElectionClick = (electionId) => {
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Elections</h1>
        <button 
          onClick={handleCreateElection} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Election
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex flex-wrap">
          {tabs.map(tab => (
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
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
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
             
            </div>
          )}
        </>
      )}
    </div>
  );
}
