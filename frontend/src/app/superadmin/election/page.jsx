"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus, ArrowLeft } from 'lucide-react';
import Cookies from 'js-cookie';
import Link from 'next/link';


const API_BASE = '/api'; // Use relative path for proxy

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
  to_approve: 'bg-purple-100 text-black border-purple-300'
};

const statusIcons = {
  ongoing: <Clock className="w-5 h-5" />,
  upcoming: <Calendar className="w-5 h-5" />,
  completed: <CheckCircle className="w-5 h-5" />,
  to_approve: <AlertCircle className="w-5 h-5" />
};

export default function ElectionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [elections, setElections] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tabs, setTabs] = useState([
    { id: 'all', label: 'All Elections' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'to_approve', label: 'To Approve' }
  ]);

  const fetchElections = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const data = await fetchWithAuth('/elections');
      const pendingCount = data.filter(election => election.needs_approval).length;

      const updatedTabs = tabs.map(tab => 
        tab.id === 'to_approve' 
          ? { ...tab, label: `To Approve (${pendingCount})` }
          : tab
      );
      setTabs(updatedTabs);
      
      setElections(data || []);
      
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    } catch (err) {
      console.error("Failed to load elections:", err);
      setError("Failed to load elections. Please try again later.");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchElections(true);
  }, [fetchElections]);

  useEffect(() => {

    const hasOngoingElections = elections.some(election => election.status === 'ongoing');
    
    if (!hasOngoingElections) return;

    const intervalId = setInterval(() => {
      fetchElections(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [elections, fetchElections]);

  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredElections(elections);
    } else {
      setFilteredElections(
        elections.filter(election => 
          (activeTab === 'to_approve' ? election.needs_approval : election.status === activeTab)
        )
      );
    }
  }, [activeTab, elections]);

  const handleCreateElection = () => {
    router.push("/superadmin/election/create"); 
  };

  const handleElectionClick = (electionId) => {
    router.push(`/superadmin/election/${electionId}`);
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
    // Determine if the creator is a superadmin
    const isSuperAdminCreator =
      election.created_by === 1 ||
      (election.created_by && election.created_by.id === 1) ||
      election.created_by_role === 'SuperAdmin';

    // Only show 'NEEDS APPROVAL' if not created by super admin
    const status = (election.needs_approval && !isSuperAdminCreator) ? 'to_approve' : election.status;
    
    return (
      <div className={`flex items-center px-3 py-1 rounded-full ${statusColors[status]}`}>
        {statusIcons[status]}
        <span className="ml-2 text-xs font-medium">
          {(election.needs_approval && !isSuperAdminCreator) ? 'NEEDS APPROVAL' : election.status.toUpperCase()}
        </span>
      </div>
    );
  };

  const manualRefresh = () => {
    fetchElections(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center mb-6">
        <Link href="/superadmin" className="flex items-center text-black hover:text-black mr-4">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span>Back</span>
        </Link>
        <h1 className="text-3xl font-bold text-black">Elections</h1>
        
      </div>

      <div className="mb-6 flex justify-end">
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
              className={`px-6 py-3 text-sm font-medium focus:outline-none transition-colors ${
                activeTab === tab.id 
                  ? 'text-black border-b-2 border-blue-600' 
                  : 'text-black hover:text-black hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
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
                    {activeTab === 'to_approve' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                        Created By
                      </th>
                    )}
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
                      {activeTab === 'to_approve' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {election.created_by ? (
                            <div>
                              <div className="font-medium">{election.created_by.name || 'Unknown Admin'}</div>
                              <div className="text-xs text-gray-500">{election.created_by.department || 'No Department'}</div>
                            </div>
                          ) : (
                            <div className="text-gray-500">Unknown</div>
                          )}
                        </td>
                      )}
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
                {activeTab === 'to_approve' && <AlertCircle className="w-16 h-16 mx-auto" />}
                {activeTab === 'all' && <div className="w-16 h-16 mx-auto" />}
              </div>
              <h3 className="text-xl font-medium text-black mb-2">
                No {activeTab === 'all' ? '' : activeTab} elections found
              </h3>
              <p className="text-black max-w-md mx-auto">
                Create a new election to get started.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
