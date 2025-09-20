"use client"
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle, Users, Vote } from 'lucide-react';

const LandingElectionCarousel = ({ 
  title = "Current Elections",
  subtitle = "Stay updated with our latest elections",
  bgColor = "#1e3a8a",
  textColor = "#ffffff",
  enabled = true,
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
    if (!isPlaying || !enabled) return;

    const interval = setInterval(() => {
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const currentIndex = statuses.indexOf(currentStatus);
      const nextIndex = (currentIndex + 1) % statuses.length;
      const nextStatus = statuses[nextIndex];
      
      setCurrentStatus(nextStatus);
      setCurrentElectionIndex(0);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentStatus, isPlaying, enabled]);

  // Auto-rotate through elections within current status every 5 seconds
  useEffect(() => {
    if (!isPlaying || !enabled) return;

    const currentElections = statusConfig[currentStatus].elections;
    if (currentElections.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentElectionIndex(prev => 
        (prev + 1) % currentElections.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStatus, isPlaying, enabled]);

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

  if (!enabled) return null;

  return (
    <section 
      className="py-16 px-6"
      style={{
        backgroundColor: bgColor,
        color: textColor
      }}
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 
            className="text-4xl font-bold mb-4"
            style={{ color: textColor }}
          >
            {title}
          </h2>
          <p 
            className="text-xl"
            style={{ color: textColor }}
          >
            {subtitle}
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white bg-opacity-20 rounded-lg p-1">
            {Object.entries(statusConfig).map(([status, config]) => (
              <button
                key={status}
                onClick={() => {
                  setCurrentStatus(status);
                  setCurrentElectionIndex(0);
                }}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
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
          <div className="bg-white bg-opacity-10 rounded-xl p-8 mb-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                {statusConfig[currentStatus].icon}
                <span className={`ml-3 px-4 py-2 rounded-full text-sm font-medium ${statusConfig[currentStatus].color}`}>
                  {statusConfig[currentStatus].title}
                </span>
              </div>
              <div className="text-sm text-white text-opacity-80">
                {currentElectionIndex + 1} of {currentElections.length}
              </div>
            </div>

            <h3 className="text-3xl font-bold mb-4 text-white">
              {currentElection.title}
            </h3>
            <p className="text-lg text-white text-opacity-90 mb-6 line-clamp-3">
              {currentElection.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center text-lg">
                <Users className="w-6 h-6 mr-3 text-white" />
                <div>
                  <div className="text-sm text-white text-opacity-80">Total Voters</div>
                  <div className="text-xl font-bold text-white">
                    {Number(currentElection.voter_count || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-lg">
                <Vote className="w-6 h-6 mr-3 text-white" />
                <div>
                  <div className="text-sm text-white text-opacity-80">Votes Cast</div>
                  <div className="text-xl font-bold text-white">
                    {Number(currentElection.vote_count || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-lg">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${
                    currentElection.ballot_exists ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                </div>
                <div>
                  <div className="text-sm text-white text-opacity-80">Status</div>
                  <div className="text-xl font-bold text-white">
                    {currentElection.ballot_exists ? 'Ready' : 'Not Ready'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white text-opacity-80">
              <div>
                <div className="font-medium mb-1">Election Period</div>
                <div>Starts: {formatDate(currentElection.date_from, currentElection.start_time)}</div>
                <div>Ends: {formatDate(currentElection.date_to, currentElection.end_time)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">Participation Rate</div>
                <div className="text-lg font-bold text-white">
                  {currentElection.voter_count > 0 
                    ? Math.round((currentElection.vote_count / currentElection.voter_count) * 100)
                    : 0
                  }%
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white bg-opacity-10 rounded-xl p-8 text-center backdrop-blur-sm">
            <div className="text-6xl mb-4 text-white text-opacity-50">
              {statusConfig[currentStatus].icon}
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              No {currentStatus} elections available
            </h3>
            <p className="text-white text-opacity-80">
              Check back later for new election updates
            </p>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={prevStatus}
            className="p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
            title="Previous status"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={prevElection}
            disabled={currentElections.length <= 1}
            className="p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous election"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-6 py-3 rounded-full font-medium transition-colors ${
              isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={nextElection}
            disabled={currentElections.length <= 1}
            className="p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next election"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={nextStatus}
            className="p-3 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
            title="Next status"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingElectionCarousel;
