"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, CheckCircle, Users, CalendarRange, BarChart } from 'lucide-react';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }
  
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

const statusTabs = [
  { id: 'ongoing', name: 'Ongoing Elections', icon: <Clock className="w-4 h-4" /> },
  { id: 'upcoming', name: 'Upcoming Elections', icon: <Calendar className="w-4 h-4" /> },
  { id: 'completed', name: 'Completed Elections', icon: <CheckCircle className="w-4 h-4" /> },
];

const ElectionCard = ({ election, onClick }) => {
  const statusColors = {
    ongoing: 'bg-blue-100 text-blue-800',
    upcoming: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800'
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
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
      <div onClick={() => onClick(election.id)} className="flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            election.status === 'ongoing' ? 'bg-blue-100 text-blue-800' : 
            election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {election.status.toUpperCase()}
          </div>
          
          {election.has_voted && (
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              Voted
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-semibold mb-1 text-black">
          {election.title}
        </h3>
        
        <p className="text-gray-500 text-sm mb-2 text-black">
          {election.description && election.description.length > 100
            ? `${election.description.substring(0, 100)}...`
            : election.description || 'No description provided'}
        </p>
        
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <CalendarRange className="w-3 h-3 mr-1 text-black" />
          <span className="text-black">
            {parseElectionDate(election.date_from, election.start_time)}
            {' - '}
            {parseElectionDate(election.date_to, election.end_time)}
          </span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1 text-black" />
          <span className="text-black">{Number(election.voter_count || 0).toLocaleString()} voters</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-4 h-4 mr-1 text-black" />
          <span className="text-black">{election.vote_count || 0} votes</span>
        </div>
        
        {election.ballot_exists === false && (
          <div className="col-span-2">
            <span className="text-amber-600">Ballot not yet available</span>
          </div>
        )}
        
        {election.has_voted && election.status === 'ongoing' && (
          <div className="col-span-2 mt-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick(election.id);
              }}
              className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              View Receipt
            </button>
          </div>
        )}
        
        {election.status === 'completed' && (
          <div className="col-span-2 mt-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick(election.id);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              <BarChart className="w-4 h-4 mr-2" />
              View Results
            </button>
          </div>
        )}
        
        {election.status === 'ongoing' && !election.has_voted && election.ballot_exists && (
          <div className="col-span-2 mt-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick(election.id);
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              Vote Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ElectionsPage() {
  const [elections, setElections] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ongoing');
  const router = useRouter();

  useEffect(() => {
    const loadElections = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth('/students/elections');
        
        if (!Array.isArray(data)) {
          throw new Error("Invalid response format from server");
        }
        
        setElections(data);
        const filtered = data.filter(election => election.status === activeTab);
        setFilteredElections(filtered);
      } catch (err) {
        console.error("Failed to fetch elections:", err);
        setError(err.message || "Failed to load elections");
      } finally {
        setLoading(false);
      }
    };
    
    loadElections();
  }, []);

  useEffect(() => {
    const filtered = elections.filter(election => election.status === activeTab);
    setFilteredElections(filtered);
  }, [activeTab, elections]);

  const handleViewElection = (electionId) => {
    const election = elections.find(e => e.id === electionId);
    
    if (!election) return;

    if (election.status === 'completed') {
      router.push(`/student/elections/${electionId}/results`);
    } else if (election.has_voted) {
      router.push(`/student/elections/${electionId}/receipt`);
    } else if (election.status === 'ongoing' && election.ballot_exists) {
      router.push(`/student/elections/${electionId}/vote`);
    } else if (election.status === 'ongoing' && !election.ballot_exists) {
      alert('Ballot is not yet available for this election.');
    } else if (election.status === 'upcoming') {
      alert('This election has not started yet. Please wait for the start date.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Elections</h1>
        <p className="text-black text-lg">View and participate in available elections</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex border-b mb-6">
        {statusTabs.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center px-4 py-2 font-medium text-sm ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-black hover:text-blue-600'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="ml-2">{tab.name}</span>
            <span className="ml-2 bg-gray-100 rounded-full px-2 py-1 text-xs text-black">
              {elections.filter(e => e.status === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredElections.length > 0 ? (
            filteredElections.map(election => (
              <ElectionCard 
                key={election.id} 
                election={election} 
                onClick={handleViewElection}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-400 mb-2">
                {activeTab === 'ongoing' && <Clock className="w-12 h-12 mx-auto" />}
                {activeTab === 'upcoming' && <Calendar className="w-12 h-12 mx-auto" />}
                {activeTab === 'completed' && <CheckCircle className="w-12 h-12 mx-auto" />}
              </div>
              <h3 className="text-lg font-medium text-black">
                No {activeTab} elections found
              </h3>
              <p className="text-black mt-1">
                {activeTab === 'ongoing' && 'There are currently no ongoing elections available'}
                {activeTab === 'upcoming' && 'No upcoming elections scheduled'}
                {activeTab === 'completed' && 'No completed elections to display'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 