"use client"
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle, Users, Vote } from 'lucide-react';

const ElectionCarousel = ({ 
  landingContent, 
  updateCTA, 
  saveSectionContent, 
  showPreview,
  elections = []
}) => {
  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('ongoing');
  const [isPlaying, setIsPlaying] = useState(true);

  // Filter elections by status
  const getElectionsByStatus = (status) => {
    return elections.filter(election => election.status === status);
  };

  const statusConfig = {
    ongoing: {
      title: 'Ongoing Elections',
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-800',
      elections: getElectionsByStatus('ongoing')
    },
    upcoming: {
      title: 'Upcoming Elections',
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-yellow-100 text-yellow-800',
      elections: getElectionsByStatus('upcoming')
    },
    completed: {
      title: 'Completed Elections',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-green-100 text-green-800',
      elections: getElectionsByStatus('completed')
    }
  };

  // Auto-rotate through statuses every 10 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const currentIndex = statuses.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statuses.length;
      const nextStatus = statuses[nextIndex];
      
      setCurrentStatus(nextStatus);
      setCurrentElectionIndex(0);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentStatus, isPlaying]);

  // Auto-rotate through elections within current status every 5 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const currentElections = statusConfig[currentStatus].elections;
    if (currentElections.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentElectionIndex(prev => 
        (prev + 1) % currentElections.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStatus, isPlaying]);

  const currentElections = statusConfig[currentStatus].elections;
  const currentElection = currentElections[currentElectionIndex];

  const nextElection = () => {
    if (currentElections.length <= 1) return;
    setCurrentElectionIndex(prev => 
      (prev + 1) % currentElections.length
    );
  };

  const prevElection = () => {
    if (currentElections.length <= 1) return;
    setCurrentElectionIndex(prev => 
      prev === 0 ? currentElections.length - 1 : prev - 1
    );
  };

  const nextStatus = () => {
    const statuses = ['ongoing', 'upcoming', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setCurrentStatus(statuses[nextIndex]);
    setCurrentElectionIndex(0);
  };

  const prevStatus = () => {
    const statuses = ['ongoing', 'upcoming', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    const prevIndex = currentIndex === 0 ? statuses.length - 1 : currentIndex - 1;
    setCurrentStatus(statuses[prevIndex]);
    setCurrentElectionIndex(0);
  };

  const formatDate = (dateStr, timeStr) => {
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-medium text-black">Election Carousel Section</h2>
        <button
          onClick={() => saveSectionContent('callToAction')}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Update Election Carousel
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Title
          </label>
          <input 
            type="text" 
            value={landingContent.callToAction.title || "Current Elections"}
            onChange={(e) => updateCTA('title', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
            placeholder="Enter section title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Subtitle
          </label>
          <textarea 
            value={landingContent.callToAction.subtitle || "Stay updated with our latest elections"}
            onChange={(e) => updateCTA('subtitle', e.target.value)}
            rows="2"
            className="w-full px-3 py-2 border rounded-md text-black"
            placeholder="Enter section subtitle"
          />
        </div>

        {/* Color pickers for carousel section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Background Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Text Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="cta-enabled"
            checked={landingContent.callToAction.enabled}
            onChange={(e) => updateCTA('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="cta-enabled" className="ml-2 text-sm text-black">
            Display this section
          </label>
        </div>

        {/* Carousel Controls */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-black mb-3">Carousel Controls</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1 text-xs rounded ${
                isPlaying 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-xs text-gray-600">
              Auto-rotates every 10 seconds
            </span>
          </div>
        </div>
        
        {/* Carousel Preview */}
        {showPreview && (
          <div className="border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium text-black">Preview</span>
              <span className="text-xs text-blue-600">Pending save</span>
            </div>
            <div className="p-4">
              {landingContent.callToAction.enabled ? (
                <div className="relative">
                  <div 
                    className="p-6 rounded-lg text-center shadow-sm relative overflow-hidden"
                    style={{
                      backgroundColor: landingContent.callToAction.bgColor || '#1e3a8a',
                      color: landingContent.callToAction.textColor || '#ffffff'
                    }}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-2" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.title || "Current Elections"}
                      </h3>
                      <p className="text-sm" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.subtitle || "Stay updated with our latest elections"}
                      </p>
                    </div>

                    {/* Status Tabs */}
                    <div className="flex justify-center mb-6">
                      <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
                        {Object.entries(statusConfig).map(([status, config]) => (
                          <button
                            key={status}
                            onClick={() => {
                              setCurrentStatus(status);
                              setCurrentElectionIndex(0);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              currentStatus === status
                                ? 'bg-white text-gray-900'
                                : 'text-white hover:bg-white hover:bg-opacity-10'
                            }`}
                          >
                            <div className="flex items-center">
                              {config.icon}
                              <span className="ml-2">{config.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Election Display */}
                    {currentElection ? (
                      <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            {statusConfig[currentStatus].icon}
                            <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[currentStatus].color}`}>
                              {statusConfig[currentStatus].title}
                            </span>
                          </div>
                          <div className="text-sm text-white text-opacity-80">
                            {currentElectionIndex + 1} of {currentElections.length}
                          </div>
                        </div>

                        <h4 className="text-xl font-bold mb-2 text-white">
                          {currentElection.title}
                        </h4>
                        <p className="text-sm text-white text-opacity-90 mb-4 line-clamp-2">
                          {currentElection.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center text-sm">
                            <Users className="w-4 h-4 mr-2 text-white" />
                            <span className="text-white">
                              {Number(currentElection.voter_count || 0).toLocaleString()} Voters
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Vote className="w-4 h-4 mr-2 text-white" />
                            <span className="text-white">
                              {Number(currentElection.vote_count || 0).toLocaleString()} Votes
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-white text-opacity-80">
                          <div>Starts: {formatDate(currentElection.date_from, currentElection.start_time)}</div>
                          <div>Ends: {formatDate(currentElection.date_to, currentElection.end_time)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white bg-opacity-10 rounded-lg p-6 text-center">
                        <p className="text-white text-opacity-80">
                          No {currentStatus} elections available
                        </p>
                      </div>
                    )}

                    {/* Navigation Controls */}
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={prevStatus}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                        title="Previous status"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={prevElection}
                        disabled={currentElections.length <= 1}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous election"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={nextElection}
                        disabled={currentElections.length <= 1}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next election"
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={nextStatus}
                        className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
                        title="Next status"
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg border-2 border-dashed">
                  <p className="text-black text-sm">Section disabled</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionCarousel;
