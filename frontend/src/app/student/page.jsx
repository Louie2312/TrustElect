"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, CalendarRange, BarChart, Award } from 'lucide-react';
import Cookies from 'js-cookie';

// Replace this line:
// const API_BASE = 'http://localhost:5000/api';

// With this:
const API_BASE = '/api'; // Use relative path for proxy

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  const studentId = Cookies.get('studentId');
  
  console.log("Using token for fetch:", token ? 'Present' : 'Missing');
  console.log("Using studentId for fetch:", studentId ? 'Present' : 'Missing');
  
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
    
    // Check if the response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // If not JSON, try to get the text content for error details
      const textContent = await response.text();
      console.error("Non-JSON response:", textContent);
      throw new Error('Invalid response format from server');
    }
    
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

export default function StudentDashboard() {
  const [allElections, setAllElections] = useState([]);
  const [filteredElections, setFilteredElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ongoing');
  const [uiConfig, setUiConfig] = useState(null);
  const [landingContent, setLandingContent] = useState(null);
  const router = useRouter();

  // Fetch UI configuration and landing content if needed
  useEffect(() => {
    const fetchUIConfig = async () => {
      try {
        console.log('Fetching UI config...');
        const response = await fetchWithAuth('/studentUI');
        console.log('Raw UI Config response:', response);
        
        if (response && response.content) {
          console.log('Setting UI config:', response.content);
          console.log('UI config type:', response.content.type);
          console.log('UI config use_landing_design:', response.content.use_landing_design);
          
          // Always fix inconsistencies client-side
          const updatedConfig = {
            ...response.content,
            // If type is landing, force use_landing_design to true
            use_landing_design: response.content.type === 'landing' ? true : response.content.use_landing_design
          };
          
          console.log('Final UI config with fixes:', updatedConfig);
          setUiConfig(updatedConfig);
          
          // Check if we should use landing design
          const shouldUseLandingDesign = updatedConfig.type === 'landing' || updatedConfig.use_landing_design === true;
          
          if (shouldUseLandingDesign) {
            console.log('Landing design is enabled, fetching landing content...');
            try {
              console.log('Fetching landing content...');
              const landingResponse = await fetch(`${API_BASE}/content`);
              if (!landingResponse.ok) {
                throw new Error('Failed to fetch landing content');
              }
              const landingData = await landingResponse.json();
              console.log('Raw landing content response:', landingData);
              
              if (landingData && landingData.content) {
                console.log('Setting landing content:', landingData.content);
                setLandingContent(landingData.content);
              } else {
                // If content is directly in the response
                console.log('Setting direct landing content:', landingData);
                setLandingContent(landingData);
              }
            } catch (err) {
              console.error('Error fetching landing content:', err);
            }
          } else {
            console.log('Landing design is disabled, not fetching landing content');
            // Clear landing content if landing design is disabled
            if (landingContent) {
              console.log('Clearing existing landing content');
              setLandingContent(null);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching UI config:', err);
      }
    };

    // Initial fetch
    fetchUIConfig();
    
    // Set up polling every 5 seconds to check for changes
    const interval = setInterval(fetchUIConfig, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Fetch all elections
  useEffect(() => {
    const loadElections = async () => {
      try {
        setLoading(true);
        // Fetch elections that the student is eligible for
        console.log("Fetching all elections");
        const data = await fetchWithAuth('/students/elections');
        
        console.log("Elections data received:", data);
        
        if (!Array.isArray(data)) {
          console.error("Data is not an array:", data);
          setError("Invalid response format from server");
          setAllElections([]);
          setFilteredElements([]);
          return;
        }
        
        setAllElections(data);
        
        // Filter elections based on the active tab
        const filtered = data.filter(election => election.status === activeTab);
        console.log("Filtered elections:", filtered);
        
        setFilteredElements(filtered);
      } catch (err) {
        console.error("Failed to fetch elections:", err);
        setError(err.message || "Failed to load elections. Please try again later.");
        setAllElections([]);
        setFilteredElements([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadElections();
  }, []);

  // Update filtered elections when active tab changes
  useEffect(() => {
    const filtered = allElections.filter(election => election.status === activeTab);
    setFilteredElements(filtered);
  }, [activeTab, allElections]);

  const handleViewElection = async (electionId) => {
    try {
      const election = allElections.find(e => e.id === electionId);
      
      if (!election) {
        throw new Error('Election not found');
      }
      
      // If election is completed, redirect to results page
      if (election.status === 'completed') {
        router.push(`/student/elections/${electionId}/results`);
        return;
      }
      
      // If student has already voted, show receipt
      if (election.has_voted) {
        router.push(`/student/elections/${electionId}/receipt`);
        return;
      }
  
      // For ongoing elections
      if (election.status === 'ongoing') {
        // If ballot exists, proceed to voting
        if (election.ballot_exists) {
          router.push(`/student/elections/${electionId}/vote`);
          return;
        }

          alert('Ballot is not yet available for this election.');
        return;
      }

      if (election.status === 'upcoming') {
        alert('This election has not started yet. Please wait for the start date.');
        return;
      }

    } catch (error) {
      console.error("View election error:", error);
      alert(error.message || 'An error occurred while processing your request');
    }
  };

  const getStatusCount = (status) => {
    return allElections.filter(election => election.status === status).length;
  };

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

  const getBackgroundStyle = () => {
    if (!uiConfig) {
      return {};
    }

    console.log('Getting background style with UI config:', uiConfig);
    console.log('Landing content available:', !!landingContent);

    // For safety, always check both type and use_landing_design flag
    // We prioritize type='landing' even if use_landing_design is false
    const useLandingDesign = uiConfig.type === 'landing' || uiConfig.use_landing_design === true;
    
    console.log(`Using landing design: ${useLandingDesign}, Type: ${uiConfig.type}, Flag: ${uiConfig.use_landing_design}`);
    
    // Using a single style approach for both designs
    if (uiConfig.background_image && !useLandingDesign) {
      console.log('Using background image:', uiConfig.background_image);
      const imageUrl = formatImageUrl(uiConfig.background_image);
      
      if (!imageUrl) {
        console.error('Failed to format background image URL:', uiConfig.background_image);
        return {
          backgroundColor: '#f0f2f5'
        };
      }
      
      return {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'
      };
    }

    console.log('Using default background style');
    return {
      backgroundColor: '#f0f2f5'
    };
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

        {/* Features Section */}
        {landingContent.features?.columns && landingContent.features.columns.length > 0 && (
          <section className="py-12 px-6 bg-gray-50">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
                Key Features
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {landingContent.features.columns.map((feature, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg shadow-md"
                    style={{
                      backgroundColor: feature.bgColor || '#ffffff',
                      color: feature.textColor || '#000000'
                    }}
                  >
                    {feature.imageUrl && (
                      <div className="mb-4 h-32 overflow-hidden rounded-lg">
                        <img
                          src={formatImageUrl(feature.imageUrl)}
                          alt={feature.title || `Feature ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 
                      className="text-lg font-semibold mb-2"
                      style={{ color: feature.textColor || '#000000' }}
                    >
                      {feature.title}
                    </h3>
                    <p style={{ color: feature.textColor || '#000000' }}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Call to Action Section if enabled */}
        {landingContent.callToAction?.enabled && (
          <section 
            className="py-12 px-6"
            style={{
              backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
              color: landingContent.callToAction?.textColor || '#ffffff'
            }}
          >
            <div className="container mx-auto max-w-6xl text-center">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.title || 'Ready to Vote?'}
              </h2>
              <p 
                className="text-xl mb-8"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.subtitle || 'Start your experience with TrustElect'}
              </p>
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen relative"
      style={getBackgroundStyle()}
    >
      {/* Apply landing page design as background first if enabled */}
      {(uiConfig?.type === 'landing' || uiConfig?.use_landing_design === true) && landingContent && (
        <div className="absolute inset-0 z-0 overflow-auto">
          <LandingPageLayout />
        </div>
      )}
      
      {/* Main content container - always on top */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 bg-white/90 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-black mb-2">Elections Dashboard</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Status Tabs */}
        <div className="flex border-b mb-6 bg-white/90 rounded-t-lg">
          {statusTabs.map(tab => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-2 font-medium text-sm ${
                activeTab === tab.id 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span className="ml-2">{tab.name}</span>
              <span className="ml-2 bg-gray-100 rounded-full px-2 py-1 text-xs">
                {getStatusCount(tab.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Elections Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white/90 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredElections.length > 0 ? (
              filteredElections.map(election => (
                <ElectionCard 
                  key={election.id} 
                  election={election} 
                  onClick={handleViewElection}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 bg-white/90 rounded-lg">
                <div className="text-gray-400 mb-2">
                  {activeTab === 'ongoing' && <Clock className="w-12 h-12 mx-auto" />}
                  {activeTab === 'upcoming' && <Calendar className="w-12 h-12 mx-auto" />}
                  {activeTab === 'completed' && <CheckCircle className="w-12 h-12 mx-auto" />}
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  No {activeTab} elections found
                </h3>
                <p className="text-gray-500 mt-1">
                  {activeTab === 'ongoing' && 'There are currently no ongoing elections available to you'}
                  {activeTab === 'upcoming' && 'No upcoming elections scheduled for you'}
                  {activeTab === 'completed' && 'You have not participated in any completed elections yet'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}