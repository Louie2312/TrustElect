"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, X, BarChart3, Users, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { generatePdfReport } from '@/utils/pdfGenerator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '/images/default-avatar.png';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('blob:')) return imageUrl;
  
  // Handle different image path formats
  let cleanImageUrl = imageUrl;
  
  // Remove leading slashes
  if (cleanImageUrl.startsWith('/')) {
    cleanImageUrl = cleanImageUrl.substring(1);
  }
  
  // If it already starts with uploads, use it directly
  if (cleanImageUrl.startsWith('uploads/')) {
    return `${API_BASE}/${cleanImageUrl}`;
  }
  
  // If it's just a filename, assume it's in candidates folder
  if (!cleanImageUrl.includes('/')) {
    return `${API_BASE}/uploads/candidates/${cleanImageUrl}`;
  }
  
  // Default case - try candidates folder first
  return `${API_BASE}/uploads/candidates/${cleanImageUrl}`;
};

// Helper function to format numbers
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat().format(num);
};

export default function CandidateListReport() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { token } = useAuth();

  // Get current election data
  const currentElection = reportData?.elections.find(e => e.id === selectedElection);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!currentElection?.positions || currentElection.positions.length === 0) {
      return {
        barChartData: [],
        totalStats: { totalCandidates: 0, totalVotes: 0, averageVotes: 0 }
      };
    }

    // Calculate statistics for each position
    const positionStats = currentElection.positions.map(position => {
      const totalVotes = position.candidates.reduce((sum, candidate) => sum + (candidate.vote_count || 0), 0);
      const candidateCount = position.candidates.length;
      const averageVotes = candidateCount > 0 ? totalVotes / candidateCount : 0;
      
      return {
        position: position.position,
        candidateCount,
        totalVotes,
        averageVotes: parseFloat(averageVotes.toFixed(1)),
        maxVotes: Math.max(...position.candidates.map(c => c.vote_count || 0), 0)
      };
    });

    // Sort by total votes (for bar chart length)
    const sortedStats = positionStats.sort((a, b) => b.totalVotes - a.totalVotes);

    // Calculate overall statistics
    const totalCandidates = positionStats.reduce((sum, pos) => sum + pos.candidateCount, 0);
    const totalVotes = positionStats.reduce((sum, pos) => sum + pos.totalVotes, 0);
    const averageVotes = totalCandidates > 0 ? totalVotes / totalCandidates : 0;

    return {
      barChartData: sortedStats,
      totalStats: {
        totalCandidates,
        totalVotes,
        averageVotes: parseFloat(averageVotes.toFixed(1))
      }
    };
  }, [currentElection]);

  useEffect(() => {
    fetchCandidateList();
  }, []);

  const fetchCandidateList = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reports/candidate-list/admin/candidate-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setReportData(response.data.data);
        if (response.data.data.elections.length > 0) {
          setSelectedElection(response.data.data.elections[0].id);
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch candidate list data');
      }
      setError(null);
    } catch (error) {
      console.error('Error fetching candidate list data:', error);
      setError('Failed to fetch candidate list data');
    } finally {
      setLoading(false);
    }
  };

  const handleElectionChange = (electionId) => {
    setSelectedElection(Number(electionId));
  };

  const handleDownload = async () => {
    if (!selectedElection) return;

    try {
      const currentElection = reportData?.elections.find(e => e.id === parseInt(selectedElection));
      if (!currentElection) {
        console.error('Selected election not found');
        return;
      }

      // Get filtered positions based on search term
      const filteredPositions = currentElection.positions.map(position => {
        const filteredCandidates = position.candidates.filter(candidate =>
          !searchTerm ||
          candidate.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.party?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          position: position.position,
          candidates: filteredCandidates
        };
      }).filter(position => position.candidates.length > 0);

      const downloadData = {
        title: "Candidate List Report",
        description: "Comprehensive list of all candidates per election with their course and party affiliations",
        election_details: {
          title: currentElection.title,
          type: currentElection.type || 'Regular Election',
          status: currentElection.status,
          start_date: formatDateTime(currentElection.date_from, currentElection.start_time),
          end_date: formatDateTime(currentElection.date_to, currentElection.end_time)
        },
        positions: filteredPositions.map(position => ({
          position_name: position.position,
          candidates: position.candidates.map(candidate => ({
            name: `${candidate.first_name} ${candidate.last_name}`,
            course: candidate.course || 'N/A',
            party: candidate.party || 'Independent',
            slogan: candidate.slogan || 'N/A',
            platform: candidate.platform || 'N/A',
            vote_count: candidate.vote_count || 0
          }))
        }))
      };

      console.log('Download data:', downloadData); // Debug log
      await generatePdfReport(9, downloadData); // 9 is the report ID for Candidate List
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const filteredPositions = currentElection?.positions.map(position => ({
    ...position,
    candidates: position.candidates.filter(candidate =>
      candidate.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.party?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(position => position.candidates.length > 0);

  const formatDateTime = (date, time) => {
    try {
      const dateObj = new Date(date);
      const [hours, minutes] = time.split(':');
      dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#01579B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-gray-500 text-center p-4">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#01579B]">Candidate List Report</h2>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <select
            value={selectedElection || ''}
            onChange={(e) => handleElectionChange(e.target.value)}
            className="border rounded-md px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01579B]"
          >
            {reportData?.elections.map(election => (
              <option key={election.id} value={election.id}>
                {election.title} ({election.status})
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#01579B]"
            />
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-[#01579B] text-white px-4 py-2 rounded-md hover:bg-[#01416E] transition-colors duration-200"
        >
          <Download size={20} />
          Download Report
        </button>
      </div>

      {currentElection && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-[#01579B] text-lg mb-4">Election Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 font-medium">Election Name:</p>
                <p className="text-gray-900">{currentElection.title}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Election Type:</p>
                <p className="text-gray-900 capitalize">{currentElection.type || 'Regular Election'}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Status:</p>
                <p className="text-gray-900 capitalize">{currentElection.status}</p>
              </div>
              <div>
                <p className="text-gray-600 font-medium">Duration:</p>
                <p className="text-gray-900">
                  Start: {formatDateTime(currentElection.date_from, currentElection.start_time)} <br />
                  End: {formatDateTime(currentElection.date_to, currentElection.end_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-black">Total Candidates</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(chartData?.totalStats?.totalCandidates || 0)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-black">Total Votes</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {formatNumber(chartData?.totalStats?.totalVotes || 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-medium text-black">Average Votes</h3>
              </div>
              <p className="text-2xl font-bold text-black">
                {(chartData?.totalStats?.averageVotes || 0).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Bar Chart Section */}
          {chartData?.barChartData && chartData.barChartData.length > 0 && (
            <div className="bg-white/50 backdrop-blur-sm rounded-lg shadow border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-black flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-[#01579B]" />
                Candidates per Position
              </h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.barChartData} 
                    margin={{ left: 20, right: 20, bottom: 80, top: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="position" 
                      stroke="#000" 
                      tick={{ fill: '#000' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      fontSize={11}
                    />
                    <YAxis 
                      stroke="#000" 
                      tick={{ fill: '#000' }}
                      tickFormatter={(value) => formatNumber(value)}
                      fontSize={12}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-black">{label}</p>
                              <p className="text-sm text-black">
                                <span className="text-blue-600">Candidates: </span>
                                {formatNumber(data.candidateCount)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-green-600">Total Votes: </span>
                                {formatNumber(data.totalVotes)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-purple-600">Average Votes: </span>
                                {data.averageVotes.toFixed(1)}
                              </p>
                              <p className="text-sm text-black">
                                <span className="text-orange-600">Max Votes: </span>
                                {formatNumber(data.maxVotes)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="candidateCount" 
                      name="Candidates" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="totalVotes" 
                      name="Total Votes" 
                      fill="#16A34A" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {filteredPositions?.map((position) => (
            <div key={position.position} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 p-4 border-b">
                <h3 className="font-semibold text-[#01579B]">{position.position}</h3>
              </div>
              <div className="divide-y">
                {position.candidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 flex items-center gap-4">
                    <img
                      src={getImageUrl(candidate.image_url)}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      className="w-16 h-16 object-cover rounded-md"
                      onError={(e) => {
                        // Try alternative image paths
                        const currentSrc = e.target.src;
                        if (currentSrc.includes('/uploads/candidates/')) {
                          // Try without the candidates folder
                          e.target.src = currentSrc.replace('/uploads/candidates/', '/uploads/');
                        } else if (currentSrc.includes('/api/uploads/')) {
                          // Try direct path
                          e.target.src = currentSrc.replace('/api/uploads/', '/uploads/');
                        } else {
                          // Fallback to default avatar
                          e.target.src = '/images/default-avatar.png';
                        }
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {candidate.first_name} {candidate.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">Course: {candidate.course || 'Not specified'}</p>
                      <p className="text-sm text-gray-600">
                        Party: {candidate.party || 'Independent'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{candidate.vote_count || 0} votes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!filteredPositions || filteredPositions.length === 0) && (
            <div className="text-center text-gray-500 py-8">
              No candidates found matching your search criteria
            </div>
          )}
        </div>
      )}
    </div>
  );
} 